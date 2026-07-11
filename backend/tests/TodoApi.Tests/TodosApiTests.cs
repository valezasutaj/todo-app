using System.Net;
using System.Net.Http.Json;
using TodoApi.Models;

namespace TodoApi.Tests;

public class TodosApiTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public TodosApiTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Health_ReturnsHealthy()
    {
        var response = await _client.GetAsync("/health");

        response.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task GetTodos_ReturnsOk()
    {
        var response = await _client.GetAsync("/api/todos/");

        response.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task CreateThenGetTodo_RoundTrips()
    {
        var createResponse = await _client.PostAsJsonAsync("/api/todos/", new CreateTodoRequest("Write tests"));
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        var created = await createResponse.Content.ReadFromJsonAsync<TodoItem>();
        Assert.NotNull(created);

        var getResponse = await _client.GetAsync($"/api/todos/{created!.Id}");
        getResponse.EnsureSuccessStatusCode();

        var fetched = await getResponse.Content.ReadFromJsonAsync<TodoItem>();
        Assert.Equal("Write tests", fetched!.Title);
    }

    [Fact]
    public async Task CreateTodo_WithBlankTitle_ReturnsBadRequest()
    {
        var response = await _client.PostAsJsonAsync("/api/todos/", new CreateTodoRequest(""));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateTodo_MarksComplete()
    {
        var createResponse = await _client.PostAsJsonAsync("/api/todos/", new CreateTodoRequest("Complete me"));
        var created = await createResponse.Content.ReadFromJsonAsync<TodoItem>();

        var updateResponse = await _client.PutAsJsonAsync(
            $"/api/todos/{created!.Id}", new UpdateTodoRequest(null, true));

        Assert.Equal(HttpStatusCode.NoContent, updateResponse.StatusCode);

        var fetched = await (await _client.GetAsync($"/api/todos/{created.Id}")).Content
            .ReadFromJsonAsync<TodoItem>();
        Assert.True(fetched!.IsComplete);
    }

    [Fact]
    public async Task UpdateTodo_NotFound_Returns404()
    {
        var response = await _client.PutAsJsonAsync("/api/todos/999999", new UpdateTodoRequest("x", null));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task DeleteTodo_RemovesItem()
    {
        var createResponse = await _client.PostAsJsonAsync("/api/todos/", new CreateTodoRequest("Delete me"));
        var created = await createResponse.Content.ReadFromJsonAsync<TodoItem>();

        var deleteResponse = await _client.DeleteAsync($"/api/todos/{created!.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var getResponse = await _client.GetAsync($"/api/todos/{created.Id}");
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
    }
}
