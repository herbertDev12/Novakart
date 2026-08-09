import { FC } from "react"
import { useFormContext } from "react-hook-form"
import { MultiInputField } from "@repo/components/field/multi-input-field"
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@repo/components/ui/form"

interface Props {
  name: string
  label?: string
  placeholder?: string
  description?: string
  required?: boolean
}

export const RHFMultiInput: FC<Props> = ({ name, label, placeholder, description, required }) => {
  const form = useFormContext()

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          {label && (
            <FormLabel>
              {label}
              {required && <span>*</span>}
            </FormLabel>
          )}
          <FormControl>
            <MultiInputField
              name={field.name}
              value={field.value || []}
              onChange={field.onChange}
              placeholder={placeholder}
              required={required}
              description={description}
              hasError={!!fieldState.error}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
