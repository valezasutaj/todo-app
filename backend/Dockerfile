FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY TodoApi.sln .
COPY src/TodoApi/TodoApi.csproj src/TodoApi/
COPY tests/TodoApi.Tests/TodoApi.Tests.csproj tests/TodoApi.Tests/
RUN dotnet restore TodoApi.sln

COPY . .
RUN dotnet build TodoApi.sln -c Release --no-restore

# `docker build --target test` runs the suite in isolation (used by CI).
FROM build AS test
CMD ["dotnet", "test", "TodoApi.sln", "-c", "Release", "--no-build", "--logger", "junit;LogFilePath=/src/test-results/backend-test-results.xml"]

FROM build AS publish
RUN dotnet publish src/TodoApi/TodoApi.csproj -c Release --no-build -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "TodoApi.dll"]
