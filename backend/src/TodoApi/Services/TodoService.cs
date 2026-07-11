using Microsoft.EntityFrameworkCore;
using TodoApi.Data;
using TodoApi.Models;

namespace TodoApi.Services;

public class TodoService : ITodoService
{
    private readonly AppDbContext _db;

    public TodoService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IEnumerable<TodoItem>> GetAllAsync() =>
        await _db.Todos.OrderBy(t => t.Id).ToListAsync();

    public async Task<TodoItem?> GetByIdAsync(int id) =>
        await _db.Todos.FindAsync(id);

    public async Task<TodoItem> CreateAsync(string title)
    {
        var item = new TodoItem { Title = title, IsComplete = false };
        _db.Todos.Add(item);
        await _db.SaveChangesAsync();
        return item;
    }

    public async Task<bool> UpdateAsync(int id, string? title, bool? isComplete)
    {
        var item = await _db.Todos.FindAsync(id);
        if (item is null)
        {
            return false;
        }

        if (title is not null)
        {
            item.Title = title;
        }

        if (isComplete is not null)
        {
            item.IsComplete = isComplete.Value;
        }

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var item = await _db.Todos.FindAsync(id);
        if (item is null)
        {
            return false;
        }

        _db.Todos.Remove(item);
        await _db.SaveChangesAsync();
        return true;
    }
}
