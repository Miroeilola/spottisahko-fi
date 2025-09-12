import { NextResponse } from 'next/server'
import { database } from '@/lib/db'
import { ElectricityPrice } from '@/types/electricity'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Check if user wants VAT included
    const url = new URL(request.url)
    const includeVat = url.searchParams.get('vat') === 'true'
    const vatRate = 1.255 // Finnish VAT 25.5%
    
    // Get recent prices from internal API
    // In production, use relative URL to avoid domain issues
    const isProduction = process.env.NODE_ENV === 'production'
    const baseUrl = isProduction 
      ? `${request.url.split('/api/')[0]}` 
      : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    const vatParam = includeVat ? '&vat=true' : ''
    const apiUrl = `${baseUrl}/api/prices?hours=24${vatParam}`
    
    console.log('Current price API: Fetching from:', apiUrl)
    const response = await fetch(apiUrl)
    const data = await response.json()
    
    console.log('Current price API: Got response:', {
      success: data.success,
      dataLength: data.data?.length || 0,
      sample: data.data?.[0]
    })
    
    if (data.success && data.data && data.data.length > 0) {
      const prices = data.data
      const now = new Date()
      
      // Filter to only past and current hour prices (not future forecasts for "current")
      const currentTime = now.toISOString()
      const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0)
      
      // First try to get actual (non-forecast) prices
      const actualPrices = prices.filter((p: any) => p.timestamp <= currentTime && !p.forecast)
      
      // If no actual price for current hour, include forecast for current hour
      let currentPrice = actualPrices[0]
      if (!currentPrice || new Date(actualPrices[0].timestamp) < currentHour) {
        // Try to find a price for the current hour (including forecasts)
        const currentHourPrice = prices.find((p: any) => {
          const priceHour = new Date(p.timestamp)
          return priceHour.getTime() === currentHour.getTime()
        })
        currentPrice = currentHourPrice || actualPrices[0] || prices[0]
      }
      
      const previousPrice = actualPrices[1] || prices[1]
      
      return NextResponse.json({
        success: true,
        data: {
          current: currentPrice,
          previous: previousPrice
        },
        vat_included: data.vat_included || includeVat,
        vat_rate: data.vat_rate || (includeVat ? "25.5%" : null)
      })
    }
    
    throw new Error('No price data available')
  } catch (error) {
    console.error('Failed to fetch current price:', error)
    
    // Return mock data for development
    const now = new Date()
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    
    return NextResponse.json({
      success: true,
      data: {
        current: {
          timestamp: now.toISOString(),
          price_cents_kwh: Math.round((Math.random() * 8 + 4) * 100) / 100, // 4-12 c/kWh
          price_area: 'FI',
          forecast: false
        },
        previous: {
          timestamp: hourAgo.toISOString(),
          price_cents_kwh: Math.round((Math.random() * 8 + 4) * 100) / 100,
          price_area: 'FI',
          forecast: false
        }
      },
      mock: true
    })
  }
}