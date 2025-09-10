import { NextRequest, NextResponse } from 'next/server'
import { database } from '@/lib/db'
import { geminiAI } from '@/lib/gemini'
import { ElectricityPrice, DailyStats } from '@/types/electricity'

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

    console.log('Starting blog generation cron job...')
    
    await database.connect()
    const db = database.getDb()
    
    // Get current price
    const currentResult = await db.query<[ElectricityPrice[]]>(`
      SELECT * FROM electricity_price 
      WHERE timestamp <= time::now()
      ORDER BY timestamp DESC 
      LIMIT 1
    `)
    
    const currentPrice = currentResult[0]?.[0]
    
    if (!currentPrice) {
      return NextResponse.json({
        success: false,
        error: 'No current price data available'
      }, { status: 400 })
    }
    
    // Get recent prices for trend analysis (last 24 hours)
    const recentResult = await db.query<[ElectricityPrice[]]>(`
      SELECT * FROM electricity_price 
      WHERE timestamp >= time::now() - 24h
      ORDER BY timestamp DESC
    `)
    
    const recentPrices = recentResult[0] || []
    
    // Get today's stats
    const today = new Date().toISOString().split('T')[0]
    const statsResult = await db.query<[DailyStats[]]>(`
      SELECT * FROM daily_stats 
      WHERE date = "${today}T00:00:00.000Z"
      LIMIT 1
    `)
    
    let stats = statsResult[0]?.[0]
    
    // If no stats exist, calculate them
    if (!stats) {
      const calculatedResult = await db.query<[{
        avg_price: number
        min_price: number
        max_price: number
        median_price: number
      }[]]>(`
        SELECT 
          math::round(math::mean(price_cents_kwh) * 100) / 100 AS avg_price,
          math::round(math::min(price_cents_kwh) * 100) / 100 AS min_price,
          math::round(math::max(price_cents_kwh) * 100) / 100 AS max_price,
          math::round(math::mean(price_cents_kwh) * 100) / 100 AS median_price
        FROM electricity_price 
        WHERE timestamp >= "${today}T00:00:00.000Z" 
          AND timestamp < "${today}T23:59:59.999Z"
          AND forecast = false
        GROUP ALL
      `)
      
      const calculatedStats = calculatedResult[0]?.[0]
      
      if (calculatedStats) {
        stats = {
          date: `${today}T00:00:00.000Z`,
          ...calculatedStats
        }
        
        // Save calculated stats
        await db.query(`
          CREATE daily_stats SET
            date = "${today}T00:00:00.000Z",
            avg_price = ${calculatedStats.avg_price},
            min_price = ${calculatedStats.min_price},
            max_price = ${calculatedStats.max_price},
            median_price = ${calculatedStats.median_price}
        `)
      }
    }
    
    if (!stats) {
      return NextResponse.json({
        success: false,
        error: 'No statistics available for blog generation'
      }, { status: 400 })
    }
    
    // Check if we already generated a blog post today
    const existingPostResult = await db.query<[{ count: number }[]]>(`
      SELECT count() as count FROM blog_posts 
      WHERE published_at >= "${today}T00:00:00.000Z"
        AND published_at < "${today}T23:59:59.999Z"
    `)
    
    const existingPosts = existingPostResult[0]?.[0]?.count || 0
    
    if (existingPosts > 0) {
      return NextResponse.json({
        success: true,
        message: 'Blog post already generated today'
      })
    }
    
    // Generate blog content with AI
    console.log('Generating blog content with Gemini AI...')
    const blogData = await geminiAI.generateBlogPost(currentPrice, stats, recentPrices)
    
    if (!blogData.title || !blogData.content || !blogData.slug) {
      throw new Error('Invalid blog content generated')
    }
    
    // Save blog post to database
    await db.query(`
      CREATE blog_posts SET
        title = $title,
        content = $content,
        meta_description = $meta_description,
        keywords = $keywords,
        slug = $slug,
        published_at = time::now(),
        views = 0
    `, {
      title: blogData.title,
      content: blogData.content,
      meta_description: blogData.meta_description || '',
      keywords: blogData.keywords || [],
      slug: blogData.slug
    })
    
    console.log(`Blog post generated successfully: "${blogData.title}"`)
    
    return NextResponse.json({
      success: true,
      message: 'Blog post generated successfully',
      data: {
        title: blogData.title,
        slug: blogData.slug
      }
    })
    
  } catch (error) {
    console.error('Blog generation cron job failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate blog post',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}