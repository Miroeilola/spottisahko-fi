import { NextRequest, NextResponse } from 'next/server'
import { database } from '@/lib/db'
import { ElectricityPrice } from '@/types/electricity'

export async function GET(request: NextRequest) {
  try {
    await database.connect()
    const db = database.getDb()
    
    const searchParams = request.nextUrl.searchParams
    const hours = parseInt(searchParams.get('hours') || '24')
    const limit = Math.min(hours, 168) // Max 7 days
    
    // Get recent prices
    const result = await db.query<[ElectricityPrice[]]>(`
      SELECT * FROM electricity_price 
      WHERE timestamp >= time::now() - ${limit}h
      ORDER BY timestamp DESC
      LIMIT 1000
    `)
    
    const prices = result[0] || []
    
    return NextResponse.json({
      success: true,
      data: prices,
      count: prices.length
    })
  } catch (error) {
    console.error('Failed to fetch prices:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch electricity prices' 
      },
      { status: 500 }
    )
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

    await database.connect()
    const db = database.getDb()
    
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