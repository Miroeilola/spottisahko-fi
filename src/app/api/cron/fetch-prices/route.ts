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
    
    const db = await database.getDb()
    let totalUpdated = 0
    
    // Fetch prices for past 3 days, today, and next 2 days (forecasts)
    // ENTSO-E typically publishes day-ahead prices around 13:00 CET for the next day
    const datesToFetch = []
    
    // Past 3 days
    for (let daysBack = 3; daysBack >= 1; daysBack--) {
      const targetDate = new Date()
      targetDate.setDate(targetDate.getDate() - daysBack)
      datesToFetch.push(targetDate)
    }
    
    // Today
    datesToFetch.push(new Date())
    
    // Next 2 days (forecasts)
    for (let daysForward = 1; daysForward <= 2; daysForward++) {
      const targetDate = new Date()
      targetDate.setDate(targetDate.getDate() + daysForward)
      datesToFetch.push(targetDate)
    }
    
    for (const targetDate of datesToFetch) {
      console.log(`Fetching prices for ${targetDate.toISOString().split('T')[0]}`)
      
      try {
        const prices = await entsoEClient.fetchDayAheadPrices(targetDate)
        console.log(`Fetched ${prices.length} prices for ${targetDate.toISOString().split('T')[0]} (${prices.filter(p => p.forecast).length} forecasts)`)
        
        if (prices.length > 0) {
          // Store prices in database using UPSERT to handle duplicates better
          for (const price of prices) {
            try {
              // Determine if this price is actually a forecast based on current time
              const priceTime = new Date(price.timestamp)
              const currentTime = new Date()
              const isActuallyForecast = priceTime > currentTime
              
              // Use UPSERT instead of CREATE to handle duplicates gracefully
              const query = `
                UPDATE electricity_price:⟨${price.timestamp.replace(/[:.]/g, '_')}⟩ 
                SET 
                  timestamp = '${price.timestamp}',
                  price_cents_kwh = ${price.price_cents_kwh},
                  price_area = '${price.price_area}',
                  forecast = ${isActuallyForecast}
              `
              const result = await db.query(query)
              console.log(`Stored price for ${price.timestamp}: ${price.price_cents_kwh} c/kWh (forecast: ${isActuallyForecast})`)
              totalUpdated++
            } catch (error) {
              console.error(`Error storing price for ${price.timestamp}:`, error)
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