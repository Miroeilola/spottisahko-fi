import { NextRequest, NextResponse } from 'next/server'
import { database } from '@/lib/db'
import { BlogPost } from '@/types/electricity'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    
    const db = await database.getDb()
    
    // Get blog post by slug
    const result = await db.query<[BlogPost[]]>(`
      SELECT * FROM blog_posts 
      WHERE slug = $slug 
      LIMIT 1
    `, { slug })
    
    const post = result[0]?.[0]
    
    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Blog post not found' },
        { status: 404 }
      )
    }
    
    // Increment view count
    await db.query(`
      UPDATE $id SET views = views + 1
    `, { id: (post as any).id })
    
    return NextResponse.json({
      success: true,
      data: {
        ...post,
        views: post.views + 1
      }
    })
  } catch (error) {
    console.error('Failed to fetch blog post:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch blog post' 
      },
      { status: 500 }
    )
  }
}