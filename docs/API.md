# API Documentation

Complete API reference for Focal's backend endpoints.

## Base URL

- **Development**: `http://localhost:8787/api`
- **Production**: `https://focal.creative-geek.tech/api`

## Authentication

All endpoints except `/auth/register`, `/auth/login`, `/auth/verify-email`, and `/auth/forgot-password` require authentication via a JWT token sent in an `HttpOnly` cookie. The `/auth/reset-password` endpoint uses a temporary token from the password reset email.

The API enforces rate limiting on certain endpoints to prevent abuse.

## Database Schema

### `users`

| Column        | Type        | Description                 |
| :------------ | :---------- | :-------------------------- |
| `id`          | `TEXT`      | Primary Key, UUID           |
| `email`       | `TEXT`      | Unique, Not Null            |
| `password`    | `TEXT`      | Not Null, bcrypt hashed     |
| `is_verified` | `INTEGER`   | Boolean, `0` or `1`         |
| `created_at`  | `TIMESTAMP` | Default `CURRENT_TIMESTAMP` |

### `expenses`

| Column        | Type        | Description                 |
| :------------ | :---------- | :-------------------------- |
| `id`          | `TEXT`      | Primary Key, UUID           |
| `user_id`     | `TEXT`      | Foreign Key to `users.id`   |
| `amount`      | `REAL`      | Not Null                    |
| `currency`    | `TEXT`      | Default `'USD'`             |
| `quantity`    | `REAL`      | Default `1`                 |
| `category`    | `TEXT`      |                             |
| `description` | `TEXT`      |                             |
| `date`        | `TEXT`      | Not Null, `YYYY-MM-DD`      |
| `created_at`  | `TIMESTAMP` | Default `CURRENT_TIMESTAMP` |

### `api_keys`

This table stores user-specific settings, including their preferred AI provider and default currency.

| Column             | Type        | Description                                               |
| :----------------- | :---------- | :-------------------------------------------------------- |
| `id`               | `TEXT`      | Primary Key, UUID                                         |
| `user_id`          | `TEXT`      | Foreign Key to `users.id`, Unique                         |
| `default_currency` | `TEXT`      | 3-letter ISO code, Default `'USD'`                        |
| `ai_provider`      | `TEXT`      | `'gemini'`, `'openai'`, or `'nvidia'`, Default `'gemini'` |
| `created_at`       | `TIMESTAMP` | Default `CURRENT_TIMESTAMP`                               |

---

## Endpoints

### Authentication

#### Register

`POST /api/auth/register`

Create a new user account. If email verification is enabled, an email will be sent.

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
  "success": true,
  "data": {
    "user": { "id": "user-uuid", "email": "user@example.com" },
    "message": "Registration successful. Please check your email to verify your account."
  }
}
```

#### Login

`POST /api/auth/login`

Authenticate a user and receive a JWT token in an `HttpOnly` cookie.

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
  "success": true,
  "data": {
    "user": { "id": "user-uuid", "email": "user@example.com" }
  }
}
```

#### Verify Email

`GET /api/auth/verify-email?token=<verification-token>`

Verify a user's email address using the token sent to them.

**Response:** `200 OK` with a success message or `400 Bad Request` if the token is invalid/expired.

#### Forgot Password

`POST /api/auth/forgot-password`

Initiate the password reset process. An email with a reset link will be sent.

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Response:** `200 OK`

#### Reset Password

`POST /api/auth/reset-password`

Reset a user's password using a token from the reset email.

**Request Body:**

```json
{
  "token": "reset-token-from-email",
  "password": "new-secure-password"
}
```

**Response:** `200 OK`

### Expenses

#### List Expenses

`GET /api/expenses`

Get all expenses for the authenticated user.

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "expense-uuid",
      "amount": 42.5,
      "currency": "USD"
      /* ... other fields */
    }
  ]
}
```

#### Create Expense

`POST /api/expenses`

Add a new expense.

**Request Body:**

```json
{
  "amount": 42.5,
  "date": "2025-01-04",
  "description": "Lunch",
  "category": "Food",
  "currency": "USD"
}
```

**Response:** `201 Created`

#### Update Expense

`PUT /api/expenses/:id`

Modify an existing expense.

**Request Body:** (partial or full update)

```json
{
  "amount": 45.0,
  "description": "Updated description"
}
```

**Response:** `200 OK`

#### Delete Expense

`DELETE /api/expenses/:id`

Remove an expense.

**Response:** `204 No Content`

### Receipt Processing

#### Process Receipt

`POST /api/receipts/process`

Extract expense data from a receipt image using the user's selected AI provider. This endpoint is rate-limited.

**Request Body:**

```json
{
  "image": "data:image/jpeg;base64,..."
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "merchant": "The Coffee Shop",
    "date": "2025-01-04",
    "total": 12.5,
    "category": "Food & Drink",
    "currency": "USD",
    "lineItems": [{ "description": "Latte", "quantity": 1, "price": 5.0 }]
  }
}
```

#### Get AI Usage Quota

`GET /api/receipts/quota`

Check the user's current AI scan usage and limit for the rolling 24-hour window.

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "limit": 10,
    "used": 3,
    "remaining": 7,
    "resetAt": 1697443200000
  }
}
```

### User Settings

#### Get User Settings

`GET /api/settings`

Get the current user's settings (currency and AI provider).

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "defaultCurrency": "USD",
    "aiProvider": "gemini"
  }
}
```

#### Update User Settings

`PUT /api/settings`

Update the user's settings.

**Request Body:**

```json
{
  "defaultCurrency": "EUR",
  "aiProvider": "openai"
}
```

**Response:** `200 OK`

## Error Responses

The API returns standardized error responses.

### 400 Bad Request

```json
{
  "success": false,
  "error": "Invalid request",
  "details": "Field 'email' is required."
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": "Not found"
}
```

### 429 Too Many Requests

Returned by rate-limited endpoints.

```json
{
  "success": false,
  "error": "Daily AI scan limit reached (10/10 used). Your quota will reset in approximately 23 hours."
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Internal Server Error"
}
```

## Security

- **Authentication**: JWTs are handled via secure, `HttpOnly` cookies.
- **Password Hashing**: Passwords are hashed using `bcrypt`.
- **CORS**: Configured to only allow requests from the frontend origin.
- **Input Validation**: All incoming request bodies are validated using Zod schemas.
- **SQL Injection**: Protected against by using D1's prepared statements.

## Rate Limiting

- The `/api/receipts/process` endpoint is rate-limited to **10 requests per user per 24 hours**.
- The limit is enforced based on the user's ID.
- The rate-limiting state is stored in the D1 database.
