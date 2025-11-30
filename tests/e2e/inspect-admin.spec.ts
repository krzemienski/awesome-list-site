import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:3000';
const EVIDENCE_DIR = path.join(__dirname, '../../docs/session-7-evidence/admin-ui');

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

test('Inspect Admin Page Structure', async ({ page }) => {
  // Inject admin session
  await page.goto(BASE_URL);
  await page.evaluate((sessionData) => {
    Object.entries(sessionData).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
  }, SESSION_DATA);
  await page.reload();

  // Navigate to admin page
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForLoadState('networkidle');

  // Get all visible text
  const bodyText = await page.locator('body').textContent();

  // Get all buttons
  const buttons = await page.locator('button').allTextContents();

  // Get all links
  const links = await page.locator('a').allTextContents();

  // Get all headings
  const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();

  // Get form elements
  const inputs = await page.locator('input').count();
  const selects = await page.locator('select').count();
  const tables = await page.locator('table').count();

  // Write inspection results
  const report = `# Admin Page Structure Inspection

## Summary
- Headings found: ${headings.length}
- Buttons found: ${buttons.length}
- Links found: ${links.length}
- Inputs found: ${inputs}
- Selects found: ${selects}
- Tables found: ${tables}

## Headings
${headings.map((h, i) => `${i + 1}. ${h}`).join('\n')}

## Buttons (first 50)
${buttons.slice(0, 50).map((b, i) => `${i + 1}. "${b}"`).join('\n')}

## Links (first 50)
${links.slice(0, 50).map((l, i) => `${i + 1}. "${l}"`).join('\n')}

## Page Content (first 2000 chars)
${bodyText?.substring(0, 2000)}
`;

  fs.writeFileSync(
    path.join(EVIDENCE_DIR, 'admin-page-inspection.md'),
    report
  );

  console.log('✅ Admin page inspection complete');
  console.log(`Found: ${headings.length} headings, ${buttons.length} buttons, ${tables} tables`);
});
