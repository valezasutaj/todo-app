import { expect, test } from "./fixtures";

test.describe("Todo app (deployed stack)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Todo List" })).toBeVisible();
  });

  test("serves the application without a load error", async ({ page }) => {
    // A failing browser -> nginx -> API -> Postgres chain surfaces as this alert.
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.getByText("Loading...")).toHaveCount(0);
  });

  test("creates a todo through the UI and persists it in the database", async ({
    page,
    todoTitle,
  }) => {
    const title = todoTitle("buy milk");

    await page.getByLabel("New todo title").fill(title);
    await page.getByRole("button", { name: "Add" }).click();

    await expect(page.getByText(title)).toBeVisible();

    // The reload is the point: it proves the todo came back from Postgres
    // rather than living only in React state.
    await page.reload();
    await expect(page.getByText(title)).toBeVisible();
  });

  test("marks a todo as complete and the state survives a page reload", async ({
    page,
    todoTitle,
  }) => {
    const title = todoTitle("complete me");

    await page.getByLabel("New todo title").fill(title);
    await page.getByRole("button", { name: "Add" }).click();

    const row = page.getByRole("listitem").filter({ hasText: title });
    await expect(row).toBeVisible();
    await row.getByRole("checkbox").check();

    await page.reload();

    const reloadedRow = page.getByRole("listitem").filter({ hasText: title });
    await expect(reloadedRow.getByRole("checkbox")).toBeChecked();
    await expect(reloadedRow).toHaveClass(/completed/);
  });

  test("deletes a todo and it stays deleted after a reload", async ({ page, todoTitle }) => {
    const title = todoTitle("delete me");

    await page.getByLabel("New todo title").fill(title);
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText(title)).toBeVisible();

    await page.getByRole("button", { name: `Delete ${title}` }).click();
    await expect(page.getByText(title)).toHaveCount(0);

    await page.reload();
    await expect(page.getByText(title)).toHaveCount(0);
  });

  test("rejects an empty title without creating a todo", async ({ page }) => {
    const itemsBefore = await page.getByRole("listitem").count();

    await page.getByRole("button", { name: "Add" }).click();

    await expect(page.getByRole("listitem")).toHaveCount(itemsBefore);
  });

  test("shows todos created directly through the API", async ({ page, request, todoTitle }) => {
    const title = todoTitle("created via api");

    const response = await request.post("/api/todos/", { data: { title } });
    expect(response.status()).toBe(201);

    // Same origin, same database: what the API writes, the browser reads.
    await page.reload();
    await expect(page.getByText(title)).toBeVisible();
  });

  test("exposes the backend through the frontend origin", async ({ request }) => {
    const health = await request.get("/health");
    expect(health.ok()).toBeTruthy();
    expect(await health.json()).toMatchObject({ status: "healthy" });

    const todos = await request.get("/api/todos/");
    expect(todos.ok()).toBeTruthy();
    expect(Array.isArray(await todos.json())).toBeTruthy();
  });
});
