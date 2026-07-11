export interface TodoItem {
  id: number;
  title: string;
  isComplete: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const todosApi = {
  async getAll(): Promise<TodoItem[]> {
    const response = await fetch(`${API_BASE_URL}/api/todos/`);
    return handleResponse<TodoItem[]>(response);
  },

  async create(title: string): Promise<TodoItem> {
    const response = await fetch(`${API_BASE_URL}/api/todos/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    return handleResponse<TodoItem>(response);
  },

  async update(id: number, changes: Partial<Pick<TodoItem, "title" | "isComplete">>): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/todos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });
    await handleResponse<void>(response);
  },

  async remove(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/todos/${id}`, {
      method: "DELETE",
    });
    await handleResponse<void>(response);
  },
};
