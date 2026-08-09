import { ComboboxField } from "@workspace/ui/components/fields/combobox-field"
import { unionArray } from "@workspace/ui/lib/array-operations"
import { debounce } from "lodash"
import { useLayoutEffect, useState } from "react"

export type ComboboxFetcherField<T> = Omit<
  ComboboxField<T>,
  "items" | "onScrollEnd" | "onSearch" | "onSelectAll" | "defaultSelectAll"
> & {
  params?: object
  onFetch: (params: Record<string, string | number>) => Promise<T[] | undefined>
  onError?: (error: Error) => void
  allowSelectAll?: boolean
}

const PER_PAGE = 35
const MAX_PER_PAGE = 1e5 + 5

export function ComboboxFetcherField<T>({
  params,
  onFetch,
  onError,
  allowSelectAll = true,
  ...props
}: ComboboxFetcherField<T>) {
  const [options, setOptions] = useState<T[]>([])
  const [page, setPage] = useState<number>(1)
  const [hasNext, setHasNext] = useState<boolean>(true)
  const [query, setQuery] = useState<string>("")
  const [pending, setPending] = useState<boolean>(false)

  const handleInputChange = debounce((value: string) => {
    setHasNext(true)
    setPage(1)
    setQuery(value.toLowerCase())
  }, 500)

  const loadDataAsync = debounce(async () => {
    if (hasNext && !props.disabled) {
      setPending(true)
      try {
        const res = await onFetch({
          page,
          perPage: PER_PAGE,
          query,
          ...params,
        })
        if (res) {
          setOptions((prev) => {
            return page === 1 ? res : unionArray(prev, res, (item) => item)
          })
          setPage((prev) => prev + 1)
          setHasNext(res.length === PER_PAGE)
        }
      } catch (error) {
        onError?.(error as Error)
      }
      setPending(false)
    }
  }, 500)

  useLayoutEffect(() => {
    loadDataAsync()
    return () => loadDataAsync.cancel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, props.disabled])

  const handleOnSelectAll = async (currentValue: T | T[] | undefined) => {
    const {
      onChange,
      type,
      getOptionValue = (item: T) => (item as { value: string })?.value,
    } = props

    if (type === "multiple") {
      setPending(true)

      const res = await onFetch({
        perPage: MAX_PER_PAGE,
        query,
        ...params,
      })

      if (res && res.length > 0) {
        const valueArray = Array.isArray(currentValue) ? currentValue : []

        const allSelected = res.every((item) =>
          valueArray.some((selected) => getOptionValue(selected) === getOptionValue(item)),
        )

        if (allSelected) {
          const fetchedValues = new Set(res.map((item) => getOptionValue(item)))
          const newValue = valueArray.filter(
            (selected) => !fetchedValues.has(getOptionValue(selected)),
          )
          onChange?.(newValue as T & T[])
        } else {
          const currentValues = new Set(valueArray.map((item) => getOptionValue(item)))
          const newItems = res.filter((item) => !currentValues.has(getOptionValue(item)))
          onChange?.([...valueArray, ...newItems] as T & T[])
        }
      }

      setPending(false)
    }
  }

  return (
    <ComboboxField<T>
      {...props}
      loading={pending}
      items={options}
      onSearch={handleInputChange}
      onScrollEnd={loadDataAsync}
      onSelectAll={allowSelectAll ? undefined : handleOnSelectAll}
    />
  )
}
