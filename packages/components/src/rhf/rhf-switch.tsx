"use client"

import { useFormContext } from "react-hook-form"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@repo/components/ui/form"
import { Switch } from "@repo/components/ui/switch"
import { FC } from "react"
import { cn } from "@repo/components/lib/utils"

interface Props {
  name: string
  label?: string
  description?: string
  disabled?: boolean
  reverseLabel?: boolean
}

export const RHFSwitch: FC<Props> = ({ name, description, label, disabled, reverseLabel }) => {
  const form = useFormContext()

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between p-3 shadow-sm">
          {!reverseLabel && (
            <div className="space-y-0.5">
              {label && (
                <FormLabel className={cn(disabled && "text-muted-foreground")}>{label}</FormLabel>
              )}
              {description && <FormDescription>{description}</FormDescription>}
            </div>
          )}
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
          </FormControl>
          {reverseLabel && (
            <div className="space-y-0.5">
              {label && (
                <FormLabel className={cn(disabled && "text-muted-foreground")}>{label}</FormLabel>
              )}
              {description && <FormDescription>{description}</FormDescription>}
            </div>
          )}
        </FormItem>
      )}
    />
  )
}
