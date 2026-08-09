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
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@repo/components/ui/input-otp"
import { FC } from "react"
import { cn } from "@repo/components/lib/utils"

interface Props {
  name: string
  label?: string
  description?: string
  required?: boolean
  disabled?: boolean
  maxLength?: number
  className?: string
}

export const RHFInputOTP: FC<Props> = ({
  name,
  label,
  description,
  required,
  disabled,
  maxLength = 6,
  className,
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
            <InputOTP maxLength={maxLength} disabled={disabled} {...field} className={className}>
              <InputOTPGroup className="gap-2.5 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border">
                {Array.from({ length: maxLength }).map((_, index) => (
                  <InputOTPSlot key={index} index={index} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage className="whitespace-normal break-words" />
        </FormItem>
      )}
    />
  )
}
