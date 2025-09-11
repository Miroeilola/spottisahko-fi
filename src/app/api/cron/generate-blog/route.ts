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
    
    const db = await database.getDb()
    
    // Get current price (temporarily using any available data for testing)
    const currentResult = await db.query<[ElectricityPrice[]]>(`
      SELECT * FROM electricity_price 
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
    
    // Get date from available data for testing
    const dataDate = new Date(currentPrice.timestamp).toISOString().split('T')[0]
    const today = dataDate
    const statsResult = await db.query<[DailyStats[]]>(`
      SELECT * FROM daily_stats 
      WHERE date = d"${today}T00:00:00.000Z"
      LIMIT 1
    `)
    
    let stats = statsResult[0]?.[0]
    
    // If no stats exist, calculate them
    if (!stats) {
      const pricesForDay = await db.query<[{ price_cents_kwh: number }[]]>(`
        SELECT price_cents_kwh FROM electricity_price 
        WHERE string::slice(timestamp, 0, 10) = "${today}"
      `)
      
      const prices = pricesForDay[0]?.map(p => p.price_cents_kwh) || []
      
      if (prices.length > 0) {
        const sortedPrices = [...prices].sort((a, b) => a - b)
        const calculatedStats = {
          avg_price: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100,
          min_price: Math.round(Math.min(...prices) * 100) / 100,
          max_price: Math.round(Math.max(...prices) * 100) / 100,
          median_price: Math.round((sortedPrices.length % 2 === 0 
            ? (sortedPrices[sortedPrices.length / 2 - 1] + sortedPrices[sortedPrices.length / 2]) / 2
            : sortedPrices[Math.floor(sortedPrices.length / 2)]) * 100) / 100
        }
        
        stats = {
          date: `${today}T00:00:00.000Z`,
          ...calculatedStats
        }
        
        // Save calculated stats
        await db.query(`
          CREATE daily_stats SET
            date = d"${today}T00:00:00.000Z",
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
      WHERE published_at >= d"${today}T00:00:00.000Z"
        AND published_at < d"${today}T23:59:59.999Z"
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