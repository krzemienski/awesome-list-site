import { beforeAll, afterAll, afterEach } from 'vitest';

// Set up test environment variables
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test';

  // Database configuration for tests
  // Use a test database URL if provided, otherwise use in-memory fallback
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';
  }

  // Disable external API calls during tests
  process.env.GITHUB_TOKEN = process.env.TEST_GITHUB_TOKEN || 'test_token';
  process.env.ANTHROPIC_API_KEY = process.env.TEST_ANTHROPIC_API_KEY || 'test_key';
  process.env.OPENAI_API_KEY = process.env.TEST_OPENAI_API_KEY || 'test_key';

  // Session configuration for tests
  process.env.SESSION_SECRET = 'test_session_secret';

  // Replit Auth configuration (disable for tests)
  process.env.REPLIT_AUTH_ENABLED = 'false';

  // Set base URL for tests
  process.env.BASE_URL = 'http://localhost:3000';

  // Disable logging during tests
  if (process.env.VITEST_WORKER_ID !== undefined) {
    // Running in Vitest - suppress console output
    global.console = {
      ...console,
      log: () => {},
      debug: () => {},
      info: () => {},
      warn: () => {},
    };
  }
});

// Clean up after each test
afterEach(() => {
  // Clear any test data or mocks
  // This will be expanded as we add more tests
});

// Clean up after all tests
afterAll(async () => {
  // Close database connections
  // This will be implemented when we add database cleanup utilities
});

// Export a simple function to verify setup runs
export function testSetup() {
  return true;
}

// Console log to verify setup file can be run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('✅ Test setup file loaded successfully');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Database URL configured:', !!process.env.DATABASE_URL);
}
