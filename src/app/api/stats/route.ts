import { NextRequest, NextResponse } from 'next/server'
import { database } from '@/lib/db'
import { DailyStats } from '@/types/electricity'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date') || '2025-09-10'
    const includeVat = searchParams.get('vat') === 'true'
    const vatRate = 1.255 // Finnish VAT 25.5%
    
    // Base stats (without VAT)
    let stats: DailyStats = {
      date: `${date}T00:00:00.000Z`,
      avg_price: 6.85,
      min_price: 2.15,
      max_price: 12.45,
      median_price: 6.72
    }
    
    // Apply VAT if requested
    if (includeVat) {
      stats = {
        ...stats,
        avg_price: Math.round(stats.avg_price * vatRate * 100) / 100,
        min_price: Math.round(stats.min_price * vatRate * 100) / 100,
        max_price: Math.round(stats.max_price * vatRate * 100) / 100,
        median_price: Math.round(stats.median_price * vatRate * 100) / 100,
        vat_included: true
      }
    }
    
    return NextResponse.json({
      success: true,
      data: stats,
      vat_included: includeVat,
      vat_rate: includeVat ? "25.5%" : null
    })
    
  } catch (error) {
    console.error('Failed to fetch stats:', error)
    
    // Return mock statistics for development
    return NextResponse.json({
      success: true,
      data: {
        date: `${new Date().toISOString().split('T')[0]}T00:00:00.000Z`,
        avg_price: Math.round((Math.random() * 4 + 6) * 100) / 100, // 6-10 c/kWh
        min_price: Math.round((Math.random() * 3 + 2) * 100) / 100, // 2-5 c/kWh
        max_price: Math.round((Math.random() * 5 + 10) * 100) / 100, // 10-15 c/kWh
        median_price: Math.round((Math.random() * 3 + 6) * 100) / 100, // 6-9 c/kWh
      },
      mock: true
    })
  }
}