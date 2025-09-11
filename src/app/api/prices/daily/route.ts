import { NextRequest, NextResponse } from 'next/server'
import { database } from '@/lib/db'
import { DailyStats } from '@/types/electricity'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const db = await database.getDb()
    
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '365')
    const limit = Math.min(days, 1825) // Max 5 years
    const includeVat = searchParams.get('vat') === 'true'
    const vatRate = 1.255 // Finnish VAT 25.5%
    
    // Get daily aggregated price data
    const result = await db.query<[DailyStats[]]>(`
      SELECT 
        date,
        min_price,
        max_price,
        avg_price,
        median_price,
        price_count
      FROM daily_stats 
      ORDER BY date DESC
      LIMIT ${limit}
    `)
    
    let dailyData = result[0] || []
    
    // Transform to match ElectricityPrice interface for chart compatibility
    const chartData = dailyData.map(stat => {
      const price = includeVat ? stat.avg_price * vatRate : stat.avg_price
      return {
        timestamp: new Date(stat.date + 'T12:00:00').toISOString(), // Set to noon for display
        price_cents_kwh: Math.round(price * 100) / 100,
        price_area: 'FI' as const,
        forecast: false,
        // Additional daily stats for tooltip
        min_price: includeVat ? stat.min_price * vatRate : stat.min_price,
        max_price: includeVat ? stat.max_price * vatRate : stat.max_price,
        median_price: includeVat ? stat.median_price * vatRate : stat.median_price,
        is_daily_avg: true
      }
    }).reverse() // Reverse to get chronological order
    
    return NextResponse.json({
      success: true,
      data: chartData,
      count: chartData.length,
      vat_included: includeVat,
      vat_rate: includeVat ? "25.5%" : null,
      data_type: 'daily_averages'
    })
  } catch (error) {
    console.error('Failed to fetch daily prices:', error)
    
    // Return mock data for development
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '365')
    const mockDailyData = Array.from({ length: Math.min(days, 365) }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const avgPrice = Math.random() * 8 + 3 // 3-11 c/kWh average
      return {
        timestamp: date.toISOString(),
        price_cents_kwh: Math.round(avgPrice * 100) / 100,
        price_area: 'FI' as const,
        forecast: false,
        is_daily_avg: true
      }
    }).reverse()
    
    return NextResponse.json({
      success: true,
      data: mockDailyData,
      count: mockDailyData.length,
      mock: true,
      data_type: 'daily_averages'
    })
  }
}