import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getPriceColor(priceInCents: number): string {
  if (priceInCents < 5) return 'text-price-low'
  if (priceInCents <= 10) return 'text-price-medium'
  return 'text-price-high'
}

export function formatPrice(priceInCents: number): string {
  return `${priceInCents.toFixed(2)} c/kWh`
}

export function formatTimestamp(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  return date.toLocaleString('fi-FI', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}