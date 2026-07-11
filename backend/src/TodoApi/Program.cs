using Microsoft.EntityFrameworkCore;
using TodoApi.Data;
using TodoApi.Models;
using TodoApi.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

if (!builder.Environment.IsEnvironment("Testing"))
{
    var connectionString = builder.Configuration.GetConnectionString("TodoDb")
        ?? "Host=localhost;Port=5432;Database=tododb;Username=postgres;Password=postgres";

    builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));
}

builder.Services.AddScoped<ITodoService, TodoService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins(
                builder.Configuration["Cors:AllowedOrigin"] ?? "http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

if (!app.Environment.IsEnvironment("Testing"))
{
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.Migrate();

        if (!db.Todos.Any())
        {
            db.Todos.AddRange(
                new TodoItem { Title = "Learn .NET", IsComplete = false },
                new TodoItem { Title = "Learn React", IsComplete = false });
            db.SaveChanges();
        }
    }
}

app.UseCors("Frontend");

app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

var todos = app.MapGroup("/api/todos");

todos.MapGet("/", async (ITodoService service) => Results.Ok(await service.GetAllAsync()));

todos.MapGet("/{id:int}", async (int id, ITodoService service) =>
    await service.GetByIdAsync(id) is { } item ? Results.Ok(item) : Results.NotFound());

todos.MapPost("/", async (CreateTodoRequest request, ITodoService service) =>
{
    if (string.IsNullOrWhiteSpace(request.Title))
    {
        return Results.BadRequest(new { error = "Title is required." });
    }

    var item = await service.CreateAsync(request.Title);
    return Results.Created($"/api/todos/{item.Id}", item);
});

todos.MapPut("/{id:int}", async (int id, UpdateTodoRequest request, ITodoService service) =>
    await service.UpdateAsync(id, request.Title, request.IsComplete) ? Results.NoContent() : Results.NotFound());

todos.MapDelete("/{id:int}", async (int id, ITodoService service) =>
    await service.DeleteAsync(id) ? Results.NoContent() : Results.NotFound());

app.Run();

public partial class Program { }
