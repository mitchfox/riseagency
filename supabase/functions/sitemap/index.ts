import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_URL = 'https://risefootballagency.com'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch all visible players
    const { data: players, error } = await supabase
      .from('players')
      .select('name, updated_at')
      .eq('visible_on_stars_page', true)
      .eq('representation_status', 'represented')

    if (error) {
      console.error('Error fetching players:', error)
      throw error
    }

    console.log(`Generating sitemap for ${players?.length || 0} players`)

    // Static pages with their priorities and changefreq
    const staticPages = [
      { loc: '/', priority: '1.0', changefreq: 'weekly' },
      { loc: '/stars', priority: '0.9', changefreq: 'weekly' },
      { loc: '/news', priority: '0.8', changefreq: 'daily' },
      { loc: '/about', priority: '0.7', changefreq: 'monthly' },
      { loc: '/contact', priority: '0.7', changefreq: 'monthly' },
      { loc: '/between-the-lines', priority: '0.8', changefreq: 'weekly' },
      { loc: '/clubs', priority: '0.8', changefreq: 'monthly' },
      { loc: '/coaches', priority: '0.8', changefreq: 'monthly' },
      { loc: '/scouts', priority: '0.8', changefreq: 'monthly' },
      { loc: '/agents', priority: '0.8', changefreq: 'monthly' },
      { loc: '/business', priority: '0.7', changefreq: 'monthly' },
      { loc: '/media', priority: '0.7', changefreq: 'monthly' },
      { loc: '/players', priority: '0.8', changefreq: 'monthly' },
      { loc: '/potential', priority: '0.7', changefreq: 'monthly' },
      { loc: '/privacy-policy', priority: '0.3', changefreq: 'yearly' },
      { loc: '/terms-of-service', priority: '0.3', changefreq: 'yearly' },
    ]

    // Generate player URLs
    const playerUrls = (players || []).map(player => {
      const slug = player.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
      
      const lastmod = player.updated_at 
        ? new Date(player.updated_at).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]

      return {
        loc: `/stars/${slug}`,
        priority: '0.8',
        changefreq: 'weekly',
        lastmod
      }
    })

    // Build XML sitemap
    const today = new Date().toISOString().split('T')[0]
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`

    // Add static pages
    for (const page of staticPages) {
      xml += `  <url>
    <loc>${SITE_URL}${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`
    }

    // Add player pages
    for (const player of playerUrls) {
      xml += `  <url>
    <loc>${SITE_URL}${player.loc}</loc>
    <lastmod>${player.lastmod}</lastmod>
    <changefreq>${player.changefreq}</changefreq>
    <priority>${player.priority}</priority>
  </url>
`
    }

    xml += `</urlset>`

    console.log('Sitemap generated successfully')

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    })
  } catch (error) {
    console.error('Sitemap generation error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate sitemap' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
