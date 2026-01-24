import { beforeAll, afterAll, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Set up test environment
beforeAll(() => {
  // Mock window.matchMedia for responsive components
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {}, // deprecated
      removeListener: () => {}, // deprecated
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  // Mock IntersectionObserver for components using it
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return [];
    }
    unobserve() {}
  } as any;

  // Mock ResizeObserver for components using it
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  } as any;

  // Mock localStorage
  const localStorageMock = {
    getItem: (key: string) => null,
    setItem: (key: string, value: string) => {},
    removeItem: (key: string) => {},
    clear: () => {},
    length: 0,
    key: (index: number) => null,
  };
  global.localStorage = localStorageMock as Storage;

  // Mock sessionStorage
  global.sessionStorage = localStorageMock as Storage;

  // Mock Google Analytics
  (window as any).gtag = () => {};
  (window as any).dataLayer = [];

  // Set environment variables for client tests
  import.meta.env.VITE_GA_MEASUREMENT_ID = 'test-ga-id';
  import.meta.env.MODE = 'test';

  // Suppress console warnings in tests
  if (process.env.VITEST_WORKER_ID !== undefined) {
    const originalWarn = console.warn;
    const originalError = console.error;

    console.warn = (...args: any[]) => {
      // Suppress specific warnings we don't care about in tests
      const message = args[0]?.toString() || '';
      if (
        message.includes('ReactDOM.render') ||
        message.includes('Not implemented: HTMLFormElement.prototype.submit')
      ) {
        return;
      }
      originalWarn.apply(console, args);
    };

    console.error = (...args: any[]) => {
      // Suppress specific errors we don't care about in tests
      const message = args[0]?.toString() || '';
      if (
        message.includes('Not implemented') ||
        message.includes('Could not parse CSS stylesheet')
      ) {
        return;
      }
      originalError.apply(console, args);
    };
  }
});

// Clean up after each test
afterEach(() => {
  // Clear localStorage and sessionStorage
  localStorage.clear();
  sessionStorage.clear();

  // Clear any mocks
  vi.clearAllMocks();
});

// Clean up after all tests
afterAll(() => {
  // Cleanup any remaining resources
});

// Export a simple function to verify setup runs
export function testSetup() {
  return true;
}

// Console log to verify setup file can be run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('✅ React test setup file loaded successfully');
  console.log('Environment mode:', import.meta.env.MODE);
  console.log('localStorage available:', typeof localStorage !== 'undefined');
  console.log('matchMedia mocked:', typeof window.matchMedia !== 'undefined');
}
