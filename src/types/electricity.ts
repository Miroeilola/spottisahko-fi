export interface ElectricityPrice {
  timestamp: string
  price_cents_kwh: number
  price_area: string
  forecast: boolean
  vat_included?: boolean
}

export interface DailyStats {
  date: string
  avg_price: number
  min_price: number
  max_price: number
  median_price: number
  vat_included?: boolean
}

export interface BlogPost {
  slug: string
  title: string
  content: string
  meta_description: string
  keywords: string[]
  published_at: string
  views: number
}

export interface PageView {
  id: string
  path: string
  timestamp: string
  user_agent?: string
  referrer?: string
}