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
import { Textarea } from "@repo/components/ui/textarea"
import { cn } from "@repo/components/lib/utils"

interface Props {
  name: string
  placeholder?: string
  description?: string
  label?: string
  required?: boolean
  disabled?: boolean
}

export const RHFTextarea: FC<Props> = ({
  name,
  description,
  label,
  placeholder,
  required,
  disabled,
}) => {
  const form = useFormContext()

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && (
            <FormLabel className={cn(disabled && "text-muted-foreground")}>
              {label}
              {required && <span>*</span>}
            </FormLabel>
          )}
          <FormControl>
            <Textarea
              placeholder={placeholder}
              className="resize-none"
              {...field}
              required={required}
              disabled={disabled}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
