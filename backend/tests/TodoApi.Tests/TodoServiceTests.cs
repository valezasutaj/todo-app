using Microsoft.EntityFrameworkCore;
using TodoApi.Data;
using TodoApi.Services;

namespace TodoApi.Tests;

public class TodoServiceTests
{
    private static AppDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task GetAllAsync_ReturnsItemsOrderedById()
    {
        await using var db = CreateContext();
        var service = new TodoService(db);
        await service.CreateAsync("Second");
        await service.CreateAsync("Third");

        var items = (await service.GetAllAsync()).ToList();

        Assert.Equal(2, items.Count);
        Assert.True(items[0].Id < items[1].Id);
    }

    [Fact]
    public async Task CreateAsync_PersistsNewTodo()
    {
        await using var db = CreateContext();
        var service = new TodoService(db);

        var created = await service.CreateAsync("Buy milk");

        Assert.True(created.Id > 0);
        Assert.Equal("Buy milk", created.Title);
        Assert.False(created.IsComplete);
        Assert.NotNull(await service.GetByIdAsync(created.Id));
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsNull_WhenNotFound()
    {
        await using var db = CreateContext();
        var service = new TodoService(db);

        var result = await service.GetByIdAsync(999);

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateAsync_UpdatesTitleAndCompletion()
    {
        await using var db = CreateContext();
        var service = new TodoService(db);
        var created = await service.CreateAsync("Original");

        var updated = await service.UpdateAsync(created.Id, "Renamed", true);
        var fetched = await service.GetByIdAsync(created.Id);

        Assert.True(updated);
        Assert.Equal("Renamed", fetched!.Title);
        Assert.True(fetched.IsComplete);
    }

    [Fact]
    public async Task UpdateAsync_ReturnsFalse_WhenNotFound()
    {
        await using var db = CreateContext();
        var service = new TodoService(db);

        var updated = await service.UpdateAsync(999, "Nope", null);

        Assert.False(updated);
    }

    [Fact]
    public async Task DeleteAsync_RemovesExistingItem()
    {
        await using var db = CreateContext();
        var service = new TodoService(db);
        var created = await service.CreateAsync("Temporary");

        var deleted = await service.DeleteAsync(created.Id);

        Assert.True(deleted);
        Assert.Null(await service.GetByIdAsync(created.Id));
    }

    [Fact]
    public async Task DeleteAsync_ReturnsFalse_WhenNotFound()
    {
        await using var db = CreateContext();
        var service = new TodoService(db);

        var deleted = await service.DeleteAsync(999);

        Assert.False(deleted);
    }
}
