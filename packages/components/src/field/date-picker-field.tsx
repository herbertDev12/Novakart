"use client"

import { cn } from "@repo/components/lib/utils"
import { Button } from "@repo/components/ui/button"
import { Calendar } from "@repo/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@repo/components/ui/popover"
import { format } from "date-fns"
import { FC, ReactNode } from "react"
import { DateRange, OnSelectHandler } from "react-day-picker"
import { Calendar as CalendarIcon, LucideIcon } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { enUS, es } from "date-fns/locale"

type CustomDateRange =
  | {
      startDate?: Date
      endDate?: Date
    }
  | DateRange

export type DatePickerProps = {
  value: Date | DateRange | Date[] | undefined
  onSelect:
    | OnSelectHandler<Date | undefined>
    | OnSelectHandler<Date[] | undefined>
    | OnSelectHandler<DateRange | undefined>
  label?: string
  description?: string
  placeholder?: string
  required?: boolean
  validInitDate?: Date
  validEndDate?: Date
  startIcon?: LucideIcon
  mode?: "range" | "single" | "multiple"
  numberOfMonth?: 1 | 2
  disabled?: boolean
  defaultMonth?: Date
  endComponent?: ReactNode
}

export const DatePickerField: FC<DatePickerProps> = ({
  value,
  onSelect,
  description,
  label,
  placeholder,
  required,
  validInitDate = new Date("1900-01-01"),
  validEndDate = new Date("2200-12-31"),
  startIcon: StartIcon = CalendarIcon,
  mode = "single",
  numberOfMonth = 1,
  disabled,
  defaultMonth = new Date(),
  endComponent,
}) => {
  const t = useTranslations("packages-ui")
  const locale = useLocale()

  const calendarLocale = locale === "es" ? es : enUS

  // Type guards
  const isRDPRange = (r: unknown): r is DateRange =>
    !!r && typeof r === "object" && "from" in (r as DateRange)
  const isCustomRange = (r: unknown): r is { startDate?: Date; endDate?: Date } =>
    !!r && typeof r === "object" && "startDate" in (r as { startDate?: Date; endDate?: Date })

  const formatSingle = (v: unknown): string =>
    v instanceof Date
      ? format(v, "PPP", { locale: calendarLocale })
      : (placeholder ?? t("pickDate"))

  const formatRangeFromTo = (from?: Date, to?: Date): string => {
    if (from && to)
      return `${format(from, "PPP", { locale: calendarLocale })} – ${format(to, "PPP", { locale: calendarLocale })}`
    if (from) return `${format(from, "PPP", { locale: calendarLocale })} –`
    return placeholder ?? t("pickDate")
  }

  const renderRange = (value: unknown): string => {
    const range = value as CustomDateRange | undefined
    if (!range) return placeholder ?? t("pickDate")

    if (isRDPRange(range)) {
      return formatRangeFromTo(range.from, range.to)
    }

    if (isCustomRange(range)) {
      const r = range as { startDate?: Date; endDate?: Date }
      return formatRangeFromTo(r.startDate, r.endDate)
    }

    return placeholder ?? t("pickDate")
  }

  const renderMultiple = (value: unknown): string => {
    const arr = value as Date[] | undefined
    if (arr && arr.length > 0)
      return arr.map((d) => format(d, "PP", { locale: calendarLocale })).join(", ")
    return placeholder ?? t("pickDate")
  }

  const renderLabel = (value: unknown): string => {
    switch (mode) {
      case "single":
        return formatSingle(value)
      case "range":
        return renderRange(value)
      case "multiple":
        return renderMultiple(value)
      default:
        return placeholder ?? t("pickDate")
    }
  }

  const display = renderLabel(value)

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <div className={cn(disabled && "text-muted-foreground")}>
          {label}
          {required && <span>*</span>}
        </div>
      )}
      <Popover>
        <div className="flex">
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full pl-3 font-normal flex items-center gap-2 justify-start",
                (!value || disabled) && "text-muted-foreground",
                endComponent && "rounded-r-none",
              )}
              disabled={disabled}
            >
              {StartIcon && <StartIcon className="h-4 w-4 opacity-50" />}
              <span className="truncate">{display}</span>
            </Button>
          </PopoverTrigger>
          {endComponent}
        </div>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode={mode}
            selected={value as never}
            onSelect={onSelect as never}
            locale={calendarLocale}
            disabled={(date) => {
              if (date > validEndDate) return true
              if (date < validInitDate) return true
              return false
            }}
            captionLayout="dropdown"
            required={required}
            numberOfMonths={numberOfMonth}
            endMonth={validEndDate}
            defaultMonth={(value as DateRange)?.from || defaultMonth || validInitDate}
          />
        </PopoverContent>
      </Popover>
      {description && <span>{description}</span>}
    </div>
  )
}
