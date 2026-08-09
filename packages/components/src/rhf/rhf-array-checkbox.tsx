"use client"

import { useFormContext, Controller } from "react-hook-form"
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/components/ui/form"
import { Checkbox } from "@repo/components/ui/checkbox"
import { FC } from "react"
import { cn, isEqual } from "@repo/components/lib/utils"

interface Props {
  name: string
  value: string | object
  label?: string
  description?: string
  disabled?: boolean
}

export const RHFArrayCheckbox: FC<Props> = ({ name, value, label, description, disabled }) => {
  const { control } = useFormContext()

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const isChecked = field.value?.some((v: unknown) => isEqual(v, value))

        return (
          <FormItem className="flex items-center gap-3">
            <FormControl>
              <Checkbox
                checked={isChecked}
                disabled={disabled}
                onCheckedChange={(checked) => {
                  if (checked) {
                    field.onChange([...field.value, value])
                  } else {
                    field.onChange(field.value.filter((v: unknown) => !isEqual(v, value)))
                  }
                }}
              />
            </FormControl>
            {label && (
              <FormLabel className={cn(disabled && "text-muted-foreground")}>{label}</FormLabel>
            )}
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
