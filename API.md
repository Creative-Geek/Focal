# API Documentation

Complete API reference for Focal's backend endpoints.

## Base URL

- **Development**: `http://localhost:8787/api`
- **Production**: `https://focal.creative-geek.tech/api`

## Authentication

All endpoints except `/auth/register` and `/auth/login` require authentication via JWT token.

Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,  -- bcrypt hashed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Expenses Table

```sql
CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  quantity REAL DEFAULT 1,
  category TEXT,
  description TEXT,
  date TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### API Keys Table

```sql
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  service TEXT NOT NULL,  -- e.g., 'gemini'
  encrypted_key TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, service)
);
```

## Endpoints

### Authentication

#### Register

Create a new user account.

```http
POST /api/auth/register
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "secure-password"
}
```

**Response:** `201 Created`

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com"
  }
}
```

#### Login

Authenticate and receive a JWT token.

```http
POST /api/auth/login
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "secure-password"
}
```

**Response:** `200 OK`

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com"
  }
}
```

### Expenses

#### List Expenses

Get all expenses for the authenticated user.

```http
GET /api/expenses
```

**Headers:**

```
Authorization: Bearer <token>
```

**Response:** `200 OK`

```json
[
  {
    "id": "expense-uuid",
    "user_id": "user-uuid",
    "amount": 42.5,
    "currency": "USD",
    "quantity": 2,
    "category": "Food",
    "description": "Lunch at restaurant",
    "date": "2025-01-04",
    "created_at": "2025-01-04T20:30:00.000Z"
  }
]
```

#### Create Expense

Add a new expense.

```http
POST /api/expenses
```

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "amount": 42.5,
  "currency": "USD",
  "quantity": 2,
  "category": "Food",
  "description": "Lunch at restaurant",
  "date": "2025-01-04"
}
```

**Response:** `201 Created`

```json
{
  "id": "expense-uuid",
  "user_id": "user-uuid",
  "amount": 42.5,
  "currency": "USD",
  "quantity": 2,
  "category": "Food",
  "description": "Lunch at restaurant",
  "date": "2025-01-04",
  "created_at": "2025-01-04T20:30:00.000Z"
}
```

#### Update Expense

Modify an existing expense.

```http
PUT /api/expenses/:id
```

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "amount": 45.0,
  "category": "Dining",
  "description": "Updated description"
}
```

**Response:** `200 OK`

```json
{
  "id": "expense-uuid",
  "user_id": "user-uuid",
  "amount": 45.0,
  "currency": "USD",
  "quantity": 2,
  "category": "Dining",
  "description": "Updated description",
  "date": "2025-01-04",
  "created_at": "2025-01-04T20:30:00.000Z"
}
```

#### Delete Expense

Remove an expense.

```http
DELETE /api/expenses/:id
```

**Headers:**

```
Authorization: Bearer <token>
```

**Response:** `204 No Content`

### Receipt Scanning

#### Scan Receipt

Extract expense data from a receipt image using AI.

```http
POST /api/receipts/scan
```

**Headers:**

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body:**

```
image: <file> (JPEG, PNG, WebP)
```

**Response:** `200 OK`

```json
{
  "amount": 42.5,
  "currency": "USD",
  "category": "Food",
  "description": "Lunch at restaurant",
  "date": "2025-01-04",
  "quantity": 2
}
```

### API Keys

#### Check if API Key Exists

Check if a user has an API key for a specific service.

```http
GET /api/api-keys/:service
```

**Parameters:**

- `service`: Service name (e.g., "gemini")

**Headers:**

```
Authorization: Bearer <token>
```

**Response:** `200 OK`

```json
{
  "exists": true
}
```

#### Store API Key

Save an encrypted API key for a service.

```http
POST /api/api-keys
```

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "service": "gemini",
  "apiKey": "your-gemini-api-key"
}
```

**Response:** `201 Created`

```json
{
  "message": "API key saved successfully"
}
```

#### Update API Key

Update an existing API key.

```http
PUT /api/api-keys/:service
```

**Parameters:**

- `service`: Service name (e.g., "gemini")

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "apiKey": "new-gemini-api-key"
}
```

**Response:** `200 OK`

```json
{
  "message": "API key updated successfully"
}
```

#### Delete API Key

Remove an API key.

```http
DELETE /api/api-keys/:service
```

**Parameters:**

- `service`: Service name (e.g., "gemini")

**Headers:**

```
Authorization: Bearer <token>
```

**Response:** `204 No Content`

## Error Responses

### 400 Bad Request

```json
{
  "error": "Invalid request data",
  "details": "Email is required"
}
```

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "details": "Invalid or missing token"
}
```

### 404 Not Found

```json
{
  "error": "Not found",
  "details": "Expense not found"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "details": "Database connection failed"
}
```

## Security

- All passwords are hashed with bcrypt (10 salt rounds)
- JWT tokens expire after 7 days
- API keys are encrypted with AES-256-GCM before storage
- SQL injection protection via prepared statements
- CORS configured for trusted domains only
- Input validation with Zod schemas

## Rate Limiting

Currently no rate limiting implemented. Consider implementing for production use.

## Testing

Use tools like:

- **curl**: Command-line HTTP client
- **Postman**: API testing platform
- **Thunder Client**: VS Code extension
- **Insomnia**: API development platform

Example curl request:

```bash
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```
