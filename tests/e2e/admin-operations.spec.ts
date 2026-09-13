import { expect, type Download, type Locator, type Page } from "@playwright/test";
import { Buffer } from "node:buffer";
import {
  expectAdminPage,
  expectSeriousA11y,
  task549Test as test,
} from "./task549-admin-fixtures";

const OPS_TABS = [
  { id: "export", heading: /Export Awesome List/i },
  { id: "database", heading: /Database Management/i },
  { id: "github", heading: /GitHub repository/i },
  { id: "linkhealth", heading: /Link Health Summary/i },
] as const;
const RESPONSIVE_WIDTHS = [375, 768, 1024, 1440] as const;

async function readDownload(download: Download) {
  const stream = await download.createReadStream();
  expect(stream, `download ${download.suggestedFilename()} had no body`).not.toBeNull();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
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

async function selectOption(
  page: Page,
  trigger: Locator,
  optionName: string,
) {
  await trigger.click();
  const option = page.getByRole("option", { name: optionName, exact: true });
  await expect(option).toBeVisible();
  await option.click();
  await expect(option).toHaveCount(0);
  await waitForPointerCleanup(page);
}

test.describe("Task549 admin operations tabs", () => {
  test("covers the operations tabs and serious/critical axe findings at four responsive widths", async ({
    task549Page,
  }, testInfo) => {
    for (const width of RESPONSIVE_WIDTHS) {
      await task549Page.setViewportSize({ width, height: 900 });
      for (const tab of OPS_TABS) {
        await task549Page.goto(`/admin#${tab.id}`);
        await expectAdminPage(task549Page);
        await expect(task549Page.getByTestId(`tab-${tab.id}`)).toHaveAttribute(
          "data-state",
          "active",
        );
        await expect(
          tab.id === "github"
            ? task549Page.getByText("GitHub repository", { exact: true }).first()
            : task549Page.getByRole("heading", { name: tab.heading }).first(),
        ).toBeVisible();
        await task549Page.screenshot({
          path: testInfo.outputPath(`operations-${tab.id}-${width}.png`),
          fullPage: true,
        });
        await expectSeriousA11y(task549Page, `${tab.id} at ${width}px`);
      }
    }
  });

  test("downloads real Markdown and JSON exports from the live catalog", async ({
    task549Page,
  }) => {
    await task549Page.setViewportSize({ width: 1440, height: 900 });
    await task549Page.goto("/admin#export");
    await expectAdminPage(task549Page);
    await expect(task549Page.getByRole("heading", { name: /Export Awesome List/i })).toBeVisible();

    const [markdownDownload] = await Promise.all([
      task549Page.waitForEvent("download"),
      task549Page.getByTestId("button-export-markdown").click(),
    ]);
    expect(markdownDownload.suggestedFilename()).toBe("awesome-list.md");
    const markdown = await readDownload(markdownDownload);
    expect(markdown).toMatch(/^#\s+\S+/m);
    expect(markdown.length).toBeGreaterThan(100);

    const [jsonDownload] = await Promise.all([
      task549Page.waitForEvent("download"),
      task549Page.getByTestId("button-export-json").click(),
    ]);
    expect(jsonDownload.suggestedFilename()).toMatch(
      /^awesome-list-backup-\d{4}-\d{2}-\d{2}\.json$/,
    );
    const json = JSON.parse(await readDownload(jsonDownload)) as {
      version?: string;
      data?: { resources?: unknown[] };
    };
    expect(json.version).toBe("1.0.0");
    expect(json.data?.resources).toEqual(expect.any(Array));
  });

  test("cancels export and link-check confirmations without running jobs", async ({
    task549Page,
  }) => {
    await task549Page.goto("/admin#export");
    await expectAdminPage(task549Page);

    await task549Page.getByRole("button", { name: "Run Validation" }).click();
    await expect(task549Page.getByTestId("dialog-confirm-export-job")).toBeVisible();
    await task549Page.getByTestId("button-cancel-export-job").click();
    await expect(task549Page.getByTestId("dialog-confirm-export-job")).toHaveCount(0);
    await waitForPointerCleanup(task549Page);

    await task549Page.getByRole("button", { name: "Run Link Check" }).click();
    await expect(task549Page.getByTestId("dialog-confirm-export-job")).toBeVisible();
    await task549Page.getByTestId("button-cancel-export-job").click();
    await expect(task549Page.getByTestId("dialog-confirm-export-job")).toHaveCount(0);
    await waitForPointerCleanup(task549Page);
  });

  test("cancels database seed and clear/reseed confirmations without mutating data", async ({
    task549Page,
  }) => {
    await task549Page.goto("/admin#database");
    await expectAdminPage(task549Page);

    await task549Page.getByTestId("button-seed-database").click();
    await expect(task549Page.getByTestId("dialog-seed-database")).toBeVisible();
    await task549Page.getByTestId("button-seed-cancel").click();
    await expect(task549Page.getByTestId("dialog-seed-database")).toHaveCount(0);
    await waitForPointerCleanup(task549Page);

    await task549Page.getByTestId("button-clear-reseed").click();
    await expect(task549Page.getByTestId("dialog-clear-reseed")).toBeVisible();
    await expect(task549Page.getByTestId("input-reseed-confirm")).toHaveValue("");
    await task549Page.getByTestId("button-reseed-cancel").click();
    await expect(task549Page.getByTestId("dialog-clear-reseed")).toHaveCount(0);
    await waitForPointerCleanup(task549Page);
  });

  test("cancels GitHub import and export confirmations without starting sync jobs", async ({
    task549Page,
  }) => {
    await task549Page.goto("/admin#github");
    await expectAdminPage(task549Page);
    await expect(
      task549Page.getByText("GitHub repository", { exact: true }),
    ).toBeVisible();

    await task549Page.getByTestId("button-import-github").click();
    await expect(task549Page.getByRole("alertdialog")).toContainText(
      "Import from GitHub?",
    );
    await task549Page.getByTestId("button-cancel-sync-action").click();
    await expect(task549Page.getByTestId("button-confirm-sync-action")).toHaveCount(0);
    await waitForPointerCleanup(task549Page);

    await task549Page.getByTestId("button-export-github").click();
    await expect(task549Page.getByRole("alertdialog")).toContainText(
      "Export to GitHub?",
    );
    await task549Page.getByTestId("button-cancel-sync-action").click();
    await expect(task549Page.getByTestId("button-confirm-sync-action")).toHaveCount(0);
    await waitForPointerCleanup(task549Page);
  });

  test("cancels the link-health confirmation without starting a scan", async ({
    task549Page,
  }) => {
    await task549Page.goto("/admin#linkhealth");
    await expectAdminPage(task549Page);
    await expect(
      task549Page.getByRole("heading", { name: /Link Health Summary/i }),
    ).toBeVisible();

    await task549Page
      .getByRole("button", { name: /Run (?:Check Now|Link Check)/i })
      .click();
    await expect(task549Page.getByTestId("dialog-confirm-link-check")).toBeVisible();
    await task549Page.getByTestId("button-cancel-link-check").click();
    await expect(task549Page.getByTestId("dialog-confirm-link-check")).toHaveCount(0);
    await waitForPointerCleanup(task549Page);
  });

  test("matches live link-health filter counts, including DNS failures", async ({
    task549Page,
  }) => {
    await task549Page.goto("/admin#linkhealth");
    await expectAdminPage(task549Page);

    // Use the authenticated page session rather than APIRequestContext. The
    // parity auth contract supplies Clerk credentials to the browser page.
    const liveResponse = await task549Page.evaluate(async () => {
      const response = await fetch("/api/admin/link-health/broken-links", {
        credentials: "include",
        headers: { accept: "application/json" },
      });
      return {
        ok: response.ok,
        status: response.status,
        body: await response.json().catch(() => null),
      };
    });
    expect(
      liveResponse.ok,
      `live link-health request failed: ${liveResponse.status}`,
    ).toBeTruthy();
    const checks = Array.isArray(liveResponse.body?.checks)
      ? (liveResponse.body.checks as Array<{ status: string }>)
      : [];
    const expectedByFilter: Record<string, number> = {
      "All Issues": checks.length,
      "Broken Links": checks.filter(
        (check) => check.status === "broken" || check.status === "dns_failure",
      ).length,
      Timeouts: checks.filter((check) => check.status === "timeout").length,
      Redirects: checks.filter((check) => check.status === "redirect").length,
      "Suspect (takeover/parked)": checks.filter(
        (check) => check.status === "suspect",
      ).length,
    };

    const filter = task549Page.getByRole("combobox", {
      name: "Filter by link status",
    });
    const table = task549Page.getByTestId("scroller-link-health-table");
    const rows = table.locator("tbody tr");
    for (const [label, expected] of Object.entries(expectedByFilter)) {
      if (label !== "All Issues") {
        await selectOption(task549Page, filter, label);
      }
      await expect(table).toHaveCount(expected === 0 ? 0 : 1);
      if (expected > 0) {
        await expect(rows).toHaveCount(expected);
      }
    }
  });
});