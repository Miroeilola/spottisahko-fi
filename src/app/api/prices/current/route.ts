import { NextResponse } from 'next/server'
import { database } from '@/lib/db'
import { ElectricityPrice } from '@/types/electricity'

export async function GET() {
  try {
    await database.connect()
    const db = database.getDb()
    
    // Get the most recent price
    const currentResult = await db.query<[ElectricityPrice[]]>(`
      SELECT * FROM electricity_price 
      WHERE timestamp <= time::now()
      ORDER BY timestamp DESC 
      LIMIT 1
    `)
    
    // Get the previous hour's price for trend calculation
    const previousResult = await db.query<[ElectricityPrice[]]>(`
      SELECT * FROM electricity_price 
      WHERE timestamp <= time::now() - 1h
      ORDER BY timestamp DESC 
      LIMIT 1
    `)
    
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
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch current electricity price' 
      },
      { status: 500 }
    )
  }
}