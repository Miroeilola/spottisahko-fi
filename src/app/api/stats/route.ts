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
    
    // Get database connection - use the same pattern as prices API
    const db = await database.getDb()
    
    // Fetch data using the same approach as the working prices API
    // Get a wider range and filter in memory
    const hoursBack = 48 // Get last 48 hours of data
    const startTime = new Date()
    startTime.setHours(startTime.getHours() - hoursBack)
    
    const endTime = new Date()
    endTime.setDate(endTime.getDate() + 2) // Include future data
    
    console.log('Stats API: Fetching prices from', startTime.toISOString(), 'to', endTime.toISOString())
    
    // Use the EXACT same query structure as the working prices API
    const result = await db.query(`
      SELECT * FROM electricity_price 
      WHERE timestamp >= type::datetime('${startTime.toISOString()}') 
      AND timestamp <= type::datetime('${endTime.toISOString()}')
      ORDER BY timestamp ASC
    `)
    
    let allPrices: any[] = []
    
    // Handle the result the same way as prices API
    if (Array.isArray(result) && result.length > 0) {
      if (Array.isArray(result[0])) {
        allPrices = result[0]
        console.log('Stats API: Query returned', allPrices.length, 'prices')
      } else {
        console.log('Stats API: Query returned non-array first element:', typeof result[0])
        // Log first 200 chars of result for debugging
        console.log('Stats API: Result preview:', JSON.stringify(result).slice(0, 200))
      }
    }
    
    // Filter for the requested date
    let prices = allPrices.filter((price: any) => {
      if (!price || !price.timestamp) return false
      const priceDate = new Date(price.timestamp).toISOString().split('T')[0]
      return priceDate === date
    })
    
    console.log('Stats API: Filtered to', prices.length, 'prices for date', date)
    
    console.log('Stats API: Processing', prices.length, 'prices for stats calculation')
    
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