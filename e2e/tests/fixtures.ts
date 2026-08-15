import { test as base, expect, type APIRequestContext } from "@playwright/test";

/**
 * E2E tests run against a real, persistent Postgres, so every todo they create is
 * namespaced with a per-run prefix and removed again afterwards. That keeps repeated
 * pipeline builds from leaving rubbish behind in the deployed database.
 */
export const RUN_PREFIX = `e2e-${process.env.E2E_RUN_ID ?? "local"}`;

async function deleteTodosWithPrefix(request: APIRequestContext, prefix: string) {
  const response = await request.get("/api/todos/");
  if (!response.ok()) {
    return;
  }

  const todos = (await response.json()) as Array<{ id: number; title: string }>;
  for (const todo of todos.filter((t) => t.title.startsWith(prefix))) {
    await request.delete(`/api/todos/${todo.id}`);
  }
}

type Fixtures = {
  /** Builds a title that is unique to this test, so locators never match anything else. */
  todoTitle: (label: string) => string;
  cleanupTodos: void;
};

export const test = base.extend<Fixtures>({
  todoTitle: async ({}, use, testInfo) => {
    const scope = `${RUN_PREFIX}-${testInfo.testId}`;
    await use((label) => `${scope} ${label}`);
  },

  cleanupTodos: [
    async ({ request }, use) => {
      await use();
      await deleteTodosWithPrefix(request, RUN_PREFIX);
    },
    { auto: true },
  ],
});

export { expect };
