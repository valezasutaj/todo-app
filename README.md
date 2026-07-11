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

## CI/CD (Jenkins)

The `Jenkinsfile` at the repo root implements a full pipeline with local deployment as the target environment:

1. **Test** — backend and frontend suites run in parallel via `docker build --target test`; JUnit results are published to Jenkins.
2. **Build Images** — production images are built and tagged with the build number (`todoapi-backend:<n>`, `todoapp-frontend:<n>`) plus `latest`.
3. **Deploy** — the exact images that were just built are deployed with `docker compose -p todoapp up -d`. The stack stays running; each build replaces only the containers whose image changed, and the Postgres volume (data) survives deployments.
4. **Verify Deployment** — the pipeline checks `/health`, `/`, and `/api/todos/` against the live deployment.

The job polls the Git repository every ~2 minutes (`pollSCM`), so a push to `master` triggers a new build and deployment automatically.

Requires a Jenkins agent with Docker (and Docker Compose) available. A ready-to-use local Jenkins image (Docker CLI + Compose + plugins + auto-created admin user and pipeline job) lives in `jenkins-local/`:

```
cd jenkins-local
docker build -t tema-jenkins .
docker run -d --name tema-jenkins -p 8090:8080 \
  -v /var/run/docker.sock:/var/run/docker.sock tema-jenkins
```

Jenkins: http://localhost:8090 (admin / admin123).
