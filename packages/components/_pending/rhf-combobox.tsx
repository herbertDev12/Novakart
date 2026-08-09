"use client"

import { useFormContext } from "react-hook-form"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"
import { cn } from "@workspace/ui/lib/utils"
import { ComboboxField } from "@workspace/ui/components/fields/combobox-field"

type Props<T> = Omit<ComboboxField<T>, "value" | "onChange"> & {
  name: string
}

export const RHFCombobox = <T,>({
  name,
  required,
  label,
  description,
  disabled,
  items,
  type = "single",
  ...props
}: Props<T>) => {
  const form = useFormContext()

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        return (
          <FormItem className="flex flex-col">
            {label && (
              <FormLabel className={cn(disabled && "text-muted-foreground")}>
                {label}
                {required && <span>*</span>}
              </FormLabel>
            )}
            <FormControl>
              <ComboboxField
                items={items}
                value={field.value}
                onChange={field.onChange}
                disabled={disabled}
                type={type}
                {...props}
              />
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
