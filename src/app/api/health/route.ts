import { NextResponse } from 'next/server'
import { database } from '@/lib/db'

export async function GET() {
  try {
    // Check database connection
    const db = await database.getDb()
    
    // Test database query
    const result = await db.query('RETURN time::now()')
    
    // Check if we have recent price data
    const pricesResult = await db.query<[{ count: number }[]]>(`
      SELECT count() as count FROM electricity_price 
      WHERE timestamp >= time::now() - 1h
    `)
    
    const recentPricesCount = pricesResult[0]?.[0]?.count || 0
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      recent_prices: recentPricesCount,
      version: process.env.npm_package_version || '0.1.1'
    })
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}