import { NextResponse } from 'next/server'
import { database } from '@/lib/db'
import { ElectricityPrice } from '@/types/electricity'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await database.connect()
    const db = database.getDb()
    
    // First, check if we have any data at all
    const countResult = await db.query<[{count: number}[]]>(`
      SELECT count() as count FROM electricity_price
    `)
    
    console.log('Total electricity_price records:', countResult[0]?.[0]?.count || 0)
    
    // Get the most recent price from the database
    const currentResult = await db.query<[ElectricityPrice[]]>(`
      SELECT * FROM electricity_price 
      ORDER BY timestamp DESC 
      LIMIT 1
    `)
    
    console.log('Current result:', currentResult[0]?.length || 0, 'records')
    
    // Get the second most recent price for trend calculation
    const previousResult = await db.query<[ElectricityPrice[]]>(`
      SELECT * FROM electricity_price 
      ORDER BY timestamp DESC 
      LIMIT 1 OFFSET 1
    `)
    
    console.log('Previous result:', previousResult[0]?.length || 0, 'records')
    
    const currentPrice = currentResult[0]?.[0]
    const previousPrice = previousResult[0]?.[0]
    
    return NextResponse.json({
      success: true,
      data: {
        current: currentPrice || null,
        previous: previousPrice || null
      }
    })
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