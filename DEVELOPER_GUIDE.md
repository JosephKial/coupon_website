# Developer Guide

## Table of Contents
- [Getting Started](#getting-started)
- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Standards](#code-standards)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)

## Getting Started

The Family Coupon Manager is a full-stack web application built with React (frontend) and Node.js/Express (backend), using PostgreSQL for data storage and Redis for caching.

### Prerequisites

- **Node.js** 18+ and npm
- **Docker** and Docker Compose
- **Git**
- **Code Editor** (VS Code recommended)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd family-coupon-manager
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install backend dependencies
   cd backend && npm install && cd ..
   
   # Install frontend dependencies
   cd frontend && npm install && cd ..
   ```

3. **Set up environment variables**
   ```bash
   # Copy environment templates
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp backend/.env.test.example backend/.env.test
   ```

4. **Start development environment**
   ```bash
   # Start all services with Docker Compose
   docker-compose -f docker-compose.dev.yml up -d
   
   # Run database migrations
   cd backend && npm run migrate && cd ..
   
   # Seed the database (optional)
   cd backend && npm run seed && cd ..
   ```

5. **Start development servers**
   ```bash
   # Start backend (in one terminal)
   cd backend && npm run dev
   
   # Start frontend (in another terminal)
   cd frontend && npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - API Documentation: http://localhost:3000/api-docs

## Development Environment Setup

### Environment Variables

#### Backend (.env)
```bash
# Database
DATABASE_URL="postgresql://coupon_user:coupon_pass@localhost:5432/family_coupons"
DATABASE_URL_TEST="postgresql://coupon_user:coupon_pass@localhost:5432/family_coupons_test"

# Redis
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD="redis_password"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"

# Server
PORT=3000
NODE_ENV=development

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Frontend (.env)
```bash
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME="Family Coupon Manager"
```

### Docker Services

The development environment uses Docker Compose to run:
- **PostgreSQL** (port 5432)
- **Redis** (port 6379)
- **pgAdmin** (port 8080) - Database administration

```bash
# Start services
docker-compose -f docker-compose.dev.yml up -d

# Stop services
docker-compose -f docker-compose.dev.yml down

# View logs
docker-compose -f docker-compose.dev.yml logs -f
```

## Project Structure

```
family-coupon-manager/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic
│   │   ├── repositories/    # Data access layer
│   │   ├── types/           # TypeScript type definitions
│   │   ├── utils/           # Utility functions
│   │   └── server.ts        # Application entry point
│   ├── prisma/              # Database schema and migrations
│   ├── dist/                # Compiled JavaScript (generated)
│   └── package.json
├── frontend/                # React application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API client and services
│   │   ├── contexts/        # React contexts
│   │   ├── types/           # TypeScript type definitions
│   │   └── main.tsx         # Application entry point
│   ├── dist/                # Built application (generated)
│   └── package.json
├── infrastructure/          # Database and deployment configs
├── scripts/                 # Deployment and utility scripts
├── nginx/                   # Nginx configuration
└── docker-compose*.yml      # Docker Compose configurations
```

## API Documentation

### Swagger/OpenAPI Documentation

The API is fully documented using OpenAPI 3.0 specification:

- **Development**: http://localhost:3000/api-docs
- **Specification**: `backend/swagger.yaml`

### Key API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Token refresh
- `GET /api/auth/profile` - Get user profile

#### Coupons
- `GET /api/coupons` - List coupons with filtering
- `POST /api/coupons` - Create new coupon
- `GET /api/coupons/:id` - Get specific coupon
- `PUT /api/coupons/:id` - Update coupon
- `DELETE /api/coupons/:id` - Delete coupon
- `GET /api/coupons/stats` - Get coupon statistics

### Authentication

The API uses JWT (JSON Web Tokens) for authentication:

1. **Access Token**: Short-lived (15 minutes), sent in Authorization header
2. **Refresh Token**: Long-lived (7 days), stored as httpOnly cookie

```javascript
// Example API call with authentication
const response = await fetch('/api/coupons', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

## Development Workflow

### Database Changes

1. **Modify Prisma Schema**
   ```bash
   # Edit backend/prisma/schema.prisma
   ```

2. **Generate Migration**
   ```bash
   cd backend
   npx prisma migrate dev --name describe_your_changes
   ```

3. **Apply Migration**
   ```bash
   npm run migrate
   ```

4. **Update Types**
   ```bash
   npx prisma generate
   ```

### Adding New API Endpoints

1. **Define Types** (`backend/src/types/`)
   ```typescript
   // Add Zod validation schemas and TypeScript interfaces
   ```

2. **Create Service** (`backend/src/services/`)
   ```typescript
   // Implement business logic
   ```

3. **Add Repository Methods** (`backend/src/repositories/`)
   ```typescript
   // Add database operations if needed
   ```

4. **Create Route Handler** (`backend/src/routes/`)
   ```typescript
   // Add Express route handlers
   ```

5. **Add Validation** (`backend/src/middleware/validation.middleware.ts`)
   ```typescript
   // Add validation chains
   ```

6. **Update API Documentation** (`backend/swagger.yaml`)
   ```yaml
   # Add OpenAPI specification
   ```

7. **Write Tests**
   ```typescript
   // Add unit and integration tests
   ```

### Frontend Development

1. **Create Components** (`frontend/src/components/`)
2. **Add Services** (`frontend/src/services/`)
3. **Create Custom Hooks** (`frontend/src/hooks/`)
4. **Add Pages** (`frontend/src/pages/`)
5. **Write Tests** (`frontend/src/**/__tests__/`)

## Testing

### Backend Testing

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.routes.test.ts

# Run integration tests
npm run test:integration
```

### Frontend Testing

```bash
cd frontend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests in headed mode
npm run test:e2e:headed
```

### Test Structure

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test API endpoints and database operations
- **E2E Tests**: Test complete user workflows

### Writing Tests

#### Backend Test Example
```typescript
describe('CouponService', () => {
  it('should create a coupon', async () => {
    const couponData = {
      code: 'TEST123',
      discountType: DiscountType.PERCENTAGE,
      faceValue: 20
    };
    
    const coupon = await couponService.createCoupon(
      couponData, 
      userId, 
      '127.0.0.1', 
      'test-agent'
    );
    
    expect(coupon.code).toBe('TEST123');
    expect(coupon.discountType).toBe(DiscountType.PERCENTAGE);
  });
});
```

#### Frontend Test Example
```typescript
describe('CouponCard', () => {
  it('should display coupon information', () => {
    const coupon = {
      id: '1',
      code: 'TEST123',
      discountType: 'PERCENTAGE',
      faceValue: 20,
      status: 'ACTIVE'
    };
    
    render(<CouponCard coupon={coupon} />);
    
    expect(screen.getByText('TEST123')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
  });
});
```

## Code Standards

### TypeScript

- Use strict TypeScript configuration
- Define interfaces for all data structures
- Use Zod for runtime validation
- Prefer type inference over explicit types when clear

### Code Style

- Use Prettier for code formatting
- Use ESLint for code linting
- Follow conventional commit messages
- Use meaningful variable and function names

### Git Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes and Commit**
   ```bash
   git add .
   git commit -m "feat: add new coupon filtering feature"
   ```

3. **Push and Create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat(auth): add password reset functionality`
- `fix(coupons): resolve expiration date validation issue`
- `docs(api): update authentication documentation`

## Contributing

### Before Contributing

1. **Check Issues**: Look for existing issues or create a new one
2. **Discuss Changes**: For major changes, discuss in an issue first
3. **Fork Repository**: Create your own fork for contributions

### Pull Request Process

1. **Update Documentation**: Update relevant documentation
2. **Add Tests**: Ensure new code is tested
3. **Run Tests**: All tests must pass
4. **Update API Docs**: Update OpenAPI specification if needed
5. **Code Review**: Address feedback from code review

### Code Review Checklist

- [ ] Code follows project standards
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed
- [ ] Accessibility requirements met

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose -f docker-compose.dev.yml ps

# Reset database
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
cd backend && npm run migrate && npm run seed
```

#### Redis Connection Issues
```bash
# Check Redis status
docker-compose -f docker-compose.dev.yml logs redis

# Restart Redis
docker-compose -f docker-compose.dev.yml restart redis
```

#### Port Already in Use
```bash
# Find process using port
lsof -i :3000  # or :5173 for frontend

# Kill process
kill -9 <PID>
```

#### Node Modules Issues
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Debug Mode

#### Backend Debug
```bash
cd backend
npm run dev:debug
```

#### Frontend Debug
```bash
cd frontend
npm run dev -- --debug
```

### Logging

- **Backend**: Logs are written to console and files in `backend/logs/`
- **Frontend**: Use browser developer tools
- **Database**: Check Docker logs for PostgreSQL

### Performance Monitoring

```bash
# Backend performance tests
cd backend
npm run test:performance

# Frontend performance analysis
cd frontend
npm run analyze
```

## Additional Resources

- [React Documentation](https://react.dev/)
- [Express.js Documentation](https://expressjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Material-UI Documentation](https://mui.com/)
- [Docker Documentation](https://docs.docker.com/)

## Getting Help

- **Issues**: Create a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check this guide and API documentation first

---

Happy coding! 🚀