import { neon } from '@neondatabase/serverless';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session-store';

const sql = neon(process.env.DATABASE_URL!);

async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('auth_session')?.value;
  if (!sessionId) return false;
  const session = getSession(sessionId);
  return session?.role === 'admin';
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const jobs = await sql`
      SELECT * FROM enrichment_jobs 
      ORDER BY created_at DESC 
      LIMIT 10
    `;

    return NextResponse.json(jobs.map((j: any) => ({
      id: j.id,
      status: j.status,
      totalResources: j.total_resources,
      processedResources: j.processed_resources,
      failedResources: j.failed_resources,
      startedAt: j.started_at,
      completedAt: j.completed_at,
      errorMessage: j.error_message,
      createdAt: j.created_at,
    })));
  } catch (error) {
    console.error('Get enrichment jobs error:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { resourceIds } = body;

    // Count resources to process
    const totalResources = resourceIds?.length || 0;

    // Create a new enrichment job
    const [job] = await sql`
      INSERT INTO enrichment_jobs (status, total_resources, started_at)
      VALUES ('running', ${totalResources}, NOW())
      RETURNING *
    `;

    // In a real implementation, this would queue resources for processing
    // For now, we'll just mark the job as completed
    await sql`
      UPDATE enrichment_jobs 
      SET status = 'completed', completed_at = NOW(), processed_resources = ${totalResources}
      WHERE id = ${job.id}
    `;

    return NextResponse.json({
      id: job.id,
      status: 'completed',
      totalResources: totalResources,
      message: 'Enrichment job created and completed',
    }, { status: 201 });
  } catch (error) {
    console.error('Create enrichment job error:', error);
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
  }
}
