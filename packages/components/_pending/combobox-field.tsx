"use client"

import { useMemo, useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Check, ChevronsUpDown, LucideIcon, Search, Star, XCircle } from "lucide-react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import { Label } from "@workspace/ui/components/label"
import { Badge } from "@workspace/ui/components/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { useElementWidth } from "@workspace/ui/hooks/use-element-width"
import { ReactMarkdown, rehypeRaw } from "@workspace/ui/lib/react-markdown"
import { useTranslations } from "next-intl"
import clsx from "clsx"

export interface ComboboxItem {
  label: string
  value: string
}

export type ComboboxField<T> = {
  items: T[]
  label?: string
  placeholder?: string
  noOptionsText?: string
  searchPlaceholder?: string
  description?: string
  startIcon?: LucideIcon | null
  required?: boolean
  disabled?: boolean
  onSearch?: (value: string) => void
  onScrollEnd?: () => void
  loading?: boolean
  maxRenderTags?: number
  portal?: boolean
  type?: "single" | "multiple"
  value: T | T[] | undefined
  onChange: ((value: T | undefined) => void) | ((value: T[]) => void) | undefined
  isSelected?: (item: T) => boolean
  getOptionLabel?: (item: T) => string
  getOptionValue?: (item: T) => string
  isEqual?: (a: T, b: T) => boolean
  triggerClassName?: string
  favoriteable?: boolean
  favorites?: Set<string> | string[]
  onToggleFavorite?: (item: T, next: boolean) => void
  getIsFavorite?: (item: T) => boolean
  onSelectAll?: (currentItems: ComboboxField<T>["value"]) => void | Promise<void>
  defaultSelectAll?: boolean
}

