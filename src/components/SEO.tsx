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
      
      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};
