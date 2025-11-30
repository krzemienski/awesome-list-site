import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

const SESSION_DATA = {
  'sb-jeyldoypdkgsrfdhdcmm-auth-token': JSON.stringify({
    access_token: "eyJhbGciOiJIUzI1NiIsImtpZCI6IkRlOTBodWp6SVpGd2xsZEMiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2pleWxkb3lwZGtnc3JmZGhkY21tLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI1OGM1OTJjNS01NDhiLTQ0MTItYjRlMi1hOWRmNWNhYzUzOTciLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzY0NTMzNzY4LCJpYXQiOjE3NjQ1MzAxNjgsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6e30sInVzZXJfbWV0YWRhdGEiOnsiZnVsbF9uYW1lIjoiVGVzdCBBZG1pbiIsInJvbGUiOiJhZG1pbiJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzY0NTIzMDk5fV0sInNlc3Npb25faWQiOiI5ZjBiNzY1NS1jMTNiLTQ3MmUtOGNiNy0wMjUwZmY3MDQ0ZjIiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.vaQyM5FbY7ReGMHmqxU182dLxX4GDNLi70Qdkh-qU0k",
    user: {
      id: "58c592c5-548b-4412-b4e2-a9df5cac5397",
      email: "admin@test.com",
      user_metadata: { role: "admin", full_name: "Test Admin" }
    }
  })
};

test('Debug Auth State', async ({ page }) => {
  // Inject admin session
  await page.goto(BASE_URL);
  await page.evaluate((sessionData) => {
    Object.entries(sessionData).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
  }, SESSION_DATA);
  await page.reload();

  // Wait and get auth state from console
  await page.waitForTimeout(2000);

  // Check what's in localStorage
  const storage = await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    const data: Record<string, any> = {};
    keys.forEach(key => {
      try {
        data[key] = JSON.parse(localStorage.getItem(key) || '');
      } catch {
        data[key] = localStorage.getItem(key);
      }
    });
    return data;
  });

  console.log('📦 LocalStorage:', JSON.stringify(storage, null, 2));

  // Try to fetch current user from Supabase
  const authCheck = await page.evaluate(async () => {
    try {
      // @ts-ignore
      const response = await fetch('http://localhost:3000/api/auth/user');
      const data = await response.json();
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  console.log('🔐 Auth API Response:', JSON.stringify(authCheck, null, 2));

  // Navigate to admin and check what happens
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForLoadState('networkidle');

  const pageTitle = await page.textContent('h1, h2, h3').catch(() => 'No title found');
  console.log('📄 Admin page title:', pageTitle);

  const url = page.url();
  console.log('🌐 Final URL:', url);
});
