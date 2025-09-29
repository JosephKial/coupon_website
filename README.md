# Family Coupon Manager

A secure, private web application designed to help families organize, search, and manage their household coupon codes.

## Project Structure

```
family-coupon-manager/
├── frontend/           # React TypeScript frontend
├── backend/            # Node.js Express API backend
├── infrastructure/     # Docker, deployment configs
├── docker-compose.dev.yml
└── package.json        # Monorepo root
```

## Development Setup

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Git

### Quick Start

1. Clone the repository
2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
3. Start the development environment:
   ```bash
   npm run dev
   ```

This will start all services:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Available Scripts

- `npm run dev` - Start all services with Docker Compose
- `npm run dev:build` - Rebuild and start all services
- `npm run dev:down` - Stop all services
- `npm run install:all` - Install dependencies for all workspaces
- `npm run build:all` - Build all projects
- `npm run test:all` - Run tests for all projects

### Individual Service Development

- `npm run frontend:dev` - Start only frontend development server
- `npm run backend:dev` - Start only backend development server

## Technology Stack

### Frontend
- React 18 with TypeScript
- Material-UI (MUI) for components
- React Query for API state management
- React Router for navigation
- Vite for build tooling

### Backend
- Node.js with Express.js
- TypeScript
- Prisma ORM with PostgreSQL
- Redis for caching and sessions
- JWT for authentication

### Infrastructure
- Docker & Docker Compose
- PostgreSQL 15
- Redis 7
- Nginx (production)

## Next Steps

After setting up the project structure, the next tasks involve:
1. Setting up the database schema with Prisma
2. Implementing authentication services
3. Building the API endpoints
4. Creating the React frontend components

See the implementation plan in `.kiro/specs/family-coupon-manager/tasks.md` for detailed next steps.