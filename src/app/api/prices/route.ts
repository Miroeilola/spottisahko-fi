import { NextRequest, NextResponse } from 'next/server'
import { database } from '@/lib/db'
import { ElectricityPrice } from '@/types/electricity'

export async function GET(request: NextRequest) {
  try {
    const db = await database.getDb()
    
    const searchParams = request.nextUrl.searchParams
    const hours = parseInt(searchParams.get('hours') || '24')
    const limit = Math.min(hours, 720) // Max 30 days
    const includeVat = searchParams.get('vat') === 'true'
    const vatRate = 1.255 // Finnish VAT 25.5%
    
    // Update forecast flags for all prices based on current time
    const currentTime = new Date()
    await db.query(`
      UPDATE electricity_price 
      SET forecast = false 
      WHERE forecast = true 
      AND timestamp <= type::datetime('${currentTime.toISOString()}')
    `)
    
    // Check record count for debugging - use proper SurrealDB syntax
    const countResult = await db.query(`
      SELECT count() FROM electricity_price GROUP ALL
    `)
    
    let count = 0
    if (Array.isArray(countResult) && countResult.length > 0) {
      const firstResult = countResult[0]
      if (Array.isArray(firstResult) && firstResult.length > 0) {
        count = firstResult[0]?.count || 0
      } else if (typeof firstResult === 'object' && firstResult !== null) {
        count = (firstResult as any).count || 0
      }
    }
    
    console.log('Prices API - Total electricity_price records:', count)
    
    // Get recent prices including future forecasts (up to 2 days ahead)
    const startTime = new Date()
    startTime.setHours(startTime.getHours() - hours)
    
    const endTime = new Date()
    endTime.setDate(endTime.getDate() + 2) // Include up to 2 days of forecasts
    
    console.log(`Fetching prices from ${startTime.toISOString()} to ${endTime.toISOString()}`)
    
    const result = await db.query(`
      SELECT * FROM electricity_price 
      WHERE timestamp >= type::datetime('${startTime.toISOString()}') 
      AND timestamp <= type::datetime('${endTime.toISOString()}')
      ORDER BY timestamp ASC
    `)
    
    console.log('Prices API - Query result structure:', {
      resultLength: result.length,
      firstElementType: typeof result[0],
      firstElementIsArray: Array.isArray(result[0]),
      firstElementLength: Array.isArray(result[0]) ? result[0].length : 'N/A'
    })
    
    let prices = Array.isArray(result[0]) ? result[0] : []
    
    // If still no prices, try to get ANY prices for debugging
    if (prices.length === 0) {
      const anyResult = await db.query(`
        SELECT * FROM electricity_price 
        ORDER BY timestamp DESC
        LIMIT 10
      `)
      console.log('Prices API - Fetched ANY prices:', Array.isArray(anyResult[0]) ? anyResult[0].length : 0)
      if (Array.isArray(anyResult[0]) && anyResult[0].length > 0) {
        console.log('Prices API - Sample price:', JSON.stringify(anyResult[0][0]))
      }
    }
    
    // Apply VAT if requested
    if (includeVat) {
      prices = prices.map(price => ({
        ...price,
        price_cents_kwh: Math.round(price.price_cents_kwh * vatRate * 100) / 100,
        vat_included: true
      }))
    }
    
    return NextResponse.json({
      success: true,
      data: prices,
      count: prices.length,
      vat_included: includeVat,
      vat_rate: includeVat ? "25.5%" : null
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