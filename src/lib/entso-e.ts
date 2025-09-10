import { XMLParser } from 'fast-xml-parser'
import { ElectricityPrice } from '@/types/electricity'

interface EntsoEResponse {
  Publication_MarketDocument: {
    TimeSeries?: TimeSeries | TimeSeries[]
  }
}

interface TimeSeries {
  Period: {
    timeInterval: {
      start: string
      end: string
    }
    resolution: string
    Point: Point | Point[]
  }
}

interface Point {
  position: string
  'price.amount': string
}

export class EntsoEClient {
  private apiKey: string
  private baseUrl = 'https://web-api.tp.entsoe.eu/api'
  
  constructor() {
    this.apiKey = process.env.ENTSOE_API_KEY || ''
    // Only throw error at runtime, not during build time
    if (!this.apiKey && process.env.NODE_ENV !== 'production' && typeof window === 'undefined') {
      console.warn('ENTSO-E API key not configured - API will be unavailable')
    }
  }

  async fetchDayAheadPrices(date: Date): Promise<ElectricityPrice[]> {
    if (!this.apiKey) {
      throw new Error('ENTSO-E API key is required')
    }
    
    const startTime = new Date(date)
    startTime.setHours(0, 0, 0, 0)
    
    const endTime = new Date(date)
    endTime.setDate(endTime.getDate() + 1)
    endTime.setHours(0, 0, 0, 0)

    const params = new URLSearchParams({
      securityToken: this.apiKey,
      documentType: 'A44', // Day-ahead prices
      in_Domain: '10YFI-1--------U', // Finland
      out_Domain: '10YFI-1--------U', // Finland
      periodStart: this.formatDateTime(startTime),
      periodEnd: this.formatDateTime(endTime),
    })

    const url = `${this.baseUrl}?${params}`
    
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/xml',
        },
      })

      if (!response.ok) {
        throw new Error(`ENTSO-E API error: ${response.status} ${response.statusText}`)
      }

      const xmlData = await response.text()
      return this.parseXmlResponse(xmlData, startTime)
    } catch (error) {
      console.error('Failed to fetch ENTSO-E data:', error)
      throw error
    }
  }

  async fetchCurrentPrices(): Promise<ElectricityPrice[]> {
    const now = new Date()
    return this.fetchDayAheadPrices(now)
  }

  private formatDateTime(date: Date): string {
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    const hours = String(date.getUTCHours()).padStart(2, '0')
    const minutes = String(date.getUTCMinutes()).padStart(2, '0')
    
    return `${year}${month}${day}${hours}${minutes}`
  }

  private parseXmlResponse(xmlData: string, startDate: Date): ElectricityPrice[] {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    })

    try {
      const result = parser.parse(xmlData) as EntsoEResponse
      const document = result.Publication_MarketDocument
      
      if (!document.TimeSeries) {
        console.warn('No TimeSeries data in ENTSO-E response')
        return []
      }

      const timeSeries = Array.isArray(document.TimeSeries) 
        ? document.TimeSeries 
        : [document.TimeSeries]

      const prices: ElectricityPrice[] = []

      timeSeries.forEach(series => {
        const period = series.Period
        const points = Array.isArray(period.Point) ? period.Point : [period.Point]
        
        const periodStart = new Date(period.timeInterval.start)

        points.forEach(point => {
          // Position starts from 1, representing hours
          const position = parseInt(point.position) - 1
          const timestamp = new Date(periodStart)
          timestamp.setHours(timestamp.getHours() + position)

          // Convert EUR/MWh to cents/kWh
          const priceEurMwh = parseFloat(point['price.amount'])
          const priceCentsKwh = priceEurMwh / 10

          prices.push({
            timestamp: timestamp.toISOString(),
            price_cents_kwh: Math.round(priceCentsKwh * 100) / 100,
            price_area: 'FI',
            forecast: timestamp > new Date()
          })
        })
      })

      return prices.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    } catch (error) {
      console.error('Failed to parse ENTSO-E XML response:', error)
      throw new Error('Invalid XML response from ENTSO-E API')
    }
  }
}

export const entsoEClient = new EntsoEClient()