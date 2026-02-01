import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

export async function GET() {
  console.log("[v0] Health check called");
  
  const checks = {
    timestamp: new Date().toISOString(),
    databaseUrlConfigured: !!process.env.DATABASE_URL,
    databaseConnection: false,
    databaseError: null as string | null,
  };
  
  if (process.env.DATABASE_URL) {
    try {
      const sql = neon(process.env.DATABASE_URL);
      const result = await sql`SELECT 1 as test`;
      checks.databaseConnection = result.length > 0;
      console.log("[v0] Database connection successful");
    } catch (error) {
      checks.databaseError = error instanceof Error ? error.message : 'Unknown error';
      console.error("[v0] Database connection failed:", error);
    }
  }
  
  return NextResponse.json(checks);
}
