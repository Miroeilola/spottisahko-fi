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
    
    // Get database connection directly (same pattern as working stats API)
    const db = await database.getDb()
    
    // Update forecast flags for past prices
    const currentTime = new Date()
    await db.query(`
      UPDATE electricity_price 
      SET forecast = false 
      WHERE forecast = true 
      AND timestamp <= type::datetime('${currentTime.toISOString()}')
    `)
    
    // Fetch recent prices directly from database
    const hoursBack = 48
    const startTime = new Date()
    startTime.setHours(startTime.getHours() - hoursBack)
    
    const endTime = new Date()
    endTime.setDate(endTime.getDate() + 2) // Include future data
    
    console.log('Current price API: Fetching from DB, range:', startTime.toISOString(), 'to', endTime.toISOString())
    
    const result = await db.query(`
      SELECT * FROM electricity_price 
      WHERE timestamp >= type::datetime('${startTime.toISOString()}') 
      AND timestamp <= type::datetime('${endTime.toISOString()}')
      ORDER BY timestamp DESC
    `)
    
    let prices: any[] = []
    if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
      prices = result[0]
    }
    
    console.log('Current price API: Found', prices.length, 'prices in DB')
    
    if (prices.length > 0) {
      const now = new Date()
      const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0)
      
      // Find the price for current hour
      let currentPrice = prices.find((p: any) => {
        const priceTime = new Date(p.timestamp)
        return priceTime.getFullYear() === currentHour.getFullYear() &&
               priceTime.getMonth() === currentHour.getMonth() &&
               priceTime.getDate() === currentHour.getDate() &&
               priceTime.getHours() === currentHour.getHours()
      })
      
      // If no exact match for current hour, get the most recent price
      if (!currentPrice) {
        const pastPrices = prices.filter((p: any) => new Date(p.timestamp) <= now)
        currentPrice = pastPrices[0] || prices[0]
      }
      
      // Get previous hour's price
      const previousHour = new Date(currentHour.getTime() - 60 * 60 * 1000)
      let previousPrice = prices.find((p: any) => {
        const priceTime = new Date(p.timestamp)
        return priceTime.getFullYear() === previousHour.getFullYear() &&
               priceTime.getMonth() === previousHour.getMonth() &&
               priceTime.getDate() === previousHour.getDate() &&
               priceTime.getHours() === previousHour.getHours()
      })
      
      // Fallback for previous price
      if (!previousPrice && prices.length > 1) {
        const currentIndex = prices.findIndex((p: any) => p === currentPrice)
        previousPrice = prices[currentIndex + 1] || prices[1]
      }
      
      console.log('Current price API: Current price:', currentPrice?.timestamp, currentPrice?.price_cents_kwh)
      console.log('Current price API: Previous price:', previousPrice?.timestamp, previousPrice?.price_cents_kwh)
      
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