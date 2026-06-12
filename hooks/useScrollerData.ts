'use client'

import { useCallback, useEffect, useState } from 'react'

type FetchResult<T> = { items: T[]; total: number; hasMore: boolean }

export function useScrollerData<T>(
  fetcher: (page: number) => Promise<FetchResult<T>>,
  deps: unknown[],
  pageSize = 15
) {
  const [items, setItems] = useState<T[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const load = useCallback(
    async (pageNum: number, reset: boolean) => {
      if (reset) setLoading(true)
      else setLoadingMore(true)
      try {
        const result = await fetcher(pageNum)
        const batch = result.items.slice(0, pageSize)
        if (reset) {
          setItems(batch)
        } else {
          setItems((prev) => [...prev, ...batch])
        }
        setTotal(result.total)
        setPage(pageNum)
      } catch {
        if (reset) {
          setItems([])
          setTotal(0)
        }
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetcher, pageSize]
  )

  useEffect(() => {
    void load(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  const loadMore = () => {
    if (!loadingMore && items.length < total) {
      void load(page + 1, false)
    }
  }

  const remaining = Math.max(0, total - items.length)

  return {
    items,
    total,
    loading,
    loadingMore,
    loadMore,
    remaining,
    hasMore: items.length < total,
  }
}
