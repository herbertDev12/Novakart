"use client"

import { useFormContext } from "react-hook-form"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/components/ui/form"
import { FC } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/components/ui/select"
import { cn } from "@repo/components/lib/utils"
import { useTranslations } from "next-intl"

interface SelectItem {
  label: string
  value: string
}

interface Props {
  name: string
  placeholder?: string
  label?: string
  items: SelectItem[]
  description?: string
  required?: boolean
  disabled?: boolean
  onChange?: (value: string) => void
}

export const RHFSelect: FC<Props> = ({
  name,
  items,
  placeholder,
  label,
  description,
  required,
  disabled,
  onChange,
}) => {
  const form = useFormContext()
  const t = useTranslations("packages-ui")

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="w-full">
          {label && (
            <FormLabel className={cn(disabled && "text-muted-foreground")}>
              {label} {required && <span>*</span>}
            </FormLabel>
          )}

          <Select
            onValueChange={(val) => {
              field.onChange(val)
              if (onChange) onChange(val)
            }}
            defaultValue={field.value}
          >
            <FormControl className="w-full">
              <SelectTrigger className="w-full" disabled={disabled}>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {items.length > 0 ? (
                items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="__empty__" disabled>
                  {t("noOptions")}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
