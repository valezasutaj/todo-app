# Todo App

A simple full-stack Todo app:

- **backend/** — ASP.NET Core (.NET 10) minimal API, EF Core + PostgreSQL, xUnit tests
- **frontend/** — React + TypeScript (Vite), Vitest + React Testing Library tests
- **e2e/** — Playwright tests that drive the deployed stack in a real browser

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

### End-to-end tests

The E2E suite is the only layer that uses no mocks at all: a real Chromium instance
loads the deployed frontend, and every assertion travels browser → nginx → API →
Postgres. Several tests reload the page on purpose, to prove state was actually
persisted in the database rather than held in React state.

It always runs against a deployed stack, so bring one up first:

```
docker compose up -d --wait

cd e2e
npm install
BASE_URL=http://localhost:3001 npm test
```

Or containerised, exactly as Jenkins runs it (on the deployment network, addressing
the frontend by service name):

```
docker build -t todoapp-e2e ./e2e
docker run --rm --network todoapp_default --ipc=host \
  -e BASE_URL=http://frontend todoapp-e2e
```

Tests namespace every todo they create with a per-run prefix and delete it afterwards,
so repeated runs do not pollute the deployed database.

## Test layers

| Layer | Where | Count | Mocks |
|---|---|---|---|
| Unit | `backend/tests` (`TodoServiceTests`) | 7 | In-memory database |
| API integration | `backend/tests` (`TodosApiTests`) | 7 | In-memory database, real HTTP pipeline |
| Component | `frontend/src/components` | 7 | API client mocked |
| End-to-end | `e2e/tests` | 7 | None — real browser, real API, real Postgres |

## CI/CD (Jenkins)

The `Jenkinsfile` at the repo root implements a full pipeline with local deployment as the target environment:

1. **Test** — backend and frontend suites run in parallel via `docker build --target test`; JUnit results are published to Jenkins.
2. **Build Images** — backend, frontend and E2E images are built in parallel. Application images are tagged with the build number (`todoapi-backend:<n>`, `todoapp-frontend:<n>`) plus `latest`.
3. **Deploy** — deploys `docker-compose.prod.yml` with `up -d --wait`. Because every service defines a healthcheck, `--wait` blocks until the whole stack reports healthy and fails the stage otherwise, so a half-started deployment can never be reported as success.
4. **Verify Deployment** — smoke-checks `/health`, `/`, and `/api/todos/` on the *published host ports*, which is the one thing the internal healthchecks cannot prove.
5. **E2E Tests** — the Playwright container runs against the freshly deployed stack; results are published as JUnit and traces/screenshots of failures are archived as build artifacts.
6. **Promote Release** — only after all of the above passes is the build number recorded as the last known-good release.

If any stage fails, the `post { failure }` handler **rolls the deployment back** to the last promoted release and waits for it to become healthy again, so a bad build never leaves a broken stack serving traffic.

The job polls the Git repository every ~2 minutes (`pollSCM`), so a push to `master` triggers a new build and deployment automatically.

### Deployment layout

`docker-compose.yml` is for development and can build from source. `docker-compose.prod.yml`
is the deployment definition and never builds — it only runs images the pipeline has
already produced, pinned by tag. The pipeline writes the release descriptor to
`$JENKINS_HOME/deploy/todoapp/`:

| File | Purpose |
|---|---|
| `docker-compose.prod.yml` | The deployment definition |
| `.env` | Which image tag is currently deployed, plus ports and credentials |
| `last-good-tag` | The last release that passed verification and E2E — the rollback target |

That directory lives outside the Jenkins workspace, so it survives `cleanWs()` and remains
available to roll back a *later* build. A rollback is therefore just rewriting `TAG=` in
`.env` and running `up -d --wait` again.

The deployed Postgres port is not published — only the backend reaches the database.
The Postgres volume survives redeployments and rollbacks.

Requires a Jenkins agent with Docker (and Docker Compose) available. A ready-to-use local Jenkins image (Docker CLI + Compose + plugins + auto-created admin user and pipeline job) lives in `jenkins-local/`:

```
cd jenkins-local
docker build -t tema-jenkins .
docker run -d --name tema-jenkins -p 8091:8080 \
  -v tema-jenkins-home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock tema-jenkins
```

Jenkins: http://localhost:8091 (admin / admin123).

The `tema-jenkins-home` volume is what makes the release history durable: `$JENKINS_HOME`
holds the deployment directory described above, so `last-good-tag` — and therefore the
ability to roll back — survives recreating the container. Without it, the first build
after a container restart has nothing to roll back to.

Change `-p 8091:8080` if that port is taken; the pipeline itself does not depend on it.
The job clones from GitHub, so **commit and push before building** — Jenkins builds the
pushed `master`, not your working copy.
