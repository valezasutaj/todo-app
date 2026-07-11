import { useEffect, useState, type FormEvent } from "react";
import { todosApi, type TodoItem } from "../api/todos";
import "./TodoApp.css";

export function TodoApp() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTodos();
  }, []);

  async function loadTodos() {
    try {
      setIsLoading(true);
      setError(null);
      setTodos(await todosApi.getAll());
    } catch {
      setError("Could not load todos. Is the API running?");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title) {
      return;
    }

    try {
      const created = await todosApi.create(title);
      setTodos((current) => [...current, created]);
      setNewTitle("");
    } catch {
      setError("Could not create the todo.");
    }
  }

  async function handleToggle(todo: TodoItem) {
    const isComplete = !todo.isComplete;
    setTodos((current) =>
      current.map((t) => (t.id === todo.id ? { ...t, isComplete } : t)),
    );

    try {
      await todosApi.update(todo.id, { isComplete });
    } catch {
      setError("Could not update the todo.");
      loadTodos();
    }
  }

  async function handleDelete(id: number) {
    const previous = todos;
    setTodos((current) => current.filter((t) => t.id !== id));

    try {
      await todosApi.remove(id);
    } catch {
      setError("Could not delete the todo.");
      setTodos(previous);
    }
  }

  return (
    <main className="todo-app">
      <h1>Todo List</h1>

      <form onSubmit={handleSubmit} className="todo-form">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="What needs to be done?"
          aria-label="New todo title"
        />
        <button type="submit">Add</button>
      </form>

      {error && (
        <p role="alert" className="todo-error">
          {error}
        </p>
      )}

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <ul className="todo-list">
          {todos.map((todo) => (
            <li key={todo.id} className={todo.isComplete ? "completed" : ""}>
              <label>
                <input
                  type="checkbox"
                  checked={todo.isComplete}
                  onChange={() => handleToggle(todo)}
                />
                <span>{todo.title}</span>
              </label>
              <button
                type="button"
                aria-label={`Delete ${todo.title}`}
                onClick={() => handleDelete(todo.id)}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && todos.length === 0 && !error && <p>No todos yet — add one above.</p>}
    </main>
  );
}
