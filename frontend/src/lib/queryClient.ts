import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't refetch on window focus — avoids surprise re-renders during demo
      refetchOnWindowFocus: false,
      // Retry once on failure before showing an error state
      retry: 1,
      // Data is considered fresh for 30 seconds
      staleTime: 30_000,
    },
  },
})
