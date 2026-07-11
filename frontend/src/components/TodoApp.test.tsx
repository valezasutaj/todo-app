import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TodoApp } from "./TodoApp";
import { todosApi, type TodoItem } from "../api/todos";

vi.mock("../api/todos", () => ({
  todosApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

const mockedApi = vi.mocked(todosApi);

function makeTodo(overrides: Partial<TodoItem> = {}): TodoItem {
  return { id: 1, title: "Sample todo", isComplete: false, ...overrides };
}

describe("TodoApp", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders todos loaded from the API", async () => {
    mockedApi.getAll.mockResolvedValue([
      makeTodo({ id: 1, title: "Learn .NET" }),
      makeTodo({ id: 2, title: "Learn React" }),
    ]);

    render(<TodoApp />);

    expect(await screen.findByText("Learn .NET")).toBeInTheDocument();
    expect(screen.getByText("Learn React")).toBeInTheDocument();
  });

  it("shows an empty state when there are no todos", async () => {
    mockedApi.getAll.mockResolvedValue([]);

    render(<TodoApp />);

    expect(await screen.findByText(/no todos yet/i)).toBeInTheDocument();
  });

  it("shows an error message when loading fails", async () => {
    mockedApi.getAll.mockRejectedValue(new Error("network down"));

    render(<TodoApp />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not load/i);
  });

  it("creates a new todo and adds it to the list", async () => {
    mockedApi.getAll.mockResolvedValue([]);
    mockedApi.create.mockResolvedValue(makeTodo({ id: 5, title: "Write docs" }));
    const user = userEvent.setup();

    render(<TodoApp />);
    await screen.findByText(/no todos yet/i);

    await user.type(screen.getByLabelText(/new todo title/i), "Write docs");
    await user.click(screen.getByRole("button", { name: /add/i }));

    expect(await screen.findByText("Write docs")).toBeInTheDocument();
    expect(mockedApi.create).toHaveBeenCalledWith("Write docs");
  });

  it("does not submit an empty todo", async () => {
    mockedApi.getAll.mockResolvedValue([]);
    const user = userEvent.setup();

    render(<TodoApp />);
    await screen.findByText(/no todos yet/i);

    await user.click(screen.getByRole("button", { name: /add/i }));

    expect(mockedApi.create).not.toHaveBeenCalled();
  });

  it("toggles completion when the checkbox is clicked", async () => {
    mockedApi.getAll.mockResolvedValue([makeTodo({ id: 1, title: "Learn .NET" })]);
    mockedApi.update.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<TodoApp />);
    const checkbox = await screen.findByRole("checkbox");

    await user.click(checkbox);

    await waitFor(() =>
      expect(mockedApi.update).toHaveBeenCalledWith(1, { isComplete: true }),
    );
    expect(checkbox).toBeChecked();
  });

  it("removes a todo when delete is clicked", async () => {
    mockedApi.getAll.mockResolvedValue([makeTodo({ id: 1, title: "Learn .NET" })]);
    mockedApi.remove.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<TodoApp />);
    await screen.findByText("Learn .NET");

    await user.click(screen.getByRole("button", { name: /delete learn \.net/i }));

    await waitFor(() => expect(mockedApi.remove).toHaveBeenCalledWith(1));
    expect(screen.queryByText("Learn .NET")).not.toBeInTheDocument();
  });
});
