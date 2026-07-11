using TodoApi.Models;

namespace TodoApi.Services;

public interface ITodoService
{
    Task<IEnumerable<TodoItem>> GetAllAsync();
    Task<TodoItem?> GetByIdAsync(int id);
    Task<TodoItem> CreateAsync(string title);
    Task<bool> UpdateAsync(int id, string? title, bool? isComplete);
    Task<bool> DeleteAsync(int id);
}
