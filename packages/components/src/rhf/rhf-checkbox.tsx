"use client"

import { useFormContext, Control, FieldValues } from "react-hook-form"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/components/ui/form"
import { Checkbox } from "@radix-ui/react-checkbox"
import { FC } from "react"
import { cn } from "@repo/components/lib/utils"

interface CheckboxItem {
  id: string
  label: string
}

interface Props {
  label?: string
  description?: string
  items: CheckboxItem[]
  name: string
  disabled?: boolean
  required?: boolean
}
const CheckboxItemField: FC<{
  control: Control<FieldValues>
  item: CheckboxItem
  disabled?: boolean
}> = ({ control, item, disabled }) => {
  return (
    <FormField
      control={control}
      name="items"
      render={({ field }) => (
        <FormItem className="flex flex-row items-center gap-2">
          <FormControl>
            <Checkbox
              disabled={disabled}
              checked={field.value?.includes(item.id)}
              onCheckedChange={(checked) => {
                return checked
                  ? field.onChange([...(field.value || []), item.id])
                  : field.onChange(field.value?.filter((value: string) => value !== item.id))
              }}
            />
          </FormControl>
          <FormLabel className="text-sm font-normal">{item.label}</FormLabel>
        </FormItem>
      )}
    />
  )
}

export const RHFCheckbox: FC<Props> = ({ label, description, items, name, disabled, required }) => {
  const form = useFormContext()

  const itemElements = items.map((item) => (
    <CheckboxItemField key={item.id} control={form.control} item={item} disabled={disabled} />
  ))

  return (
    <FormField
      control={form.control}
      name={name}
      render={() => (
        <FormItem>
          <div className="mb-4">
            {label && (
              <FormLabel className={cn(disabled ? "text-muted-foreground" : "text-base")}>
                {label}
                {required && <span>*</span>}
              </FormLabel>
            )}
            {description && <FormDescription>{description}</FormDescription>}
          </div>
          {itemElements}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
