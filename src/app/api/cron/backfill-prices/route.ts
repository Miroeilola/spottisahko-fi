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

    // Get optional parameters from request body
    const body = await request.json().catch(() => ({}))
    const startYear = body.startYear || new Date().getFullYear()
    const endYear = body.endYear || startYear
    const batchSize = body.batchSize || 7 // days per batch

    console.log(`Starting historical price backfill for ${startYear}-${endYear}...`)
    
    const db = await database.getDb()
    let totalUpdated = 0
    let totalErrors = 0
    const errors: string[] = []

    // Iterate through each year
    for (let year = startYear; year <= endYear; year++) {
      console.log(`Processing year ${year}...`)
      
      const yearStart = new Date(year, 0, 1) // January 1st
      const yearEnd = new Date(year + 1, 0, 1) // January 1st of next year
      
      // Process in batches to avoid API rate limits
      let currentDate = new Date(yearStart)
      
      while (currentDate < yearEnd) {
        const batchEnd = new Date(currentDate)
        batchEnd.setDate(batchEnd.getDate() + batchSize)
        
        if (batchEnd > yearEnd) {
          batchEnd.setTime(yearEnd.getTime())
        }
        
        console.log(`Fetching batch: ${currentDate.toISOString().split('T')[0]} to ${new Date(batchEnd.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`)
        
        // Process each day in the batch
        let batchDate = new Date(currentDate)
        while (batchDate < batchEnd) {
          try {
            const prices = await entsoEClient.fetchDayAheadPrices(batchDate)
            console.log(`Fetched ${prices.length} prices for ${batchDate.toISOString().split('T')[0]}`)
            
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
                    totalErrors++
                    if (errors.length < 10) { // Limit error collection
                      errors.push(`${batchDate.toISOString().split('T')[0]}: ${errorMessage}`)
                    }
                  }
                }
              }
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error(`Error fetching prices for ${batchDate.toISOString().split('T')[0]}:`, error)
            totalErrors++
            if (errors.length < 10) {
              errors.push(`${batchDate.toISOString().split('T')[0]}: ${errorMessage}`)
            }
          }
          
          // Move to next day
          batchDate.setDate(batchDate.getDate() + 1)
        }
        
        // Small delay between batches to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Move to next batch
        currentDate = new Date(batchEnd)
      }
    }
    
    console.log(`Historical backfill completed. Updated ${totalUpdated} records, ${totalErrors} errors`)
    
    return NextResponse.json({
      success: true,
      message: `Historical backfill completed for ${startYear}-${endYear}`,
      stats: {
        totalUpdated,
        totalErrors,
        yearsProcessed: endYear - startYear + 1,
        errors: errors.slice(0, 10) // Return first 10 errors
      }
    })

  } catch (error) {
    console.error('Historical price backfill failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}