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
import { ComboboxFetcherField } from "@workspace/ui/components/fields/combobox-fetcher-field"
import { ReactNode } from "react"

type Props<T> = Omit<ComboboxFetcherField<T>, "value" | "onChange"> & {
  name: string
  endComponent?: ReactNode
}

export function RHFComboboxFetcher<T>({
  name,
  required,
  label,
  description,
  disabled,
  endComponent,
  ...props
}: Props<T>) {
  const form = useFormContext()

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col w-full">
          {label && (
            <FormLabel className={cn(disabled && "text-muted-foreground")}>
              {label}
              {required && <span>*</span>}
            </FormLabel>
          )}

          <FormControl>
            <div className="flex w-full">
              <div className="flex-1 min-w-0">
                <ComboboxFetcherField
                  {...field}
                  {...props}
                  disabled={disabled}
                  triggerClassName={cn("truncate", endComponent && "rounded-r-none")}
                  allowSelectAll={false}
                />
              </div>

              {endComponent && <div className="shrink-0">{endComponent}</div>}
            </div>
          </FormControl>

          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
