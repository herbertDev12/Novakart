import { Badge } from "@repo/components/ui/badge"
import { Button } from "@repo/components/ui/button"
import { InputField } from "@repo/components/field/input-field"
import { cn } from "@repo/components/lib/utils"

import { Plus, X } from "lucide-react"
import { KeyboardEvent, useState } from "react"

interface Props {
  value: string[]
  name?: string
  label?: string
  placeholder?: string
  required?: boolean
  description?: string
  onChange: (value: string[]) => void
  hasError?: boolean
}

export const MultiInputField = ({
  value,
  name,
  label,
  placeholder,
  description,
  onChange,
  hasError = false,
}: Props) => {
  const [inputValue, setInputValue] = useState("")

  const addValue = () => {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    if (value.includes(trimmed)) return

    onChange([...value, trimmed])
    setInputValue("")
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addValue()
    }
  }

  const handleRemove = (itemToRemove: string) => {
    const updatedValues = value.filter((item) => item !== itemToRemove)
    onChange(updatedValues)
  }

  return (
    <div className="space-y-2">
      <div className="[&>div>label]:mb-2">
        <InputField
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          name={name}
          label={label}
          placeholder={placeholder}
          description={description}
          className={cn(hasError && "border-destructive focus-visible:ring-destructive")}
          endComponent={
            <Button
              type="button"
              onClick={addValue}
              size="icon"
              variant="ghost"
              className="mr-1 hover:bg-transparent"
              disabled={!inputValue.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          }
        />
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((item, index) => (
            <Badge variant="outline" key={index} className="flex items-center gap-1 pr-1">
              {item}
              <button
                onClick={() => handleRemove(item)}
                type="button"
                className="ml-1 p-1 rounded-full hover:bg-destructive/20 transition-colors"
              >
                <X className="w-3 h-3 hover:text-destructive" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
