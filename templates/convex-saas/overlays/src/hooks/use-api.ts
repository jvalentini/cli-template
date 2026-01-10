import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `HTTP ${res.status}`)
  }

  return res.json()
}

export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: () => fetchApi<{ data: unknown[]; total: number }>('/api/items'),
  })
}

export function useItem(id: string | undefined) {
  return useQuery({
    queryKey: ['items', id],
    queryFn: () => fetchApi<{ data: unknown }>(`/api/items/${id}`),
    enabled: !!id,
  })
}

export function useCreateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      fetchApi<{ data: unknown }>('/api/items', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
    },
  })
}

export function useDeleteItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<{ success: boolean }>(`/api/items/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
    },
  })
}
