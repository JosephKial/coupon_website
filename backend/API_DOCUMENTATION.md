# Family Coupon Manager API Documentation

## Overview

The Family Coupon Manager API is a RESTful web service that provides secure endpoints for managing family coupon codes. Built with Node.js, Express, and TypeScript, it offers comprehensive authentication, coupon management, and search capabilities.

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

## Authentication

The API uses JWT (JSON Web Tokens) for authentication with a dual-token approach:

- **Access Token**: Short-lived (15 minutes), included in Authorization header
- **Refresh Token**: Long-lived (7 days), stored as httpOnly cookie

### Authentication Flow

1. **Register/Login** → Receive access token + refresh token (cookie)
2. **API Requests** → Include access token in Authorization header
3. **Token Expires** → Use refresh endpoint to get new tokens
4. **Logout** → Invalidate tokens

### Headers

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

## Rate Limiting

- **Registration**: 5 requests per 15 minutes per IP
- **Login**: 10 requests per 15 minutes per IP  
- **General API**: 100 requests per 15 minutes per IP

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional error details (optional)",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (resource already exists)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Authentication Endpoints

### Register User

Create a new user account.

```http
POST /auth/register
```

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "MEMBER"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one lowercase letter
- At least one uppercase letter
- At least one number
- At least one special character (@$!%*?&)

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "MEMBER",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    },
    "message": "User registered successfully"
  }
}
```

### Login User

Authenticate user and receive tokens.

```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "MEMBER",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "lastLoginAt": "2024-01-15T14:30:00Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "message": "Login successful"
  }
}
```

**Response Headers:**
```http
Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

### Logout User

Logout user and invalidate tokens.

```http
POST /auth/logout
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Logout successful"
  }
}
```

### Refresh Token

Get new access token using refresh token.

```http
POST /auth/refresh
Cookie: refreshToken=<refresh_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "message": "Tokens refreshed successfully"
  }
}
```

### Get User Profile

Get authenticated user's profile.

```http
GET /auth/profile
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "MEMBER",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "lastLoginAt": "2024-01-15T14:30:00Z"
    }
  }
}
```

## Coupon Management Endpoints

### Get Coupons

Retrieve coupons with filtering, searching, and pagination.

```http
GET /coupons
Authorization: Bearer <access_token>
```

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `search` | string | Text search across codes and descriptions | `SAVE20` |
| `status` | array | Filter by status (ACTIVE, EXPIRED, USED, DISABLED) | `status=ACTIVE&status=EXPIRED` |
| `discountType` | array | Filter by type (AMOUNT, PERCENTAGE) | `discountType=PERCENTAGE` |
| `minValue` | number | Minimum face value | `10.00` |
| `maxValue` | number | Maximum face value | `100.00` |
| `expirationDateFrom` | datetime | Filter from expiration date | `2024-01-01T00:00:00Z` |
| `expirationDateTo` | datetime | Filter to expiration date | `2024-12-31T23:59:59Z` |
| `tags` | array | Filter by tags | `tags=grocery&tags=restaurant` |
| `page` | integer | Page number (default: 1) | `1` |
| `limit` | integer | Items per page (default: 20, max: 100) | `20` |
| `sortBy` | string | Sort field (createdAt, updatedAt, expirationDate, faceValue, code) | `createdAt` |
| `sortOrder` | string | Sort order (asc, desc) | `desc` |

**Example Request:**
```http
GET /coupons?search=SAVE&status=ACTIVE&discountType=PERCENTAGE&page=1&limit=10&sortBy=createdAt&sortOrder=desc
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "coupons": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "code": "SAVE20",
        "description": "20% off all items",
        "discountType": "PERCENTAGE",
        "faceValue": 20.00,
        "expirationDate": "2024-12-31T23:59:59Z",
        "usageLimit": 100,
        "usageCount": 5,
        "status": "ACTIVE",
        "tags": ["grocery", "discount"],
        "creator": {
          "id": "user-id",
          "firstName": "John",
          "lastName": "Doe"
        },
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "message": "Coupons retrieved successfully"
}
```

### Create Coupon

Create a new coupon.

