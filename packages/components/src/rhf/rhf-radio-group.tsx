"use client"

import { FC } from "react"
import { useFormContext } from "react-hook-form"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/components/ui/form"
import { RadioGroup, RadioGroupItem } from "@repo/components/ui/radio-group"
import { cn } from "@repo/components/lib/utils"

interface RadioGroupItem {
  value: string
  label: string
}

interface Props {
  name: string
  label?: string
  items: RadioGroupItem[]
  required?: boolean
  disabled?: boolean
}

export const RHFRadioGroup: FC<Props> = ({ name, label, items, disabled, required }) => {
  const form = useFormContext()

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-3">
          {label && (
            <FormLabel className={cn(disabled && "text-muted-foreground")}>
              {label}
              {required && <span>*</span>}
            </FormLabel>
          )}

          <FormControl>
            <RadioGroup
              onValueChange={field.onChange}
              defaultValue={field.value}
              className="flex flex-col"
            >
              {items.map((item) => (
                <FormItem key={item.value} className="flex items-center gap-3">
                  <FormControl>
                    <RadioGroupItem value={item.value} disabled={disabled} />
                  </FormControl>
                  <FormLabel className="font-normal">{item.label}</FormLabel>
                </FormItem>
              ))}
            </RadioGroup>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
