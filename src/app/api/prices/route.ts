import { NextRequest, NextResponse } from 'next/server'
import { database } from '@/lib/db'
import { ElectricityPrice } from '@/types/electricity'

export async function GET(request: NextRequest) {
  try {
    const db = await database.getDb()
    
    const searchParams = request.nextUrl.searchParams
    const hours = parseInt(searchParams.get('hours') || '24')
    const limit = Math.min(hours, 168) // Max 7 days
    
    // Check record count for debugging
    const countResult = await db.query<[{count: number}[]]>(`
      SELECT count() as count FROM electricity_price
    `)
    
    console.log('Prices API - Total electricity_price records:', countResult[0]?.[0]?.count || 0)
    
    // Get recent prices (allowing day-ahead future prices)
    const result = await db.query<[ElectricityPrice[]]>(`
      SELECT * FROM electricity_price 
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `)
    
    const prices = result[0] || []
    
    return NextResponse.json({
      success: true,
      data: prices,
      count: prices.length
    })
  } catch (error) {
    console.error('Failed to fetch prices:', error)
    
    // Return mock data for development when DB is not available
    const mockPrices: ElectricityPrice[] = Array.from({ length: 24 }, (_, i) => {
      const timestamp = new Date()
      timestamp.setHours(timestamp.getHours() - i)
      return {
        timestamp: timestamp.toISOString(),
        price_cents_kwh: Math.random() * 10 + 2, // 2-12 c/kWh
        price_area: 'FI',
        forecast: false
      }
    })
    
    return NextResponse.json({
      success: true,
      data: mockPrices,
      count: mockPrices.length,
      mock: true
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prices } = body
    
    if (!Array.isArray(prices)) {
      return NextResponse.json(
        { success: false, error: 'Prices must be an array' },
        { status: 400 }
      )
    }

    const db = await database.getDb()
    
    // Insert prices (using UPSERT to handle duplicates)
    for (const price of prices) {
      await db.create('electricity_price', price as unknown as Record<string, unknown>)
    }
    
    return NextResponse.json({
      success: true,
      message: `Inserted/updated ${prices.length} price records`
    })
  } catch (error) {
    console.error('Failed to save prices:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to save electricity prices' 
      },
      { status: 500 }
    )
  }
}