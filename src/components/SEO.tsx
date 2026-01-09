import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  noindex?: boolean;
  structuredData?: object;
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
  };
}

// Sitelinks search box and site navigation structured data
const getSitelinksData = () => ({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://risefootballagency.com/#organization",
      "name": "RISE Football Agency",
      "url": "https://risefootballagency.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://risefootballagency.com/favicon.ico"
      },
      "sameAs": [
        "https://www.instagram.com/risefootballagency/",
        "https://twitter.com/risefootballag"
      ]
    },
    {
      "@type": "WebSite",
      "@id": "https://risefootballagency.com/#website",
      "url": "https://risefootballagency.com",
      "name": "RISE Football Agency",
      "publisher": {
        "@id": "https://risefootballagency.com/#organization"
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://risefootballagency.com/stars?search={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@type": "WebPage",
      "@id": "https://risefootballagency.com/#webpage",
      "url": "https://risefootballagency.com",
      "name": "RISE Football Agency - Elite Player Representation",
      "isPartOf": {
        "@id": "https://risefootballagency.com/#website"
      },
      "about": {
        "@id": "https://risefootballagency.com/#organization"
      },
      "description": "Elite football representation. We scout across Europe and guide Premier League players to success."
    },
    {
      "@type": "SiteNavigationElement",
      "name": "For Players",
      "url": "https://players.risefootballagency.com"
    },
    {
      "@type": "SiteNavigationElement",
      "name": "For Clubs",
      "url": "https://clubs.risefootballagency.com"
    },
    {
      "@type": "SiteNavigationElement",
      "name": "For Agents",
      "url": "https://agents.risefootballagency.com"
    },
    {
      "@type": "SiteNavigationElement",
      "name": "For Scouts",
      "url": "https://scouts.risefootballagency.com"
    },
    {
      "@type": "SiteNavigationElement",
      "name": "For Coaches",
      "url": "https://coaches.risefootballagency.com"
    },
    {
      "@type": "SiteNavigationElement",
      "name": "For Business",
      "url": "https://business.risefootballagency.com"
    },
    {
      "@type": "SiteNavigationElement",
      "name": "Stars",
      "url": "https://risefootballagency.com/stars"
    },
    {
      "@type": "SiteNavigationElement",
      "name": "About Us",
      "url": "https://risefootballagency.com/about"
    }
  ]
});

export const SEO = ({ 
  title = "RISE Football Agency - Elite Player Representation", 
  description = "Elite football representation. We scout across Europe and guide Premier League players to success through their development.",
  image = "https://risefootballagency.com/og-thumbnail.png",
  url,
  type = "website",
  noindex = false,
  structuredData,
  article
}: SEOProps) => {
  const siteUrl = "https://risefootballagency.com";
  const fullUrl = url ? `${siteUrl}${url}` : (typeof window !== 'undefined' ? window.location.href : siteUrl);
  // Ensure image is always an absolute URL
  const fullImage = image.startsWith('http') ? image : `${siteUrl}${image.startsWith('/') ? '' : '/'}${image}`;

  // Merge sitelinks data with any custom structured data
  const combinedStructuredData = structuredData 
    ? [getSitelinksData(), structuredData]
    : getSitelinksData();

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <link rel="canonical" href={fullUrl} />
      
      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="RISE Football Agency" />
      
      {/* Article specific meta tags */}
      {article?.publishedTime && (
        <meta property="article:published_time" content={article.publishedTime} />
      )}
      {article?.modifiedTime && (
        <meta property="article:modified_time" content={article.modifiedTime} />
      )}
      {article?.author && (
        <meta property="article:author" content={article.author} />
      )}
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />
      
      {/* Sitelinks & Custom Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(combinedStructuredData)}
      </script>
    </Helmet>
  );
};
