"use client"

import { FC, ChangeEvent } from "react"
import { ControllerRenderProps, FieldValues, useFormContext } from "react-hook-form"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/components/ui/form"
import { Button } from "@repo/components/ui/button"
import { Minus, Plus } from "lucide-react"
import { cn } from "@repo/components/lib/utils"

interface Props {
  name: string
  label?: string
  description?: string
  required?: boolean
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}

export const RHFNumberInput: FC<Props> = ({
  name,
  label,
  description,
  required,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  step = 1,
  disabled,
}) => {
  const { control } = useFormContext()

  const onValueChange = (
    e: ChangeEvent<HTMLInputElement>,
    field: ControllerRenderProps<FieldValues, string>,
  ) => {
    const val = e.target.value === "" ? "" : Number(e.target.value)
    field.onChange(val)
  }

  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          {label && (
            <FormLabel
              className={cn(disabled && "text-muted-foreground", fieldState.error && "mt-6.5")}
            >
              {label}
              {required && <span>*</span>}
            </FormLabel>
          )}

          <FormControl>
            <div
              className={cn(
                "inline-flex items-center rounded-lg shadow-sm border h-9 bg-input dark:bg-input/30 dark:hover:bg-input/50",
              )}
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => field.onChange(Math.max((field.value ?? 0) - step, min))}
                disabled={disabled || (field.value ?? 0) <= min}
                className="w-10 rounded-l-lg rounded-r-none border-0"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <input
                type="number"
                min={min}
                max={max}
                step={step}
                disabled={disabled}
                value={field.value ?? ""}
                onChange={(e: ChangeEvent<HTMLInputElement>) => onValueChange(e, field)}
                className={cn(
                  "w-16 text-center border-x px-2 py-1 text-sm font-medium bg-transparent outline-none focus-visible:ring-0 focus-visible:border-ring",
                  disabled && "text-muted-foreground cursor-not-allowed",
                )}
              />

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => field.onChange(Math.min((field.value ?? 0) + step, max))}
                disabled={disabled || (field.value ?? 0) >= max}
                className="w-10 rounded-r-lg rounded-l-none border-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </FormControl>

          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage className="whitespace-normal break-words" />
        </FormItem>
      )}
    />
  )
}
