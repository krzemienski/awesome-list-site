import { Helmet } from "react-helmet";
import { AwesomeList, Resource } from "@/types/awesome-list";

interface SEOHeadProps {
  title?: string;
  description?: string;
  url?: string;
  image?: string;
  awesomeList?: AwesomeList;
  category?: string;
  subcategory?: string;
  resourceCount?: number;
  type?: "website" | "article";
  resource?: Resource;
}

export default function SEOHead({
  title,
  description,
  url,
  image,
  awesomeList,
  category,
  subcategory,
  resourceCount,
  type = "website",
  resource
}: SEOHeadProps) {
  // Generate dynamic SEO data based on the awesome list
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : baseUrl);
  
  const siteTitle = awesomeList?.title || "Awesome List";
  const siteDescription = awesomeList?.description || "A curated list of awesome resources";
  
  // Generate dynamic title based on page context
  const pageTitle = title 
    ? `${title} | ${siteTitle}`
    : category 
    ? `${category} Resources | ${siteTitle}`
    : siteTitle;

  // Generate dynamic description
  const pageDescription = description || (
    category 
      ? `Discover ${resourceCount || 'amazing'} ${category.toLowerCase()} resources in our curated ${siteTitle}. Find the best tools, libraries, and frameworks.`
      : awesomeList 
      ? `${siteDescription} Explore ${awesomeList.resources?.length || '2750+'} carefully curated resources across ${awesomeList.categories?.length || '80+'} categories.`
      : siteDescription
  );

  // Generate social sharing image
  const socialImage = image || `${baseUrl}/og-image.svg?title=${encodeURIComponent(pageTitle)}&category=${encodeURIComponent(category || '')}&resourceCount=${resourceCount || awesomeList?.resources?.length || ''}`;

  // Extract repository info for additional metadata
  const repoInfo = awesomeList?.repoUrl ? extractRepoInfo(awesomeList.repoUrl) : null;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content={generateKeywords(awesomeList, category)} />
      <meta name="author" content={repoInfo ? `${repoInfo.owner} contributors` : "Awesome List Community"} />
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <link rel="canonical" href={currentUrl} />

      {/* Open Graph Meta Tags */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:image" content={socialImage} />
      <meta property="og:image:alt" content={`${siteTitle} - ${pageDescription.substring(0, 100)}...`} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={siteTitle} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={socialImage} />
      <meta name="twitter:image:alt" content={`${siteTitle} social preview`} />
      {repoInfo && (
        <meta name="twitter:creator" content={`@${repoInfo.owner}`} />
      )}

      {/* Additional SEO Meta Tags */}
      <meta name="theme-color" content="#dc2626" />
      <meta name="msapplication-TileColor" content="#dc2626" />
      <meta name="application-name" content={siteTitle} />
      <meta name="apple-mobile-web-app-title" content={siteTitle} />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="mobile-web-app-capable" content="yes" />

      {/* Favicon and Icons */}
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/site.webmanifest" />

      {/* Structured Data for Rich Snippets */}
      <script type="application/ld+json">
        {JSON.stringify(generateStructuredData(awesomeList, category, subcategory, currentUrl, pageTitle, pageDescription, resource))}
      </script>

      {/* Additional Meta for iMessage and Social Previews */}
      <meta property="al:web:url" content={currentUrl} />
      {repoInfo && (
        <>
          <meta property="article:author" content={repoInfo.owner} />
          <meta property="article:publisher" content={repoInfo.owner} />
        </>
      )}

      {/* Performance and Preconnect Hints */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="//github.com" />
      <link rel="dns-prefetch" href="//api.github.com" />
    </Helmet>
  );
}

function extractRepoInfo(url: string) {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
  if (match) {
    return {
      owner: match[1],
      repo: match[2]
    };
  }
  return null;
}

