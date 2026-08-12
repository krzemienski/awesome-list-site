import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { eq, sql } from 'drizzle-orm';
import { db, pool } from '../../server/db';
import {
  journeySteps,
  learningJourneys,
  resourceAuditLog,
  sessions,
  users,
} from '../../shared/schema';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const PASSWORD = 'QA!Continue2026#';

type Step = {
  id: number;
  resourceId: number;
  stepNumber: number;
  title: string;
};

type Journey = {
  id: number;
  title: string;
  steps: Step[];
};

type JourneyListItem = {
  id: number;
  stepCount: number;
};

async function expectOk(response: Awaited<ReturnType<APIRequestContext['get']>>, action: string) {
  expect(
    response.ok(),
    `${action} failed: ${response.status()} ${await response.text()}`,
  ).toBeTruthy();
}

async function findGroupedJourney(page: Page): Promise<{
  journey: Journey;
  groups: Step[][];
  completedGroupIndex: number;
  resourceId: number;
}> {
  const listResponse = await page.request.get('/api/journeys');
  await expectOk(listResponse, 'list journeys');
  const list = (await listResponse.json()) as JourneyListItem[];

  for (const candidate of list.filter((item) => item.stepCount >= 2).slice(0, 20)) {
    const response = await page.request.get(`/api/journeys/${candidate.id}`);
    if (!response.ok()) continue;
    const journey = (await response.json()) as Journey;
    const byStepNumber = new Map<number, Step[]>();
    for (const step of journey.steps) {
      const group = byStepNumber.get(step.stepNumber) ?? [];
      group.push(step);
      byStepNumber.set(step.stepNumber, group);
    }
    const groups = [...byStepNumber.entries()]
      .sort(([left], [right]) => left - right)
      .map(([, group]) => group);
    const completedGroupIndex = groups.findIndex(
      (group, index) => group.length > 1 && index < groups.length - 1,
    );
    if (completedGroupIndex < 0) continue;

    for (const step of journey.steps) {
      const resourceResponse = await page.request.get(`/api/resources/${step.resourceId}`);
      if (resourceResponse.ok()) {
        return {
          journey,
          groups,
          completedGroupIndex,
          resourceId: step.resourceId,
        };
      }
    }
  }

  throw new Error('No published journey with a multi-row non-final logical step was available');
}

async function write(
  page: Page,
  method: 'post' | 'put',
  path: string,
  data?: unknown,
) {
  const response = await page.request[method](path, {
    data,
    headers: { Origin: BASE_URL },
  });
  await expectOk(response, `${method.toUpperCase()} ${path}`);
  return response;
}

