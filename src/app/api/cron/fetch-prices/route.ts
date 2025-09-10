import { NextRequest, NextResponse } from 'next/server'
import { database } from '@/lib/db'
import { entsoEClient } from '@/lib/entso-e'

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
    
    if (!authHeader || authHeader !== expectedAuth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('Starting price fetch cron job...')
    
    // Fetch yesterday's prices (more likely to have historical data)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const prices = await entsoEClient.fetchDayAheadPrices(yesterday)
    
    if (prices.length === 0) {
      console.log('No prices fetched from ENTSO-E')
      return NextResponse.json({
        success: true,
        message: 'No new prices to update',
        count: 0
      })
    }

    // Save prices to database
    await database.connect()
    const db = database.getDb()
    
    let updatedCount = 0
    
    for (const price of prices) {
      try {
        await db.create('electricity_price', price as unknown as Record<string, unknown>)
        updatedCount++
      } catch (error) {
        console.error(`Failed to save price for ${price.timestamp}:`, error)
      }
    }
    
    // Also fetch tomorrow's prices if available (usually available after 14:00)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    try {
      const tomorrowPrices = await entsoEClient.fetchDayAheadPrices(tomorrow)
      
      for (const price of tomorrowPrices) {
        try {
          await db.create('electricity_price', price as unknown as Record<string, unknown>)
          updatedCount++
        } catch (error) {
          console.error(`Failed to save tomorrow's price for ${price.timestamp}:`, error)
        }
      }
    } catch (error) {
      console.log('Tomorrow prices not yet available:', error instanceof Error ? error.message : String(error))
    }
    
    console.log(`Price fetch completed. Updated ${updatedCount} records.`)
    
    return NextResponse.json({
      success: true,
      message: `Updated ${updatedCount} price records`,
      count: updatedCount
    })
    
  } catch (error) {
    console.error('Price fetch cron job failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch and save electricity prices',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}