```http
POST /coupons
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "code": "SAVE20",
  "description": "20% off all items",
  "discountType": "PERCENTAGE",
  "faceValue": 20.00,
  "expirationDate": "2024-12-31T23:59:59Z",
  "usageLimit": 100,
  "tags": ["grocery", "discount"]
}
```

**Field Validation:**

| Field | Required | Type | Constraints |
|-------|----------|------|-------------|
| `code` | Yes | string | 1-100 chars, alphanumeric + hyphens/underscores only |
| `description` | No | string | Max 1000 chars |
| `discountType` | Yes | enum | AMOUNT or PERCENTAGE |
| `faceValue` | Yes | number | Positive, max 999999.99, max 2 decimal places |
| `expirationDate` | No | datetime | Must be in future |
| `usageLimit` | No | integer | Positive, max 1,000,000 |
| `tags` | No | array | Max 10 tags, each 1-50 chars |

**Additional Validation:**
- Percentage discounts must be ≤ 100%
- Coupon codes must be unique per user

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "code": "SAVE20",
    "description": "20% off all items",
    "discountType": "PERCENTAGE",
    "faceValue": 20.00,
    "expirationDate": "2024-12-31T23:59:59Z",
    "usageLimit": 100,
    "usageCount": 0,
    "status": "ACTIVE",
    "tags": ["grocery", "discount"],
    "creator": {
      "id": "user-id",
      "firstName": "John",
      "lastName": "Doe"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "message": "Coupon created successfully"
}
```

### Get Coupon by ID

Retrieve a specific coupon.

```http
GET /coupons/{id}
Authorization: Bearer <access_token>
```

**Path Parameters:**
- `id` (required): Coupon UUID

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "code": "SAVE20",
    "description": "20% off all items",
    "discountType": "PERCENTAGE",
    "faceValue": 20.00,
    "expirationDate": "2024-12-31T23:59:59Z",
    "usageLimit": 100,
    "usageCount": 5,
    "status": "ACTIVE",
    "tags": ["grocery", "discount"],
    "creator": {
      "id": "user-id",
      "firstName": "John",
      "lastName": "Doe"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "message": "Coupon retrieved successfully"
}
```

### Update Coupon

Update an existing coupon. Only the coupon owner can update their coupons.

```http
PUT /coupons/{id}
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Path Parameters:**
- `id` (required): Coupon UUID

**Request Body (all fields optional):**
```json
{
  "code": "SAVE25",
  "description": "Updated description",
  "discountType": "PERCENTAGE",
  "faceValue": 25.00,
  "expirationDate": "2024-12-31T23:59:59Z",
  "usageLimit": 200,
  "status": "ACTIVE",
  "tags": ["updated", "sale"]
}
```

**Special Values:**
- Set `expirationDate` to `null` to remove expiration
- Set `usageLimit` to `null` to remove usage limit

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "code": "SAVE25",
    "description": "Updated description",
    "discountType": "PERCENTAGE",
    "faceValue": 25.00,
    "expirationDate": "2024-12-31T23:59:59Z",
    "usageLimit": 200,
    "usageCount": 5,
    "status": "ACTIVE",
    "tags": ["updated", "sale"],
    "creator": {
      "id": "user-id",
      "firstName": "John",
      "lastName": "Doe"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T11:30:00Z"
  },
  "message": "Coupon updated successfully"
}
```

### Delete Coupon

Permanently delete a coupon. Only the coupon owner can delete their coupons.

```http
DELETE /coupons/{id}
Authorization: Bearer <access_token>
```

**Path Parameters:**
- `id` (required): Coupon UUID

**Response (200):**
```json
{
  "success": true,
  "message": "Coupon deleted successfully"
}
```

### Get Coupon Statistics

Get comprehensive statistics about the user's coupons.

```http
GET /coupons/stats
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalCoupons": 45,
    "activeCoupons": 32,
    "expiredCoupons": 8,
    "usedCoupons": 3,
    "disabledCoupons": 2,
    "totalSavings": 1250.75,
    "averageValue": 27.79,
    "expiringThisWeek": 3,
    "expiringThisMonth": 12
  },
  "message": "Coupon statistics retrieved successfully"
}
```

## Data Models

