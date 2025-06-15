import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs))
}

export const generateRandomPassword = (length: number = 12): string => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
  let password = ""
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}

export const generateInvitationToken = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

export const formatRelativeTime = (date: Date): string => {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`

  return formatDate(date)
}

// Request deduplication utility
export const createRequestDeduplicator = <T>() => {
  const pendingRequests = new Map<string, Promise<T>>()

  return {
    deduplicate: (key: string, requestFn: () => Promise<T>): Promise<T> => {
      if (pendingRequests.has(key)) {
        return pendingRequests.get(key)!
      }

      const promise = requestFn().finally(() => {
        pendingRequests.delete(key)
      })

      pendingRequests.set(key, promise)
      return promise
    },
    clear: (key?: string) => {
      if (key) {
        pendingRequests.delete(key)
      } else {
        pendingRequests.clear()
      }
    }
  }
}

// Debounce utility for API calls
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

// Cache utility with TTL
export const createCache = <T>(defaultTTL: number = 30000) => {
  const cache = new Map<string, { data: T; timestamp: number; ttl: number }>()

  return {
    get: (key: string): T | null => {
      const entry = cache.get(key)
      if (!entry) return null

      const now = Date.now()
      if (now - entry.timestamp > entry.ttl) {
        cache.delete(key)
        return null
      }

      return entry.data
    },
    set: (key: string, data: T, ttl: number = defaultTTL) => {
      cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl
      })
    },
    delete: (key: string) => {
      cache.delete(key)
    },
    clear: () => {
      cache.clear()
    },
    size: () => cache.size
  }
}
