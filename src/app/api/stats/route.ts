import { NextRequest, NextResponse } from 'next/server'
import { database } from '@/lib/db'
import { DailyStats } from '@/types/electricity'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await database.connect()
    const db = database.getDb()
    
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    
    // Try to get existing stats first
    const existingResult = await db.query<[DailyStats[]]>(`
      SELECT * FROM daily_stats 
      WHERE date = "${date}T00:00:00.000Z"
      LIMIT 1
    `)
    
    if (existingResult[0]?.length > 0) {
      return NextResponse.json({
        success: true,
        data: existingResult[0][0]
      })
    }
    
    // Calculate stats from electricity_price table
    const statsResult = await db.query<[{
      avg_price: number
      min_price: number
      max_price: number
      median_price: number
    }[]]>(`
      SELECT 
        math::round(math::mean(price_cents_kwh) * 100) / 100 AS avg_price,
        math::round(math::min(price_cents_kwh) * 100) / 100 AS min_price,
        math::round(math::max(price_cents_kwh) * 100) / 100 AS max_price,
        math::round(array::at(math::sort(array::group(price_cents_kwh)), count() / 2) * 100) / 100 AS median_price
      FROM electricity_price 
      WHERE timestamp >= "${date}T00:00:00.000Z" 
        AND timestamp < "${date}T23:59:59.999Z"
        AND forecast = false
      GROUP ALL
    `)
    
    const stats = statsResult[0]?.[0]
    
    if (stats) {
      // Save calculated stats
      await db.query(`
        CREATE daily_stats SET
          date = "${date}T00:00:00.000Z",
          avg_price = ${stats.avg_price},
          min_price = ${stats.min_price},
          max_price = ${stats.max_price},
          median_price = ${stats.median_price}
      `)
      
      return NextResponse.json({
        success: true,
        data: {
          date: `${date}T00:00:00.000Z`,
          ...stats
        }
      })
    }
    
    return NextResponse.json({
      success: false,
      error: 'No price data available for the specified date'
    }, { status: 404 })
    
  } catch (error) {
    console.error('Failed to fetch stats:', error)
    
    // Return mock statistics for development
    return NextResponse.json({
      success: true,
      data: {
        date: `${new Date().toISOString().split('T')[0]}T00:00:00.000Z`,
        avg_price: Math.round((Math.random() * 4 + 6) * 100) / 100, // 6-10 c/kWh
        min_price: Math.round((Math.random() * 3 + 2) * 100) / 100, // 2-5 c/kWh
        max_price: Math.round((Math.random() * 5 + 10) * 100) / 100, // 10-15 c/kWh
        median_price: Math.round((Math.random() * 3 + 6) * 100) / 100, // 6-9 c/kWh
      },
      mock: true
    })
  }
}