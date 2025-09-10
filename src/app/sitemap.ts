import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  // Get blog posts for dynamic sitemap
  let blogPosts: Array<{ slug: string; published_at: string }> = []
  
  try {
    const response = await fetch(`${baseUrl}/api/blog?limit=1000`, {
      cache: 'no-store'
    })
    
    if (response.ok) {
      const data = await response.json()
      blogPosts = data.success ? data.data : []
    }
  } catch (error) {
    console.error('Failed to fetch blog posts for sitemap:', error)
  }

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1,
    },
    {
      url: `${baseUrl}/blogi`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ]

  const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${baseUrl}/blogi/${post.slug}`,
    lastModified: new Date(post.published_at),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...staticPages, ...blogPages]
}