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

// Track layout changes
export const trackLayoutChange = (layout: string) => {
  trackEvent('layout_change', 'ui_interaction', layout);
};

// Track filter usage
export const trackFilterUsage = (filterType: string, filterValue: string, resultCount: number) => {
  trackEvent('filter_applied', 'engagement', `${filterType}: ${filterValue}`, resultCount);
};

// Track sort changes
export const trackSortChange = (sortType: string) => {
  trackEvent('sort_change', 'ui_interaction', sortType);
};

// Track popover interactions
export const trackPopoverView = (resourceTitle: string, category: string) => {
  trackEvent('resource_preview', 'engagement', `${category}: ${resourceTitle}`);
};

// Track mobile-specific interactions
export const trackMobileInteraction = (action: string, element: string) => {
  trackEvent('mobile_interaction', 'touch', `${action}: ${element}`);
};

// Track performance metrics
export const trackPerformance = (metric: string, value: number) => {
  trackEvent('performance', 'technical', metric, Math.round(value));
};

// Track user engagement time
export const trackEngagementTime = (timeSpent: number, page: string) => {
  trackEvent('engagement_time', 'behavior', page, Math.round(timeSpent / 1000));
};

// Track scroll depth
export const trackScrollDepth = (percentage: number, page: string) => {
  trackEvent('scroll_depth', 'engagement', page, percentage);
};

// Track copy actions
export const trackCopyAction = (content: string, type: string) => {
  trackEvent('copy_action', 'engagement', `${type}: ${content.substring(0, 50)}`);
};

// Track share actions
export const trackShareAction = (method: string, resource: string) => {
  trackEvent('share_action', 'engagement', `${method}: ${resource}`);
};

// Track error events
export const trackError = (errorType: string, errorMessage: string) => {
  trackEvent('error', 'technical', `${errorType}: ${errorMessage}`);
};

// Track API response times
export const trackApiPerformance = (endpoint: string, responseTime: number, status: number) => {
  trackEvent('api_performance', 'technical', `${endpoint} (${status})`, Math.round(responseTime));
};

// Track resource favoriting/bookmarking
export const trackResourceFavorite = (resourceTitle: string, category: string, action: 'add' | 'remove') => {
  trackEvent('resource_favorite', 'engagement', `${action}: ${category}: ${resourceTitle}`);
};

// Track keyboard shortcuts usage
export const trackKeyboardShortcut = (shortcut: string, action: string) => {
  trackEvent('keyboard_shortcut', 'power_user', `${shortcut}: ${action}`);
};

// Track export actions
export const trackExportAction = (format: string, itemCount: number) => {
  trackEvent('export_action', 'data_export', format, itemCount);
};

// Track tag interactions
export const trackTagInteraction = (tag: string, action: string) => {
  trackEvent('tag_interaction', 'navigation', `${action}: ${tag}`);
};

// Track session quality metrics
export const trackSessionQuality = (metrics: {
  resourcesViewed: number;
  searchesPerformed: number;
  timeSpent: number;
  categoriesExplored: number;
}) => {
  trackEvent('session_quality', 'behavior', 'resources_viewed', metrics.resourcesViewed);
  trackEvent('session_quality', 'behavior', 'searches_performed', metrics.searchesPerformed);
  trackEvent('session_quality', 'behavior', 'time_spent', Math.round(metrics.timeSpent / 1000));
  trackEvent('session_quality', 'behavior', 'categories_explored', metrics.categoriesExplored);
};