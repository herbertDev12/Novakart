"use client"

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/components/ui/form"
import { useFormContext } from "react-hook-form"
import { FC } from "react"
import { cn } from "@repo/components/lib/utils"
import { DatePickerField, DatePickerProps } from "@repo/components/field/date-picker-field"

export type DatePickerOnSelectValue = Parameters<NonNullable<DatePickerProps["onSelect"]>>[0]
export type DatePickerOnSelect = (v: DatePickerOnSelectValue) => void

type Props = Omit<DatePickerProps, "value" | "onSelect"> & {
  name: string
  onPreChange?: DatePickerOnSelect
}

export const RHFDatePicker: FC<Props> = ({
  name,
  label,
  disabled,
  required,
  description,
  onPreChange,
  ...props
}) => {
  const form = useFormContext()

  const handleSelect = (
    field: { onChange: DatePickerOnSelect },
    value: DatePickerOnSelectValue,
  ) => {
    onPreChange?.(value)
    field.onChange(value)
  }

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <div className="flex flex-col gap-2">
              {label && (
                <FormLabel className={cn(disabled && "text-muted-foreground")}>
                  {label}
                  {required && <span>*</span>}
                </FormLabel>
              )}
              <DatePickerField
                {...field}
                onSelect={handleSelect.bind(null, field)}
                {...props}
                required={required}
                disabled={disabled}
              />
              {description && <FormDescription>{description}</FormDescription>}
              <FormMessage />
            </div>
          </FormControl>
        </FormItem>
      )}
    />
  )
}