async function registerAndLogin(page: Page): Promise<string> {
  const email = `__qa_test_continue_learning_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
  const registerResponse = await page.request.post('/api/auth/register', {
    data: { email, password: PASSWORD },
    headers: { Origin: BASE_URL },
  });
  await expectOk(registerResponse, 'register QA user');
  const userId = ((await registerResponse.json()) as { id: string }).id;
  await write(page, 'post', '/api/auth/local/login', {
    email,
    password: PASSWORD,
  });
  return userId;
}

test.describe.serial('Continue Learning permanent journey', () => {
  test.setTimeout(120_000);

  let qaUserId: string | null = null;
  let qaJourneyId: number | null = null;

  test.afterEach(async () => {
    if (qaUserId) {
      const userId = qaUserId;
      qaUserId = null;

      // Audit rows use SET NULL on user deletion, so remove them first while
      // the QA actor is still identifiable. Progress and interactions cascade
      // with the user. Session JSON has no FK and needs targeted cleanup.
      await db.delete(resourceAuditLog).where(eq(resourceAuditLog.performedBy, userId));
      await db.delete(sessions).where(
        sql`${sessions.sess}::text LIKE ${`%${userId}%`}`,
      );
      await db.delete(users).where(eq(users.id, userId));

      const [remainingUser, remainingSession, remainingAudit] = await Promise.all([
        db.select({ id: users.id }).from(users).where(eq(users.id, userId)),
        db.select({ sid: sessions.sid }).from(sessions).where(
          sql`${sessions.sess}::text LIKE ${`%${userId}%`}`,
        ),
        db.select({ id: resourceAuditLog.id }).from(resourceAuditLog).where(
          eq(resourceAuditLog.performedBy, userId),
        ),
      ]);
      expect(remainingUser).toHaveLength(0);
      expect(remainingSession).toHaveLength(0);
      expect(remainingAudit).toHaveLength(0);
    }

    if (qaJourneyId) {
      const journeyId = qaJourneyId;
      qaJourneyId = null;
      await db.delete(learningJourneys).where(eq(learningJourneys.id, journeyId));
      const remainingJourney = await db
        .select({ id: learningJourneys.id })
        .from(learningJourneys)
        .where(eq(learningJourneys.id, journeyId));
      expect(remainingJourney).toHaveLength(0);
    }
  });

  test.afterAll(async () => {
    await pool.end();
  });

  test('deduplicates resources, resumes the next grouped step, and records a milestone', async ({
    page,
  }) => {
    const privateSummaryRequests: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/user/continue-learning') {
        privateSummaryRequests.push(request.url());
      }
    });

    await page.goto('/continue-learning');
    await expect(page.getByTestId('continue-learning-sign-in')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
    await expect(page).toHaveTitle('Continue Learning — Awesome Video');
    await expect(
      page.getByRole('navigation', { name: 'breadcrumb' }),
    ).toContainText('Continue Learning');
    expect(privateSummaryRequests).toHaveLength(0);

    qaUserId = await registerAndLogin(page);

    await page.goto('/continue-learning');
    await expect(page.getByRole('heading', { level: 1, name: 'Continue Learning' })).toBeVisible();
    await expect(page.getByTestId('continue-learning-empty')).toBeVisible();

    const { journey, groups, completedGroupIndex, resourceId } =
      await findGroupedJourney(page);

    await write(page, 'post', `/api/journeys/${journey.id}/start`);

    // Complete every row in each logical group through the selected multi-row
    // group. The next incomplete logical step must be the following stepNumber.
    for (const group of groups.slice(0, completedGroupIndex + 1)) {
      await write(page, 'put', `/api/journeys/${journey.id}/progress`, {
        stepIds: group.map((step) => step.id),
        completed: true,
      });
    }

    // Two real page opens produce two view events in storage but one dashboard
    // card because the summary deduplicates at the query boundary.
    for (let visit = 0; visit < 2; visit += 1) {
      const interaction = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === '/api/interactions' &&
          response.request().method() === 'POST',
      );
      await page.goto(`/resource/${resourceId}`);
      expect((await interaction).status()).toBe(201);
    }

    await page.goto('/continue-learning');
    const activeCard = page.getByTestId(`card-active-journey-${journey.id}`);
    await expect(activeCard).toBeVisible();

    const expectedPercent = Math.round(
      ((completedGroupIndex + 1) / groups.length) * 100,
    );
    await expect(
      page.getByTestId(`progress-active-journey-${journey.id}`),
    ).toHaveAttribute(
      'aria-label',
      `${journey.title} progress: ${expectedPercent}%`,
    );

    const nextGroup = groups[completedGroupIndex + 1];
    await expect(activeCard).toContainText(nextGroup[0].title);
    await expect(
      page.getByTestId(`link-recent-resource-${resourceId}`),
    ).toHaveCount(1);

    // Compact signed-in modules reuse this same summary without duplicating
    // progress state.
    await page.goto('/');
    await expect(page.getByTestId('continue-learning-preview')).toBeVisible();
    await page.goto('/profile');
    await expect(page.getByTestId('continue-learning-preview')).toBeVisible();

    // Reload the dashboard, resume, and verify the exact logical-step anchor is
    // both navigated to and focused for keyboard users.
    await page.goto('/continue-learning');
    await page.reload();
    await page.getByTestId(`button-resume-journey-${journey.id}`).click();
    await expect(page).toHaveURL(
      new RegExp(`/journey/${journey.id}#step-${nextGroup[0].stepNumber}$`),
    );
    await expect(page.locator(`#step-${nextGroup[0].stepNumber}`)).toBeFocused();

    // Complete every remaining logical group. The active card moves to the
    // completed milestones section with an explicit timestamp.
    for (const group of groups.slice(completedGroupIndex + 1)) {
      await write(page, 'put', `/api/journeys/${journey.id}/progress`, {
        stepIds: group.map((step) => step.id),
        completed: true,
      });
    }

    await page.goto('/continue-learning');
    await expect(
      page.getByTestId(`card-active-journey-${journey.id}`),
    ).toHaveCount(0);
    const milestone = page.getByTestId(`card-completed-journey-${journey.id}`);
    await expect(milestone).toBeVisible();
    await expect(milestone).toContainText(/Completed (just now|less than a minute ago)/);
    await expect(milestone).toContainText(
      `${groups.length} logical steps completed`,
    );
  });

  test('keeps mixed and all-optional grouped-step completion consistent', async ({
    page,
  }) => {
    const resourceResult = await pool.query<{ id: number }>(
      `SELECT id FROM resources WHERE status = 'approved' ORDER BY id LIMIT 4`,
    );
    expect(resourceResult.rows).toHaveLength(4);

    const [journey] = await db
      .insert(learningJourneys)
      .values({
        title: `__qa_test_continue_learning_${Date.now()}`,
        description:
          'Permanent end-to-end fixture for grouped required and optional progress semantics.',
        difficulty: 'beginner',
        estimatedDuration: '10 minutes',
        category: 'Testing',
        status: 'published',
      })
      .returning({ id: learningJourneys.id, title: learningJourneys.title });
    qaJourneyId = journey.id;

    const insertedSteps = await db
      .insert(journeySteps)
      .values([
        {
          journeyId: journey.id,
          resourceId: resourceResult.rows[0].id,
          stepNumber: 1,
          title: 'Mixed logical step',
          description: 'One required row and one optional row.',
          isOptional: false,
        },
        {
          journeyId: journey.id,
          resourceId: resourceResult.rows[1].id,
          stepNumber: 1,
          title: 'Mixed logical step',
          description: 'One required row and one optional row.',
          isOptional: true,
        },
        {
          journeyId: journey.id,
          resourceId: resourceResult.rows[2].id,
          stepNumber: 2,
          title: 'All-optional logical step',
          description: 'Both rows must be complete under the fallback rule.',
          isOptional: true,
        },
        {
          journeyId: journey.id,
          resourceId: resourceResult.rows[3].id,
          stepNumber: 2,
          title: 'All-optional logical step',
          description: 'Both rows must be complete under the fallback rule.',
          isOptional: true,
        },
      ])
      .returning({
        id: journeySteps.id,
        stepNumber: journeySteps.stepNumber,
        isOptional: journeySteps.isOptional,
      });

    qaUserId = await registerAndLogin(page);
    await write(page, 'post', `/api/journeys/${journey.id}/start`);

    const requiredMixedRow = insertedSteps.find(
      (step) => step.stepNumber === 1 && !step.isOptional,
    )!;
    const allOptionalRows = insertedSteps.filter(
      (step) => step.stepNumber === 2,
    );

    // The required row completes the mixed group without its optional sibling.
    await write(page, 'put', `/api/journeys/${journey.id}/progress`, {
      stepIds: [requiredMixedRow.id],
      completed: true,
    });
    await page.goto(`/journey/${journey.id}`);
    await expect(page.getByTestId('button-uncomplete-step-1')).toBeVisible();
    await expect(page.getByTestId('button-complete-step-2')).toBeVisible();

    await page.goto('/continue-learning');
    const activeCard = page.getByTestId(`card-active-journey-${journey.id}`);
    await expect(activeCard).toContainText('All-optional logical step');
    await expect(
      page.getByTestId(`progress-active-journey-${journey.id}`),
    ).toHaveAttribute('aria-label', `${journey.title} progress: 50%`);

    // An all-optional group falls back to every row, so one of two rows cannot
    // finalize the journey or advance the summary.
    const partialResponse = await write(
      page,
      'put',
      `/api/journeys/${journey.id}/progress`,
      { stepIds: [allOptionalRows[0].id], completed: true },
    );
    expect(
      ((await partialResponse.json()) as { completedAt: string | null }).completedAt,
    ).toBeNull();

    const completeResponse = await write(
      page,
      'put',
      `/api/journeys/${journey.id}/progress`,
      { stepIds: [allOptionalRows[1].id], completed: true },
    );
    expect(
      ((await completeResponse.json()) as { completedAt: string | null }).completedAt,
    ).not.toBeNull();

    await page.goto('/continue-learning');
    await expect(
      page.getByTestId(`card-active-journey-${journey.id}`),
    ).toHaveCount(0);
    await expect(
      page.getByTestId(`card-completed-journey-${journey.id}`),
    ).toContainText('2 logical steps completed');
  });
});