### User
```typescript
interface User {
  id: string;                    // UUID
  email: string;                 // Unique email address
  firstName: string;             // User's first name
  lastName: string;              // User's last name
  role: 'ADMIN' | 'MEMBER';     // User role
  isActive: boolean;             // Account status
  createdAt: Date;               // Account creation date
  updatedAt: Date;               // Last update date
  lastLoginAt?: Date;            // Last login date (optional)
}
```

### Coupon
```typescript
interface Coupon {
  id: string;                           // UUID
  code: string;                         // Coupon code (unique per user)
  description?: string;                 // Optional description
  discountType: 'AMOUNT' | 'PERCENTAGE'; // Discount type
  faceValue: number;                    // Discount value
  expirationDate?: Date;                // Optional expiration date
  usageLimit?: number;                  // Optional usage limit
  usageCount: number;                   // Current usage count
  status: 'ACTIVE' | 'EXPIRED' | 'USED' | 'DISABLED'; // Coupon status
  tags: string[];                       // Categorization tags
  creator: {                            // Creator information
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: Date;                      // Creation date
  updatedAt: Date;                      // Last update date
}
```

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Request validation failed | 400 |
| `UNAUTHORIZED` | Authentication required | 401 |
| `INVALID_TOKEN` | Invalid or expired token | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `CONFLICT` | Resource already exists | 409 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `INTERNAL_ERROR` | Server error | 500 |

## Security Features

### Input Validation
- All inputs validated using Zod schemas
- SQL injection prevention via Prisma ORM
- XSS prevention through input sanitization
- CSRF protection with SameSite cookies

### Authentication Security
- Argon2id password hashing
- JWT tokens with short expiration
- Secure httpOnly cookies for refresh tokens
- Rate limiting on authentication endpoints

### API Security
- Helmet.js security headers
- CORS configuration
- Request size limits
- Audit logging for sensitive operations

## Examples

### Complete Authentication Flow

```javascript
// 1. Register user
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'john@example.com',
    password: 'SecurePass123!',
    firstName: 'John',
    lastName: 'Doe'
  })
});

// 2. Login user
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'john@example.com',
    password: 'SecurePass123!'
  }),
  credentials: 'include' // Include cookies
});

const { data } = await loginResponse.json();
const accessToken = data.accessToken;

// 3. Make authenticated request
const couponsResponse = await fetch('/api/coupons', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  credentials: 'include'
});

// 4. Handle token expiration
if (couponsResponse.status === 401) {
  // Refresh token
  const refreshResponse = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include'
  });
  
  if (refreshResponse.ok) {
    const refreshData = await refreshResponse.json();
    // Use new access token
    const newAccessToken = refreshData.data.accessToken;
  }
}
```

### Advanced Coupon Search

```javascript
// Search for active percentage coupons expiring this year
const searchParams = new URLSearchParams({
  search: 'SAVE',
  status: 'ACTIVE',
  discountType: 'PERCENTAGE',
  minValue: '10',
  maxValue: '50',
  expirationDateFrom: '2024-01-01T00:00:00Z',
  expirationDateTo: '2024-12-31T23:59:59Z',
  page: '1',
  limit: '20',
  sortBy: 'expirationDate',
  sortOrder: 'asc'
});

const response = await fetch(`/api/coupons?${searchParams}`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const { data } = await response.json();
console.log(`Found ${data.pagination.total} coupons`);
```

## Testing the API

### Using cURL

```bash
# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login user
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'

# Create coupon (replace TOKEN with actual token)
curl -X POST http://localhost:3000/api/coupons \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "code": "TEST20",
    "description": "Test coupon",
    "discountType": "PERCENTAGE",
    "faceValue": 20.00,
    "tags": ["test"]
  }'
```

### Using Postman

1. Import the OpenAPI specification from `backend/swagger.yaml`
2. Set up environment variables for base URL and tokens
3. Use the pre-request scripts for automatic token refresh

## Changelog

### Version 1.0.0
- Initial API release
- User authentication with JWT
- Coupon CRUD operations
- Advanced search and filtering
- Comprehensive validation and security

---

For more information, see the [Developer Guide](../DEVELOPER_GUIDE.md) or the interactive API documentation at `/api-docs` when running the server.