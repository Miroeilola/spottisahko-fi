import { NextRequest, NextResponse } from 'next/server'
import { database } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { path, user_agent, referrer } = body
    
    if (!path) {
      return NextResponse.json(
        { success: false, error: 'Path is required' },
        { status: 400 }
      )
    }

    const db = await database.getDb()
    
    // Track page view
    await db.query(`
      CREATE page_views SET
        path = $path,
        timestamp = time::now(),
        user_agent = $user_agent,
        referrer = $referrer
    `, {
      path,
      user_agent: user_agent || null,
      referrer: referrer || null
    })
    
    return NextResponse.json({
      success: true,
      message: 'Page view tracked'
    })
    
  } catch (error) {
    console.error('Failed to track analytics:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to track page view' 
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const db = await database.getDb()
    
    // Get basic analytics data
    const todayResult = await db.query<[{ count: number }[]]>(`
      SELECT count() as count FROM page_views 
      WHERE timestamp >= string::concat(string::split(time::now(), 'T')[0], 'T00:00:00.000Z')
    `)
    
    const weekResult = await db.query<[{ count: number }[]]>(`
      SELECT count() as count FROM page_views 
      WHERE timestamp >= time::now() - 7d
    `)
    
    const monthResult = await db.query<[{ count: number }[]]>(`
      SELECT count() as count FROM page_views 
      WHERE timestamp >= time::now() - 30d
    `)
    
    const topPagesResult = await db.query<[{ path: string, count: number }[]]>(`
      SELECT path, count() as count 
      FROM page_views 
      WHERE timestamp >= time::now() - 7d
      GROUP BY path 
      ORDER BY count DESC 
      LIMIT 10
    `)
    
    return NextResponse.json({
      success: true,
      data: {
        views: {
          today: todayResult[0]?.[0]?.count || 0,
          week: weekResult[0]?.[0]?.count || 0,
          month: monthResult[0]?.[0]?.count || 0
        },
        top_pages: topPagesResult[0] || []
      }
    })
    
  } catch (error) {
    console.error('Failed to fetch analytics:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch analytics data' 
      },
      { status: 500 }
    )
  }
}