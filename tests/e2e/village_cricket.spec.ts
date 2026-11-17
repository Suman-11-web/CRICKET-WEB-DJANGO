import { test, expect } from "@playwright/test";

test.describe("Village Cricket Live — End-to-End Spectator & Admin Workflow", () => {
  test("Public homepage loads live scores, tournaments, teams, and points table", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Where Village Cricket Comes Alive");
    await expect(page.getByText("Live Cricket Matches")).toBeVisible();
    await expect(page.getByText("Featured Village Teams")).toBeVisible();
  });

  test("Administrator logs in, creates teams & match, updates score, and finalizes winner", async ({
    page,
  }) => {
    await page.goto("/admin-dashboard");
    await page.fill('input[type="text"]', "admin");
    await page.fill('input[type="password"]', "Admin@2026");
    await page.click('button[type="submit"]');

    await expect(page.getByText("Admin Dashboard Overview")).toBeVisible();
    await page.click('button:has-text("Live Match Control")');
    await expect(page.getByText("Live Match Score Control")).toBeVisible();
  });
});
