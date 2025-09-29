# Authentication Implementation

This document describes the authentication system implemented for the Family Coupon Manager backend.

## Overview

The authentication system provides secure user registration, login, logout, token refresh, and profile management functionality. It uses JWT tokens for session management and Redis for token storage.

## Features Implemented

### 1. User Registration (`POST /api/auth/register`)
- **Input validation**: Email format, password strength, required fields
- **Security**: Argon2id password hashing
- **Duplicate prevention**: Email uniqueness validation
- **Audit logging**: Registration events are logged
- **Response**: User profile (without password hash)

### 2. User Login (`POST /api/auth/login`)
- **Credential validation**: Email and password verification
- **Security**: Rate limiting, account status checks
- **Token generation**: JWT access token (15min) and refresh token (7 days)
- **Session management**: Refresh token stored as httpOnly cookie
- **Audit logging**: Login success/failure events

### 3. User Logout (`POST /api/auth/logout`)
- **Authentication required**: Must provide valid access token
- **Token invalidation**: Refresh token removed from Redis
- **Cookie clearing**: Refresh token cookie cleared
- **Audit logging**: Logout events are logged

### 4. Token Refresh (`POST /api/auth/refresh`)
- **Refresh token validation**: Verifies refresh token from cookie
- **New token generation**: Issues new access and refresh tokens
- **Old token invalidation**: Previous refresh token is invalidated
- **Cookie update**: New refresh token set as httpOnly cookie

### 5. User Profile (`GET /api/auth/profile`)
- **Authentication required**: Must provide valid access token
- **User data**: Returns user profile without sensitive information
- **Real-time data**: Fetches current user data from database

## Security Features

### Password Security
- **Argon2id hashing**: Industry-standard password hashing algorithm
- **Password requirements**: Minimum 8 characters, uppercase, lowercase, number, special character
- **No password storage**: Only hashed passwords are stored

### Token Security
- **Short-lived access tokens**: 15-minute expiration
- **Secure refresh tokens**: 7-day expiration, httpOnly cookies
- **Token invalidation**: Refresh tokens can be invalidated on logout
- **Redis storage**: Session management with Redis for scalability

### Request Security
- **Rate limiting**: 5 requests per 15 minutes for auth endpoints
- **Input validation**: Comprehensive validation using Zod schemas
- **CORS protection**: Configured for specific origins
- **Security headers**: Helmet.js for security headers

### Audit Logging
- **Authentication events**: Registration, login, logout tracked
- **Security events**: Failed login attempts logged
- **IP and User-Agent**: Request metadata captured
- **Structured logging**: JSON format for easy analysis

## API Endpoints

### Registration
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

### Logout
```http
POST /api/auth/logout
Authorization: Bearer <access_token>
```

### Token Refresh
```http
POST /api/auth/refresh
Cookie: refreshToken=<refresh_token>
```

### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer <access_token>
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "timestamp": "2023-12-07T10:30:00.000Z"
  }
}
```

Common error codes:
- `VALIDATION_ERROR`: Input validation failed
- `AUTHENTICATION_ERROR`: Invalid credentials or token
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `CONFLICT`: Resource already exists (duplicate email)
- `RATE_LIMIT_EXCEEDED`: Too many requests

## Environment Variables

Required environment variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/database"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-refresh-secret"

# Application
NODE_ENV="development"
PORT="3001"
FRONTEND_URL="http://localhost:3000"
```

## Testing

### Manual Testing
Run the test script to verify endpoints:
```bash
node test-auth-endpoints.js
```

### Unit Tests
Run the test suite:
```bash
npm test
```

## Dependencies

Key dependencies used:
- `express`: Web framework
- `@prisma/client`: Database ORM
- `argon2`: Password hashing
- `jsonwebtoken`: JWT token handling
- `redis`: Session storage
- `zod`: Input validation
- `express-rate-limit`: Rate limiting
- `helmet`: Security headers
- `cors`: CORS handling

## Architecture

The authentication system follows a layered architecture:

1. **Routes Layer** (`/routes/auth.routes.ts`): HTTP endpoint definitions
2. **Service Layer** (`/services/AuthService.ts`): Business logic
3. **Repository Layer** (`/repositories/`): Data access
4. **Middleware Layer** (`/middleware/`): Authentication and error handling
5. **Utilities** (`/utils/`): Logging, Redis client

This separation ensures maintainability, testability, and scalability of the authentication system.