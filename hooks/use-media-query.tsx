import * as React from "react"

export function useMediaQuery(query: string) {
  const subscribe = React.useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return () => {}
      }

      const result = window.matchMedia(query)
      const onChange = () => onStoreChange()

      result.addEventListener("change", onChange)

      return () => result.removeEventListener("change", onChange)
    },
    [query]
  )

  const getSnapshot = React.useCallback(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false
    }

    return window.matchMedia(query).matches
  }, [query])

  return React.useSyncExternalStore(subscribe, getSnapshot, () => false)
}