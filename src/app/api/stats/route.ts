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
    
    // Create a new db connection for this request to avoid any state issues
    const freshDb = await database.getDb()
    
    // Use a simpler, more direct approach that works in production
    let allDbPrices: any[] = []
    
    try {
      // Try to get prices with a date range query that's more explicit
      const startDate = new Date(date)
      startDate.setUTCHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setUTCHours(23, 59, 59, 999)
      
      // Use the same query pattern that works in the prices API
      const query = `
        SELECT * FROM electricity_price 
        WHERE timestamp >= type::datetime('${startDate.toISOString()}')
        AND timestamp <= type::datetime('${endDate.toISOString()}')
        ORDER BY timestamp ASC
      `
      
      console.log('Stats API: Executing date range query for:', date)
      const dateResult = await freshDb.query(query)
      
      if (Array.isArray(dateResult) && dateResult.length > 0 && Array.isArray(dateResult[0])) {
        allDbPrices = dateResult[0]
        console.log('Stats API: Found', allDbPrices.length, 'prices directly for date', date)
      }
    } catch (error) {
      console.error('Stats API: Date range query failed:', error)
    }
    
    // If date range query didn't work, fall back to getting all prices
    if (allDbPrices.length === 0) {
      console.log('Stats API: Date range query returned no results, trying fallback...')
      
      try {
        // Use the exact same approach as the prices API which is working
        const fallbackQuery = `
          SELECT * FROM electricity_price 
          ORDER BY timestamp DESC
          LIMIT 200
        `
        
        const fallbackResult = await freshDb.query(fallbackQuery)
        
        if (Array.isArray(fallbackResult) && fallbackResult.length > 0) {
          const firstResult = fallbackResult[0]
          
          // Check if we got actual data
          if (Array.isArray(firstResult)) {
            const allPrices = firstResult
            console.log('Stats API: Fallback query found', allPrices.length, 'total prices')
            
            // Filter for the requested date
            allDbPrices = allPrices.filter((price: any) => {
              if (!price.timestamp) return false
              const priceDate = new Date(price.timestamp).toISOString().split('T')[0]
              return priceDate === date
            })
            
            console.log('Stats API: Filtered to', allDbPrices.length, 'prices for date', date)
          } else {
            console.log('Stats API: Fallback query returned non-array:', typeof firstResult)
          }
        }
      } catch (error) {
        console.error('Stats API: Fallback query failed:', error)
      }
    }
    
    // Use the filtered prices
    let prices = allDbPrices
    
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