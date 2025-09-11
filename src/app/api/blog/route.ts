import { NextRequest, NextResponse } from 'next/server'
import { database } from '@/lib/db'
import { BlogPost } from '@/types/electricity'

export async function GET(request: NextRequest) {
  try {
    const db = await database.getDb()
    
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)
    
    const result = await db.query<[BlogPost[]]>(`
      SELECT * FROM blog_posts 
      ORDER BY published_at DESC 
      LIMIT ${limit}
      START ${offset}
    `)
    
    const posts = result[0] || []
    
    // Get total count
    const countResult = await db.query<[{ count: number }[]]>(`
      SELECT count() as count FROM blog_posts
    `)
    
    const total = countResult[0]?.[0]?.count || 0
    
    return NextResponse.json({
      success: true,
      data: posts,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + posts.length < total
      }
    })
  } catch (error) {
    console.error('Failed to fetch blog posts:', error)
    
    // Return mock blog posts for development
    const mockPosts = [
      {
        slug: 'sahkon-hinta-tanaan',
        title: 'Sähkön hinta tänään - Kannattaako käyttää sähköä nyt?',
        content: 'Tänään sähkön hinta on ollut vaihtelevaa...',
        meta_description: 'Katso tämän päivän sähkön hinnat ja löydä halvimmat tunnit sähkön käyttöön.',
        keywords: ['sähkön hinta', 'pörssisähkö', 'säästö'],
        published_at: new Date().toISOString(),
        views: Math.floor(Math.random() * 1000)
      },
      {
        slug: 'sahkolaskun-saasto-vinkit',
        title: 'Näin säästät sähkölaskussa - 5 tehokasta vinkkiä',
        content: 'Sähkölaskun pienentäminen ei ole vaikeaa...',
        meta_description: 'Tehokkaita vinkkejä sähkölaskun pienentämiseen ja energian säästämiseen.',
        keywords: ['sähkölasku', 'energiasäästö', 'säästövinkit'],
        published_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        views: Math.floor(Math.random() * 1000)
      }
    ]
    
    return NextResponse.json({
      success: true,
      data: mockPosts,
      pagination: {
        total: mockPosts.length,
        limit: 10,
        offset: 0,
        hasMore: false
      },
      mock: true
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, content, meta_description, keywords, slug } = body
    
    if (!title || !content || !slug) {
      return NextResponse.json(
        { success: false, error: 'Title, content and slug are required' },
        { status: 400 }
      )
    }

    const db = await database.getDb()
    
    // Check if slug already exists
    const existingResult = await db.query<[BlogPost[]]>(`
      SELECT id FROM blog_posts WHERE slug = $slug LIMIT 1
    `, { slug })
    
    if (existingResult[0]?.length > 0) {
      return NextResponse.json(
        { success: false, error: 'A post with this slug already exists' },
        { status: 409 }
      )
    }
    
    // Create new blog post
    const result = await db.query<[BlogPost[]]>(`
      CREATE blog_posts SET
        title = $title,
        content = $content,
        meta_description = $meta_description,
        keywords = $keywords,
        slug = $slug,
        published_at = time::now(),
        views = 0
    `, {
      title,
      content,
      meta_description: meta_description || '',
      keywords: keywords || [],
      slug
    })
    
    const newPost = result[0]?.[0]
    
    return NextResponse.json({
      success: true,
      data: newPost,
      message: 'Blog post created successfully'
    })
  } catch (error) {
    console.error('Failed to create blog post:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create blog post' 
      },
      { status: 500 }
    )
  }
}