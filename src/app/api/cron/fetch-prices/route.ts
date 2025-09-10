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
    
    await database.connect()
    const db = database.getDb()
    let totalUpdated = 0
    
    // Try to fetch prices for the last 3 days
    for (let daysBack = 1; daysBack <= 3; daysBack++) {
      const targetDate = new Date()
      targetDate.setDate(targetDate.getDate() - daysBack)
      
      console.log(`Fetching prices for ${targetDate.toISOString().split('T')[0]}`)
      
      try {
        const prices = await entsoEClient.fetchDayAheadPrices(targetDate)
        console.log(`Fetched ${prices.length} prices for ${targetDate.toISOString().split('T')[0]}`)
        
        if (prices.length > 0) {
          // Store prices in database
          for (const price of prices) {
            try {
              await db.create('electricity_price', {
                timestamp: new Date(price.timestamp),
                price_cents_kwh: price.price_cents_kwh,
                price_area: price.price_area,
                forecast: price.forecast
              })
              totalUpdated++
            } catch (error) {
              // Ignore duplicate key errors
              const errorMessage = error instanceof Error ? error.message : String(error)
              if (!errorMessage.includes('already contains')) {
                console.error('Error storing price:', error)
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching prices for ${targetDate.toISOString().split('T')[0]}:`, error)
      }
    }
    
    console.log(`Successfully updated ${totalUpdated} price records`)
    
    return NextResponse.json({
      success: true,
      message: `Updated ${totalUpdated} price records`,
      count: totalUpdated
    })

  } catch (error) {
    console.error('Price fetch cron job failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}