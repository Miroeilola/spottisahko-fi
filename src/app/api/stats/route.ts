import { NextRequest, NextResponse } from 'next/server'
import { database } from '@/lib/db'
import { DailyStats } from '@/types/electricity'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const today = new Date().toISOString().split('T')[0]
    const date = searchParams.get('date') || today
    const includeVat = searchParams.get('vat') === 'true'
    const vatRate = 1.255 // Finnish VAT 25.5%
    
    // Get database connection
    const db = await database.getDb()
    
    // Query prices for the specific date - simplified approach
    console.log('Stats API querying for date:', date, 'isToday:', date === today)
    
    // First get ALL prices to debug what we have
    const allResult = await db.query<[any[]]>(`
      SELECT * FROM electricity_price 
      ORDER BY timestamp DESC
      LIMIT 100
    `)
    
    const allDbPrices = Array.isArray(allResult[0]) ? allResult[0] : []
    console.log('Stats API: Query result length:', allResult.length, 'First element is array:', Array.isArray(allResult[0]))
    console.log('Stats API: Total prices in DB:', allDbPrices.length)
    if (allDbPrices.length > 0) {
      console.log('Stats API: Sample timestamps:', allDbPrices.slice(0, 3).map((p: any) => p.timestamp))
      console.log('Stats API: First price object:', JSON.stringify(allDbPrices[0]))
    } else if (allResult.length > 0) {
      console.log('Stats API: Raw result (not array):', JSON.stringify(allResult).slice(0, 200))
    }
    
    // Now filter for the requested date
    // Since electricity prices are in hourly intervals and might be stored in different timezones,
    // we need to be more flexible with date matching
    let prices = allDbPrices.filter((price: any) => {
      if (!price.timestamp) return false
      
      // Try multiple date parsing approaches
      const priceDate = new Date(price.timestamp)
      
      // Check if the date matches in UTC
      const utcDateStr = priceDate.toISOString().split('T')[0]
      if (utcDateStr === date) return true
      
      // Check if the date matches in Finnish timezone (UTC+2 or UTC+3)
      // Finland is UTC+2 (winter) or UTC+3 (summer DST)
      const finnishTime = new Date(priceDate.toLocaleString("en-US", {timeZone: "Europe/Helsinki"}))
      const finnishDateStr = finnishTime.toISOString().split('T')[0]
      if (finnishDateStr === date) return true
      
      // Also check with manual offset (in case toLocaleString doesn't work in production)
      const offsetHours = [2, 3] // UTC+2 or UTC+3
      for (const offset of offsetHours) {
        const offsetTime = new Date(priceDate.getTime() + offset * 60 * 60 * 1000)
        const offsetDateStr = offsetTime.toISOString().split('T')[0]
        if (offsetDateStr === date) return true
      }
      
      return false
    })
    
    console.log('Stats API found', prices.length, 'prices for date', date)
    
    // If this is today and we have both forecast and actual prices for the same hour,
    // prefer actual prices over forecasts
    const isToday = date === today
    if (isToday && prices.length > 0) {
      const pricesByHour = new Map()
      
      // Group prices by hour, preferring non-forecast over forecast
      prices.forEach((price: any) => {
        const hour = new Date(price.timestamp).getHours()
        const existing = pricesByHour.get(hour)
        
        // Keep non-forecast price over forecast, or first price if same forecast status
        if (!existing || (!price.forecast && existing.forecast)) {
          pricesByHour.set(hour, price)
        }
      })
      
      // Convert back to array
      prices = Array.from(pricesByHour.values())
    }
    
    if (prices.length === 0) {
      throw new Error('No price data available for the specified date')
    }
    
    // Calculate statistics from actual data
    const priceValues = prices.map((p: any) => p.price_cents_kwh)
    const avgPrice = priceValues.reduce((sum: number, price: number) => sum + price, 0) / priceValues.length
    const minPrice = Math.min(...priceValues)
    const maxPrice = Math.max(...priceValues)
    
    // Calculate median
    const sortedPrices = [...priceValues].sort((a: number, b: number) => a - b)
    const medianPrice = sortedPrices.length % 2 === 0
      ? (sortedPrices[sortedPrices.length / 2 - 1] + sortedPrices[sortedPrices.length / 2]) / 2
      : sortedPrices[Math.floor(sortedPrices.length / 2)]
    
    // Base stats (without VAT)
    let stats: DailyStats = {
      date: `${date}T00:00:00.000Z`,
      avg_price: Math.round(avgPrice * 100) / 100,
      min_price: Math.round(minPrice * 100) / 100,
      max_price: Math.round(maxPrice * 100) / 100,
      median_price: Math.round(medianPrice * 100) / 100
    }
    
    // Apply VAT if requested
    if (includeVat) {
      stats = {
        ...stats,
        avg_price: Math.round(stats.avg_price * vatRate * 100) / 100,
        min_price: Math.round(stats.min_price * vatRate * 100) / 100,
        max_price: Math.round(stats.max_price * vatRate * 100) / 100,
        median_price: Math.round(stats.median_price * vatRate * 100) / 100,
        vat_included: true
      }
    }
    
    return NextResponse.json({
      success: true,
      data: stats,
      vat_included: includeVat,
      vat_rate: includeVat ? "25.5%" : null
    })
    
  } catch (error) {
    console.error('Failed to fetch stats:', error)
    
    // Return mock statistics for development  
    const searchParams = request.nextUrl.searchParams
    const today = new Date().toISOString().split('T')[0]
    const date = searchParams.get('date') || today
    const includeVat = searchParams.get('vat') === 'true'
    const vatRate = 1.255
    
    let mockStats = {
      date: `${date}T00:00:00.000Z`,
      avg_price: Math.round((Math.random() * 4 + 6) * 100) / 100, // 6-10 c/kWh
      min_price: Math.round((Math.random() * 3 + 2) * 100) / 100, // 2-5 c/kWh
      max_price: Math.round((Math.random() * 5 + 10) * 100) / 100, // 10-15 c/kWh
      median_price: Math.round((Math.random() * 3 + 6) * 100) / 100, // 6-9 c/kWh
    }
    
    // Apply VAT to mock data if requested
    if (includeVat) {
      mockStats = {
        ...mockStats,
        avg_price: Math.round(mockStats.avg_price * vatRate * 100) / 100,
        min_price: Math.round(mockStats.min_price * vatRate * 100) / 100,
        max_price: Math.round(mockStats.max_price * vatRate * 100) / 100,
        median_price: Math.round(mockStats.median_price * vatRate * 100) / 100,
      }
    }
    
    return NextResponse.json({
      success: true,
      data: mockStats,
      mock: true,
      vat_included: includeVat,
      vat_rate: includeVat ? "25.5%" : null
    })
  }
}