export const ComboboxField = <T,>({
  items,
  label,
  placeholder,
  noOptionsText,
  searchPlaceholder,
  description,
  required,
  startIcon: StartIcon = Search,
  disabled,
  loading,
  portal,
  type = "single",
  value,
  onChange,
  onSearch,
  onScrollEnd,
  isSelected = () => false,
  maxRenderTags = 1,
  getOptionLabel = (item: T) => (item as unknown as ComboboxItem)?.label,
  getOptionValue = (item: T) => (item as unknown as ComboboxItem)?.value,
  isEqual = (a: T, b: T) => getOptionValue(a) === getOptionValue(b),
  triggerClassName,
  favoriteable,
  favorites,
  onToggleFavorite,
  getIsFavorite,
  onSelectAll,
  defaultSelectAll,
}: ComboboxField<T>) => {
  const { ref, width } = useElementWidth()
  const [showDialog, setShowDialog] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [localFavorites, setLocalFavorites] = useState<Record<string, boolean>>({})
  const t = useTranslations("packages-ui")

  const favoritesSet =
    favorites instanceof Set ? favorites : Array.isArray(favorites) ? new Set(favorites) : undefined

  const isItemFavorite = (item: T) => {
    if (!favoriteable) return false
    if (getIsFavorite) return getIsFavorite(item)
    const id = getOptionValue(item)
    if (favoritesSet) return favoritesSet.has(id)
    return !!localFavorites[id]
  }

  const toggleFavorite = (item: T, next?: boolean) => {
    const id = getOptionValue(item)
    const current = isItemFavorite(item)
    const to = typeof next === "boolean" ? next : !current

    if (onToggleFavorite) {
      onToggleFavorite(item, to)
    }

    setLocalFavorites((prev) => {
      const updated = { ...prev }
      if (to) updated[id] = true
      else delete updated[id]
      return updated
    })
  }

  const handleSelectAll = useMemo(() => {
    if (onSelectAll) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      return (_items: ComboboxField<T>["items"]) => onSelectAll(value)
    }
    if (defaultSelectAll) {
      return (items: ComboboxField<T>["items"]) =>
        handleOnChange(onChange, type, value, getOptionValue, items, "add")
    }
    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, onSelectAll, defaultSelectAll])

  const itemsWithStableKeys = useMemo(() => {
    const seen = new Set<string>()
    return items.filter((item) => {
      const key = getOptionValue(item)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [items, getOptionValue])

  const allItemsSelected = useMemo(() => {
    if (type !== "multiple" || !Array.isArray(value) || itemsWithStableKeys.length === 0) {
      return false
    }

    if (value.length === 0) {
      return false
    }

    return itemsWithStableKeys.every((item) => value.some((v) => isEqual(v, item)))
  }, [type, value, itemsWithStableKeys, isEqual])

  const renderBadge = (option: T) => {
    const fav = isItemFavorite(option)

    return (
      <Badge
        key={getOptionValue(option)}
        variant={fav ? "default" : "outline"}
        className="text-sm font-light max-w-[280px] break-words flex items-center"
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {favoriteable && (
          <span
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              toggleFavorite(option)
            }}
            role="button"
            aria-pressed={fav}
            aria-label={fav ? "Quitar favorito" : "Marcar favorito"}
            className="mr-1 p-0 h-4 w-4 flex items-center justify-center hover:cursor-pointer"
          >
            <Star
              className={clsx(
                "h-3 w-3 transition",
                fav ? "opacity-100 fill-current text-yellow-400" : "opacity-40",
              )}
            />
          </span>
        )}

        <span className="truncate overflow-hidden text-ellipsis whitespace-nowrap flex-1">
          {getOptionLabel(option)}
        </span>

        <div
          className="ml-1 h-4 w-4 p-0 hover:cursor-pointer"
          onClick={() => handleOnChange(onChange, type, value, getOptionValue, option, "remove")}
        >
          <XCircle className="h-3 w-3" />
        </div>
      </Badge>
    )
  }

  const renderSelectedDisplay = () => {
    if (Array.isArray(value) && value.length > 0) {
      const hiddenCount = value.length - maxRenderTags

      return (
        <>
          {value.slice(0, maxRenderTags).map((option) => renderBadge(option))}

          {hiddenCount > 0 && (
            <Badge
              variant="outline"
              className="text-sm font-light cursor-pointer"
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setPopoverOpen(false)
                setShowDialog(true)
              }}
            >
              {t("moreItems", { count: hiddenCount })}
            </Badge>
          )}
        </>
      )
    } else if (!Array.isArray(value) && value && getOptionLabel(value)) {
      return getOptionLabel(value)
    }

    return (
      <span className="text-muted-foreground text-sm font-light">
        {placeholder ?? t("selectPlaceholder")}
      </span>
    )
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label className={cn(disabled && "text-muted-foreground")}>
          {label}
          {required && <span>*</span>}
        </Label>
      )}

      <Popover
        open={popoverOpen}
        onOpenChange={(open) => {
          setPopoverOpen(open)
          if (!open) onSearch?.("")
        }}
      >
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            role="combobox"
            aria-haspopup="listbox"
            aria-autocomplete="list"
            className={cn("w-full justify-between", triggerClassName)}
            disabled={disabled}
          >
            <div className="flex items-center gap-2">
              {StartIcon && <StartIcon className="h-4 w-4 text-muted-foreground" />}
              <div className="flex flex-wrap gap-1 max-w-full">{renderSelectedDisplay()}</div>
            </div>
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          style={{ minWidth: width, maxWidth: width ? width + 150 : 0 }}
          className={cn("w-full p-0")}
          aria-busy={loading}
          portal={portal}
        >
          <Command shouldFilter={!onSearch}>
            <CommandInput
              placeholder={searchPlaceholder ?? t("search")}
              className="h-9"
              required={required}
              onValueChange={onSearch}
              loading={loading}
            />

            <CommandList onScrollEnd={onScrollEnd}>
              <CommandEmpty>{noOptionsText ?? t("noOptions")}</CommandEmpty>
              {handleSelectAll && type === "multiple" && itemsWithStableKeys.length > 1 && (
                <CommandGroup>
                  <CommandItem
                    key="__select_all__"
                    onSelect={() => handleSelectAll(itemsWithStableKeys as T[])}
                    value="__select_all__"
                    className="font-medium"
                  >
                    <span>{allItemsSelected ? t("unselectAll") : t("selectAll")}</span>
                  </CommandItem>
                </CommandGroup>
              )}
              <CommandGroup>
                {itemsWithStableKeys.map((item) => {
                  const itemValue = getOptionValue(item)
                  let selected = false
                  if (type === "multiple") {
                    const arr = Array.isArray(value) ? value : []
                    selected = arr?.some((v) => isSelected(v) || isEqual(v, item))
                  } else {
                    selected = isSelected(item) || isEqual(value as T, item)
                  }

                  return (
                    <CommandItem
                      value={itemValue}
                      key={itemValue}
                      onSelect={() =>
                        handleOnChange(
                          onChange,
                          type,
                          value,
                          getOptionValue,
                          item,
                          selected ? "remove" : "add",
                        )
                      }
                    >
                      <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                        {getOptionLabel(item)}
                      </ReactMarkdown>
                      <Check className={cn("ml-auto", selected ? "opacity-100" : "opacity-0")} />
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Dialog de items seleccionados */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-[60vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("selectedItems")}</DialogTitle>
            <DialogDescription />
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            {Array.isArray(value) && value.map((option) => renderBadge(option))}
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="outline" size="sm" onClick={() => setShowDialog(false)}>
              {t("showLess")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {description && <div className="text-sm text-muted-foreground mt-1">{description}</div>}
    </div>
  )
}

const handleOnChange = <T,>(
  onChange: ComboboxField<T>["onChange"],
  type: ComboboxField<T>["type"],
  oldValue: ComboboxField<T>["value"],
  getOptionValue: (item: T) => string,
  newValue: ComboboxField<T>["value"],
  action: "add" | "remove",
) => {
  if (type === "multiple") {
    const nextValue =
      action === "add"
        ? [...(oldValue as T[]), newValue]
        : (oldValue as T[]).filter((v) => getOptionValue(v) !== getOptionValue(newValue as T))
    ;(onChange as (v: T[]) => void)?.(nextValue as T[])
  } else {
    ;(onChange as (v: T | undefined) => void)?.(action === "add" ? (newValue as T) : undefined)
  }
}
