import { expect, type Locator, type Page } from "@playwright/test";
import {
  expectAdminPage,
  expectSeriousA11y,
  task549Test as test,
} from "./task549-admin-fixtures";

type AdminUser = {
  id: string;
  email: string | null;
  role: string;
};

type AuditLog = {
  id: number;
  action: string;
  resourceId: number | null;
  originalResourceId: number | null;
  performedBy: string | null;
  performedByEmail: string | null;
  notes: string | null;
  changes: Record<string, unknown> | null;
};

type ContactSubmission = {
  id: string;
  name: string;
  replyTo: string;
  subject: string;
  message: string;
  createdAt: string;
};

const maskEmail = (email: string) => {
  const at = email.indexOf("@");
  return at > 0 ? `${email[0]}•••${email.slice(at)}` : email;
};

type PageJsonResult = {
  ok: boolean;
  status: number;
  body: unknown;
};

async function pageJson(
  page: Page,
  route: string,
  options: { method?: string; data?: unknown } = {},
): Promise<PageJsonResult> {
  return page.evaluate(
    async ({ route: target, method = "GET", data }) => {
      // Resolve API calls against the page's actual origin.  This keeps the
      // browser's same-origin Origin header intact when BASE_URL is a proxy,
      // forwarded host, or otherwise differs from the configured origin.
      const response = await fetch(new URL(target, window.location.origin), {
        method,
        credentials: "include",
        headers: {
          accept: "application/json",
          ...(data === undefined ? {} : { "content-type": "application/json" }),
        },
        body: data === undefined ? undefined : JSON.stringify(data),
      });
      return {
        ok: response.ok,
        status: response.status,
        body: await response.json().catch(() => null),
      };
    },
    { route, ...options },
  );
}

async function listUsers(page: Page, query: string): Promise<AdminUser[]> {
  const result = await pageJson(
    page,
    `/api/admin/users?limit=100&q=${encodeURIComponent(query)}`,
  );
  expect(
    result.ok,
    `admin user search failed: ${result.status} ${JSON.stringify(result.body)}`,
  ).toBeTruthy();
  return (result.body as { users?: AdminUser[] } | null)?.users ?? [];
}

async function getRole(page: Page, email: string) {
  const users = await listUsers(page, email);
  return users.find((user) => user.email === email)?.role;
}

async function waitForPointerCleanup(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(
          () => document.body.style.pointerEvents || "auto",
        ),
      { timeout: 10_000 },
    )
    .toBe("auto");
}

async function dismissToast(page: Page, title: string) {
  const toast = page
    .getByRole("region", { name: /Notifications/i })
    .locator('li[data-state="open"]')
    .filter({ hasText: title })
    .last();
  await expect(toast).toBeVisible();
  const close = toast.getByRole("button", { name: /Dismiss notification/i });
  // ToastClose is intentionally inert until hover/focus so an invisible
  // close hitbox cannot intercept controls below it.
  await toast.hover();
  await close.click();
  await expect(toast).toHaveCount(0);
  await waitForPointerCleanup(page);
}

async function changeRole(
  page: Page,
  row: Locator,
  nextRole: "user" | "moderator",
) {
  const roleSelect = row.getByRole("combobox");
  await expect(roleSelect).toBeVisible();
  await waitForPointerCleanup(page);
  await roleSelect.click();

  const option = page.getByRole("option", {
    name: nextRole === "moderator" ? "Moderator" : "User",
    exact: true,
  });
  await expect(option).toBeVisible();
  await option.click();
  await expect(option).toHaveCount(0);

  const roleDialog = page.getByRole("alertdialog");
  await expect(roleDialog).toBeVisible();
  await expect(roleDialog).toContainText(nextRole);
  await roleDialog.getByTestId("button-confirm-role-change").click();
  await expect(roleDialog).toHaveCount(0);
  await waitForPointerCleanup(page);

  // The mutation invalidates the users query.  Do not use the old trigger
  // text or an old toast as proof that the refreshed row is ready.
  await dismissToast(page, "Role Updated");
  await expect(roleSelect).toContainText(
    nextRole === "moderator" ? /Moderator/i : /User/i,
  );
}