function generateKeywords(awesomeList?: AwesomeList, category?: string): string {
  const baseKeywords = [
    "awesome list",
    "curated resources",
    "developer tools",
    "open source",
    "programming resources"
  ];

  if (awesomeList?.title) {
    const title = awesomeList.title.toLowerCase();
    if (title.includes("go")) {
      baseKeywords.push("golang", "go programming", "go libraries", "go frameworks");
    }
  }

  if (category) {
    baseKeywords.push(category.toLowerCase(), `${category.toLowerCase()} tools`);
  }

  if (awesomeList?.categories) {
    // Add top categories as keywords
    baseKeywords.push(...awesomeList.categories.slice(0, 5).map(cat => cat.name.toLowerCase()));
  }

  return baseKeywords.join(", ");
}

function generateBreadcrumbList(
  category?: string,
  subcategory?: string,
  url?: string
) {
  if (!category) return null;

  const baseUrl = url?.split('/').slice(0, 3).join('/') || '';
  const items = [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": baseUrl
    }
  ];

  // Add category breadcrumb
  const categoryUrl = `${baseUrl}/category/${encodeURIComponent(category.toLowerCase().replace(/\s+/g, '-'))}`;
  items.push({
    "@type": "ListItem",
    "position": 2,
    "name": category,
    "item": categoryUrl
  });

  // Add subcategory breadcrumb if present
  if (subcategory) {
    const subcategoryUrl = `${categoryUrl}/${encodeURIComponent(subcategory.toLowerCase().replace(/\s+/g, '-'))}`;
    items.push({
      "@type": "ListItem",
      "position": 3,
      "name": subcategory,
      "item": subcategoryUrl
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items
  };
}

function generateStructuredData(
  awesomeList?: AwesomeList,
  category?: string,
  subcategory?: string,
  url?: string,
  title?: string,
  description?: string,
  resource?: Resource
) {
  const baseData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": title,
    "description": description,
    "url": url,
    "inLanguage": "en-US",
    "isAccessibleForFree": true,
    "keywords": generateKeywords(awesomeList, category)
  };

  // Generate breadcrumb list for category/subcategory pages
  const breadcrumbList = generateBreadcrumbList(category, subcategory, url);

  // If viewing a specific resource, use SoftwareApplication schema
  if (resource) {
    const resourceSchema = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": resource.title,
      "description": resource.description,
      "url": resource.url,
      "applicationCategory": resource.category,
      "applicationSubCategory": resource.subcategory,
      "keywords": [
        ...(resource.tags || []),
        resource.category,
        ...(resource.subcategory ? [resource.subcategory] : []),
        ...(resource.subSubcategory ? [resource.subSubcategory] : [])
      ].join(", "),
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock"
      },
      "operatingSystem": "Cross-platform",
      "isAccessibleForFree": true,
      "inLanguage": "en-US",
      "datePublished": resource.createdAt,
      "dateModified": resource.updatedAt,
      "provider": {
        "@type": "Organization",
        "name": "Awesome List Community",
        "url": url?.split('/').slice(0, 3).join('/')
      }
    };

    return breadcrumbList ? [resourceSchema, breadcrumbList] : resourceSchema;
  }

  if (awesomeList) {
    const collectionSchema = {
      ...baseData,
      "@type": "CollectionPage",
      "about": {
        "@type": "Thing",
        "name": awesomeList.title,
        "description": awesomeList.description
      },
      "mainEntity": {
        "@type": "ItemList",
        "numberOfItems": awesomeList.resources?.length || 0,
        "itemListElement": awesomeList.categories?.slice(0, 10).map((category, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "name": category.name,
          "description": `${category.resources?.length || 0} resources in ${category.name}`
        })) || []
      },
      "publisher": {
        "@type": "Organization",
        "name": "Awesome List Community",
        "url": url
      }
    };

    return breadcrumbList ? [collectionSchema, breadcrumbList] : collectionSchema;
  }

  return breadcrumbList ? [baseData, breadcrumbList] : baseData;
}