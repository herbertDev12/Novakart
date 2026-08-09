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
import { Checkbox } from "@repo/components/ui/checkbox"
import { FC } from "react"
import { cn } from "@repo/components/lib/utils"

interface Props {
  name: string
  label: string
  description?: string
  disabled?: boolean
}

export const RHFSingleCheckbox: FC<Props> = ({ name, label, description, disabled }) => {
  const form = useFormContext()
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-center gap-3">
          <FormControl>
            <Checkbox
              id={name}
              disabled={disabled}
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked)}
              {...field}
            />
          </FormControl>
          <FormLabel htmlFor={name} className={cn(disabled && "text-muted-foreground")}>
            {label}
          </FormLabel>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
