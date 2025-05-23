// Define the gtag function globally
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Initialize Google Analytics
export const initGA = () => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

  if (!measurementId) {
    console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    return;
  }

  // Add Google Analytics script to the head
  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script1);

  // Initialize gtag
  const script2 = document.createElement('script');
  script2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}');
  `;
  document.head.appendChild(script2);
};

// Track page views - useful for single-page applications
export const trackPageView = (url: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId) return;
  
  window.gtag('config', measurementId, {
    page_path: url
  });
};

// Track events
export const trackEvent = (
  action: string, 
  category?: string, 
  label?: string, 
  value?: number
) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};

// Track resource clicks - most important for awesome lists
export const trackResourceClick = (resourceTitle: string, resourceUrl: string, category: string) => {
  trackEvent('resource_click', 'engagement', `${category}: ${resourceTitle}`, 1);
  trackEvent('outbound_link', 'navigation', resourceUrl);
};

// Track search queries
export const trackSearch = (searchTerm: string, resultCount: number) => {
  trackEvent('search', 'engagement', searchTerm, resultCount);
};

// Track category navigation
export const trackCategoryView = (categoryName: string) => {
  trackEvent('category_view', 'navigation', categoryName);
};

// Track theme changes
export const trackThemeChange = (themeName: string) => {
  trackEvent('theme_change', 'customization', themeName);
};

// Track list switching
export const trackListSwitch = (fromList: string, toList: string) => {
  trackEvent('list_switch', 'navigation', `${fromList} -> ${toList}`);
};