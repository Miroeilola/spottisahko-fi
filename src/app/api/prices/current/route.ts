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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/prices?hours=24`)
    const data = await response.json()
    
    if (data.success && data.data && data.data.length > 0) {
      const prices = data.data
      const now = new Date()
      
      // Filter to only past and current hour prices (not future forecasts for "current")
      const currentTime = now.toISOString()
      const actualPrices = prices.filter((p: any) => p.timestamp <= currentTime && !p.forecast)
      
      // If no actual prices, fall back to most recent data
      let currentPrice = actualPrices[0] || prices.find((p: any) => p.timestamp.includes("T18:")) || prices[0]
      let previousPrice = actualPrices[1] || prices[1]
      
      // Apply VAT if requested
      if (includeVat && currentPrice) {
        currentPrice = {
          ...currentPrice,
          price_cents_kwh: Math.round(currentPrice.price_cents_kwh * vatRate * 100) / 100,
          vat_included: true
        }
      }
      
      if (includeVat && previousPrice) {
        previousPrice = {
          ...previousPrice,
          price_cents_kwh: Math.round(previousPrice.price_cents_kwh * vatRate * 100) / 100,
          vat_included: true
        }
      }
      
      return NextResponse.json({
        success: true,
        data: {
          current: currentPrice,
          previous: previousPrice
        },
        vat_included: includeVat,
        vat_rate: includeVat ? "25.5%" : null
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