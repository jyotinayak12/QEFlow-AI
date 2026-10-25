# QEFlow-AI
An integrated platform covering the full QE lifecycle

## Stage 0: local foundations

The frontend and backend remain separate projects under `frontend/` and `backend/`.
The backend is currently a TypeScript/Fastify foundation, reflecting the resolved
Stage 0 stack choice; the architecture document's original Python/FastAPI proposal
is not implemented.

### Run with Docker Compose

1. Copy `.env.example` to `.env` and choose `APP_DATA_MODE=mock` or `APP_DATA_MODE=live`.
2. Start the local services with `docker compose up --build`.
3. Check the backend at `http://localhost:8000/health` and
	`http://localhost:8000/integrations/status`; open the frontend at
	`http://localhost:5173`.

Docker Compose starts PostgreSQL with pgvector, the backend, and the Vite frontend.
Integration adapters are not implemented yet and status is reported honestly as
`not_configured` or `degraded`; configured credentials do not imply a working adapter.

### Run and check separately

Use Node.js 22 or newer. In each of `backend/` and `frontend/`, run `npm ci`, then
`npm run dev` to start that project. Run `npm run check` in each folder for
type-checking, tests, and build validation. Optional integration variables and
their names are listed in `.env.example`; do not commit real credentials.
