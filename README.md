# Todo App

A simple full-stack Todo app:

- **backend/** — ASP.NET Core (.NET 10) minimal API, EF Core + PostgreSQL, xUnit tests
- **frontend/** — React + TypeScript (Vite), Vitest + React Testing Library tests

## Run locally without Docker

Postgres must be reachable at `localhost:5432` (e.g. `docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=tododb postgres:16-alpine`).

```
# backend (http://localhost:5235)
cd backend/src/TodoApi
dotnet run

# frontend (http://localhost:5173), proxies /api to localhost:5235
cd frontend
npm install
npm run dev
```

## Run with Docker Compose

```
docker compose up --build
```

- Frontend: http://localhost:3001
- Backend: http://localhost:5000
- Postgres: localhost:5432

Nginx in the frontend container proxies `/api` to the backend, so the browser only ever talks to one origin.

## Tests

```
# backend
cd backend
dotnet test

# frontend
cd frontend
npm test
```

Both test suites can also run in isolation via Docker, which is what Jenkins uses:

```
docker build --target test -t todoapi-backend-test ./backend
docker run --rm -v "$PWD/backend/test-results:/src/test-results" todoapi-backend-test

docker build --target test -t todoapp-frontend-test ./frontend
docker run --rm -v "$PWD/frontend/test-results:/app/test-results" todoapp-frontend-test
```

Both produce JUnit XML under `test-results/`.

## CI (Jenkins)

The `Jenkinsfile` at the repo root:

1. Runs backend and frontend tests in parallel via `docker build --target test`, publishing JUnit results.
2. Builds the final backend/frontend images.
3. Brings the full stack up with `docker compose` and smoke-tests `/health`, `/`, and `/api/todos/`.

Requires a Jenkins agent with Docker (and Docker Compose) available.