async function createDisposableAuditResource(page: Page) {
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const result = await pageJson(page, "/api/admin/resources", {
    method: "POST",
    data: {
      title: `Task549 audit resource ${nonce}`,
      url: `https://task549.invalid/audit/${nonce}`,
      description:
        "A disposable resource for Task549 audit filtering and detail coverage.",
      category: "General Tools",
      status: "approved",
    },
  });
  const resource = result.body as {
    id?: number;
  } | null;
  expect(
    result.status,
    `audit fixture creation failed: ${result.status} ${JSON.stringify(resource)}`,
  ).toBe(201);
  expect(resource?.id, "audit fixture did not return a numeric id").toEqual(
    expect.any(Number),
  );
  return resource?.id as number;
}

async function deleteDisposableResource(page: Page, resourceId: number) {
  const result = await pageJson(page, `/api/admin/resources/${resourceId}`, {
    method: "DELETE",
  });
  if (!result.ok && result.status !== 404) {
    const verify = await pageJson(page, `/api/resources/${resourceId}`);
    if (verify.status !== 404) {
      throw new Error(
        `Task549 audit fixture ${resourceId} was not removed: ` +
          `${result.status} ${JSON.stringify(result.body)}`,
      );
    }
  }
}

test.describe("Task549 admin Users and Audit tabs", () => {
  test("Users changes the role of a disposable second account and restores it", async ({
    task549Admin,
    task549Secondary,
    task549Page,
  }) => {
    const secondaryId = task549Secondary.localUserId;
    expect(secondaryId, "secondary Clerk identity has no numeric local id").toMatch(
      /^\d+$/,
    );
    const secondaryEmail = task549Secondary.email;
    await task549Page.goto("/admin#users");
    await expectAdminPage(task549Page);
    const initial = await listUsers(task549Page, secondaryEmail);
    expect(initial).toHaveLength(1);
    expect(initial[0]).toMatchObject({
      id: secondaryId,
      email: secondaryEmail,
      role: "user",
    });

    const usersTab = task549Page.getByTestId("tab-users");
    await expect(usersTab).toHaveAttribute("data-state", "active");

    const search = task549Page.getByTestId("input-user-search");
    await search.fill(secondaryEmail);
    const emailCell = task549Page.getByTestId(`text-email-${secondaryId}`);
    await expect(emailCell).toHaveCount(1, { timeout: 10_000 });
    const row = task549Page.locator("tr").filter({ has: emailCell });
    await expect(row).toBeVisible();

    // The table intentionally masks PII. Assert the real DOM serialization,
    // rather than looking for the unmasked email as visible text.
    const masked = maskEmail(secondaryEmail);
    const rowHtml = await row.evaluate((element) => element.outerHTML);
    expect(rowHtml).toContain(masked);
    expect(rowHtml).not.toContain(secondaryEmail);
    await expect(emailCell).toHaveText(masked);

    await changeRole(task549Page, row, "moderator");
    await expect
      .poll(() => getRole(task549Page, secondaryEmail), { timeout: 15_000 })
      .toBe("moderator");
    await expect(row.getByText("moderator", { exact: true })).toBeVisible();

    // Exercise the same real UI path to restore the disposable account before
    // fixture teardown; no shared or pre-existing user is touched.
    await changeRole(task549Page, row, "user");
    await expect
      .poll(() => getRole(task549Page, secondaryEmail), { timeout: 15_000 })
      .toBe("user");
    await expect(row.getByText("user", { exact: true })).toBeVisible();

    // Keep the admin identity in use until all UI assertions have completed;
    // this also proves the role mutation was authorized by the disposable
    // Clerk admin rather than a local-login shortcut.
    expect(await getRole(task549Admin.page, secondaryEmail)).toBe("user");
  });

  test("Audit filters a disposable resource, opens detail, and records kind and featured updates", async ({
    task549Admin,
    task549Page,
  }) => {
    // pageJson uses the browser page's real origin for same-origin API calls;
    // establish that origin before creating the disposable fixture.
    await task549Page.goto("/admin#audit");
    await expectAdminPage(task549Page);

    let resourceId: number | undefined;
    try {
      resourceId = await createDisposableAuditResource(task549Page);

      const kindResult = await pageJson(
        task549Page,
        `/api/admin/resources/${resourceId}/kind`,
        { method: "PATCH", data: { kind: "libraries" } },
      );
      const kindResource = kindResult.body as {
        kind?: string;
      } | null;
      expect(
        kindResult.ok,
        `kind endpoint failed: ${kindResult.status} ${JSON.stringify(kindResource)}`,
      ).toBeTruthy();
      expect(kindResource?.kind).toBe("libraries");

      const featuredResult = await pageJson(
        task549Page,
        `/api/admin/resources/${resourceId}/featured`,
        { method: "PATCH", data: { featured: true } },
      );
      const featuredResource = featuredResult.body as {
        metadata?: Record<string, unknown> | null;
      } | null;
      expect(
        featuredResult.ok,
        `featured endpoint failed: ${featuredResult.status} ${JSON.stringify(featuredResource)}`,
      ).toBeTruthy();
      expect(featuredResource?.metadata?.featured).toBe(true);

      const auditResult = await pageJson(
        task549Page,
        `/api/admin/audit-logs?resourceId=${resourceId}&limit=20`,
      );
      expect(auditResult.ok).toBeTruthy();
      const auditBody = auditResult.body as { logs: AuditLog[] };
      expect(auditBody.logs.length).toBeGreaterThanOrEqual(3);
      expect(
        auditBody.logs.some(
          (log) =>
            log.resourceId === resourceId ||
            log.originalResourceId === resourceId,
        ),
      ).toBeTruthy();
      const resourceAuditLogs = auditBody.logs.filter(
        (log) =>
          log.resourceId === resourceId || log.originalResourceId === resourceId,
      );
      expect(resourceAuditLogs.length).toBeGreaterThanOrEqual(3);
      expect(
        resourceAuditLogs.every(
          (log) =>
            log.performedBy === task549Admin.localUserId ||
            log.performedByEmail === task549Admin.email,
        ),
      ).toBeTruthy();

      await task549Page.goto("/admin#audit");
      await expectAdminPage(task549Page);
      await expect(task549Page.getByTestId("tab-audit")).toHaveAttribute(
        "data-state",
        "active",
      );
      const filter = task549Page.getByTestId("input-audit-resource-id");
      await filter.fill(String(resourceId));
      await filter.press("Enter");

      const rows = task549Page.locator("tbody [data-testid^='row-audit-log-']");
      await expect(rows.first()).toBeVisible({ timeout: 10_000 });
      await expect(
        task549Page.getByText(`#${resourceId}`, { exact: true }).first(),
      ).toBeVisible();

      // The table intentionally renders only the action and masked actor;
      // notes and changes are available from the real detail dialog. Resolve
      // each updated event's row by the id returned by the authenticated API.
      const featuredLog = resourceAuditLogs.find(
        (log) =>
          log.notes === "Resource featured by admin" ||
          log.changes?.featured === true,
      );
      const kindLog = resourceAuditLogs.find(
        (log) =>
          log.notes === "Resource kind set by admin" ||
          log.changes?.kind === "libraries",
      );
      expect(featuredLog, "featured audit event was not returned").toBeDefined();
      expect(kindLog, "kind audit event was not returned").toBeDefined();

      const featuredRow = task549Page.getByTestId(
        `row-audit-log-${featuredLog!.id}`,
      );
      await expect(featuredRow).toHaveCount(1);
      const maskedActor = maskEmail(task549Admin.email);
      const featuredRowHtml = await featuredRow.evaluate(
        (element) => element.outerHTML,
      );
      expect(featuredRowHtml).toContain(maskedActor);
      expect(featuredRowHtml).not.toContain(task549Admin.email);

      await featuredRow.click();
      const auditDetail = task549Page.getByRole("dialog", {
        name: /Audit entry/i,
      });
      await expect(auditDetail).toBeVisible();
      await expect(auditDetail).toContainText(maskedActor);
      await expect(auditDetail).not.toContainText(task549Admin.email);
      const featuredDetailHtml = await auditDetail.evaluate(
        (element) => element.outerHTML,
      );
      expect(featuredDetailHtml).not.toContain(task549Admin.email);
      await expect(
        auditDetail.getByTestId("text-audit-detail-notes"),
      ).toContainText("Resource featured by admin");
      await expect(
        auditDetail.getByTestId("text-audit-detail-changes"),
      ).toContainText('"featured": true');
      await task549Page
        .getByRole("dialog")
        .getByRole("button", { name: /close/i })
        .click();
      await expect(
        task549Page.getByRole("dialog", { name: /Audit entry/i }),
      ).toHaveCount(0);
      await waitForPointerCleanup(task549Page);

      const kindRow = task549Page.getByTestId(
        `row-audit-log-${kindLog!.id}`,
      );
      await expect(kindRow).toHaveCount(1);
      const kindRowHtml = await kindRow.evaluate(
        (element) => element.outerHTML,
      );
      expect(kindRowHtml).toContain(maskedActor);
      expect(kindRowHtml).not.toContain(task549Admin.email);
      await kindRow.click();
      await expect(auditDetail).toBeVisible();
      await expect(auditDetail).toContainText(maskedActor);
      await expect(auditDetail).not.toContainText(task549Admin.email);
      await expect(
        auditDetail.getByTestId("text-audit-detail-notes"),
      ).toContainText("Resource kind set by admin");
      await expect(
        auditDetail.getByTestId("text-audit-detail-changes"),
      ).toContainText('"kind": "libraries"');

      await expectSeriousA11y(task549Page, "Audit detail at 1440px");
    } finally {
      if (resourceId !== undefined) {
        await deleteDisposableResource(task549Page, resourceId);
      }
    }
  });

  test("Audit exposes the contact inbox detail when its endpoint is available", async ({
    task549Page,
  }) => {
    await task549Page.goto("/admin#audit");
    await expectAdminPage(task549Page);

    const contactResult = await pageJson(
      task549Page,
      "/api/admin/contact-submissions?limit=20&offset=0",
    );
    const contactPanel = task549Page.getByTestId("contact-submissions-shell");

    // Deployments without the optional inbox route have an explicit UI state;
    // do not invent a submission or replace the real endpoint with a mock.
    if (contactResult.status === 404) {
      await expect(
        task549Page.getByTestId("alert-contact-submissions-not-found"),
      ).toBeVisible();
      return;
    }

    expect(
      contactResult.ok,
      `contact inbox request failed: ${contactResult.status} ` +
        JSON.stringify(contactResult.body),
    ).toBeTruthy();
    const contactBody = contactResult.body as {
      submissions?: ContactSubmission[];
      total?: number;
    };
    expect(contactBody.submissions).toEqual(expect.any(Array));
    await expect(contactPanel).toBeVisible();

    const submission = contactBody.submissions?.[0];
    if (!submission) {
      await expect(
        task549Page.getByTestId("text-contact-submissions-empty"),
      ).toBeVisible();
      return;
    }

    const row = task549Page.getByTestId(
      `row-contact-submission-${submission.id}`,
    );
    await expect(row).toBeVisible();
    const maskedEmail = maskEmail(submission.replyTo);
    await expect(
      task549Page.getByTestId(`text-contact-email-${submission.id}`),
    ).toHaveText(maskedEmail);
    const rowHtml = await row.evaluate((element) => element.outerHTML);
    expect(rowHtml).toContain(maskedEmail);
    expect(rowHtml).not.toContain(submission.replyTo);

    await row.click();
    const detail = task549Page.getByRole("dialog", {
      name: /Contact submission/i,
    });
    await expect(detail).toBeVisible();
    await expect(
      task549Page.getByTestId("text-contact-detail-name"),
    ).toHaveText(submission.name || "—");
    await expect(
      task549Page.getByTestId("text-contact-detail-email"),
    ).toHaveText(maskedEmail);
    await expect(
      task549Page.getByTestId("text-contact-detail-subject"),
    ).toHaveText(submission.subject || "—");
    await expect(
      task549Page.getByTestId("text-contact-detail-message"),
    ).toHaveText(submission.message || "—");
    await expect(
      task549Page.getByTestId("text-contact-detail-email"),
    ).not.toContainText(submission.replyTo);

    await detail.getByRole("button", { name: /close/i }).click();
    await expect(detail).toHaveCount(0);
    await waitForPointerCleanup(task549Page);
  });

  for (const width of [375, 768, 1024, 1440]) {
    test(`Users and Audit retain serious/critical accessibility at ${width}px`, async ({
      task549Page,
    }, testInfo) => {
      await task549Page.setViewportSize({ width, height: 900 });
      for (const tab of ["users", "audit"]) {
        await task549Page.goto(`/admin#${tab}`);
        await expectAdminPage(task549Page);
        await expect(task549Page.getByTestId(`tab-${tab}`)).toHaveAttribute(
          "data-state",
          "active",
        );
        await task549Page.screenshot({
          path: testInfo.outputPath(`users-audit-${tab}-${width}.png`),
          fullPage: true,
        });
        await expectSeriousA11y(task549Page, `${tab} at ${width}px`);
      }
    });
  }
});