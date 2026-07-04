# REST API Demo - Best Practices

A Node.js REST API demonstrating best practices with Express.js, using the same data model as the GraphQL demo.

## Features

### REST Best Practices Implemented

✅ **Resource-based URLs** - `/api/v1/authors`, `/api/v1/books`, `/api/v1/reviews`

✅ **HTTP Methods** - Proper use of GET, POST, PUT, DELETE

✅ **Status Codes** - Semantic HTTP status codes (200, 201, 400, 404, 503, etc.)

✅ **Validation** - Request validation using express-validator

✅ **Error Handling** - Centralized error handling middleware

✅ **Security** - Helmet.js for security headers

✅ **CORS** - Cross-Origin Resource Sharing enabled

✅ **Compression** - Response compression for performance

✅ **Health Checks** - `/health`, `/health/ready`, `/health/live` endpoints

✅ **Pagination** - Query parameters for limit/offset

✅ **Structured Responses** - Consistent JSON response format

## Tech Stack

- **Node.js 20** - Runtime
- **Express.js 4** - Web framework
- **PostgreSQL** - Authors data
- **MySQL** - Books data
- **SQLite** - Reviews data
- **express-validator** - Input validation
- **Helmet** - Security headers
- **CORS** - Cross-origin requests

## Installation

```bash
cd rest-app
npm install
```

## Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials.

## Running Locally

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The API will be available at `http://localhost:3000`

## API Documentation

### Health Endpoints

- `GET /api/v1/health` - Full health check with database status
- `GET /api/v1/health/ready` - Readiness probe
- `GET /api/v1/health/live` - Liveness probe

### Authors (PostgreSQL)

- `GET /api/v1/authors` - List all authors (supports `?limit=N&offset=N`)
- `GET /api/v1/authors/:id` - Get author by ID (includes books)
- `POST /api/v1/authors` - Create new author
- `PUT /api/v1/authors/:id` - Update author
- `DELETE /api/v1/authors/:id` - Delete author

### Books (MySQL)

- `GET /api/v1/books` - List all books (supports `?limit=N&offset=N`)
- `GET /api/v1/books/:id` - Get book by ID
- `GET /api/v1/books/:id/reviews` - Get reviews for a book
- `POST /api/v1/books` - Create new book
- `PUT /api/v1/books/:id` - Update book
- `DELETE /api/v1/books/:id` - Delete book

### Reviews (SQLite)

- `GET /api/v1/reviews` - List all reviews (supports `?limit=N&offset=N`)
- `GET /api/v1/reviews/:id` - Get review by ID
- `POST /api/v1/reviews` - Create new review
- `DELETE /api/v1/reviews/:id` - Delete review

## Sample Requests

### Get all authors

```bash
curl http://localhost:3000/api/v1/authors | jq .
```

### Get author by ID with books

```bash
curl http://localhost:3000/api/v1/authors/1 | jq .
```

### Create a new author

```bash
curl -X POST http://localhost:3000/api/v1/authors \
  -H 'Content-Type: application/json' \
  -d '{
    "firstname": "Jane",
    "lastname": "Austen",
    "birthdate": "1775-12-16",
    "favoriteColor": "green",
    "bio": "English novelist known for romantic fiction"
  }' | jq .
```

### Update an author

```bash
curl -X PUT http://localhost:3000/api/v1/authors/1 \
  -H 'Content-Type: application/json' \
  -d '{
    "bio": "Updated biography"
  }' | jq .
```

### Get all books with pagination

```bash
curl 'http://localhost:3000/api/v1/books?limit=10&offset=0' | jq .
```

### Get book by ID

```bash
curl http://localhost:3000/api/v1/books/1 | jq .
```

### Get reviews for a book

```bash
curl http://localhost:3000/api/v1/books/1/reviews | jq .
```

### Create a new book

```bash
curl -X POST http://localhost:3000/api/v1/books \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "New Book Title",
    "author_id": 1,
    "synopsis": "An exciting new story"
  }' | jq .
```

### Create a new review

```bash
curl -X POST http://localhost:3000/api/v1/reviews \
  -H 'Content-Type: application/json' \
  -d '{
    "book_id": 1,
    "reviewer_name": "Book Lover",
    "rating": 5,
    "comment": "Amazing book!"
  }' | jq .
```

### Delete a review

```bash
curl -X DELETE http://localhost:3000/api/v1/reviews/1 | jq .
```

### Health check

```bash
curl http://localhost:3000/api/v1/health | jq .
```

## Response Formats

### Success Response

```json
{
  "data": { ... },
  "message": "Optional success message"
}
```

### List Response with Pagination

```json
{
  "data": [ ... ],
  "pagination": {
    "total": 100,
    "limit": 10,
    "offset": 0
  }
}
```

### Error Response

```json
{
  "error": "Error Type",
  "message": "Human-readable error message"
}
```

### Validation Error Response

```json
{
  "error": "Validation Error",
  "errors": [
    {
      "field": "firstname",
      "message": "First name is required"
    }
  ]
}
```

## Database Seeding

Populate the databases with sample data:

```bash
npm run seed
```

## Project Structure

```
rest-app/
├── index.js              # Main application entry point
├── package.json          # Dependencies
├── Dockerfile            # Container image
├── .env.example          # Environment variables template
├── db/                   # Database connections
│   ├── postgres.js       # PostgreSQL pool
│   ├── mysql.js          # MySQL pool
│   └── sqlite.js         # SQLite connection
├── routes/               # API route handlers
│   ├── health.js         # Health check endpoints
│   ├── authors.js        # Authors CRUD (PostgreSQL)
│   ├── books.js          # Books CRUD (MySQL)
│   └── reviews.js        # Reviews CRUD (SQLite)
├── scripts/
│   └── seed.js           # Database seeding
├── authors.json          # Sample authors data
├── books.json            # Sample books data
└── reviews.json          # Sample reviews data
```

## Best Practices Demonstrated

1. **RESTful Design** - Resources, HTTP methods, status codes
2. **Layered Architecture** - Routes, database layer separation
3. **Input Validation** - All inputs validated before processing
4. **Error Handling** - Centralized error middleware
5. **Security** - Helmet, CORS, no sensitive data in responses
6. **Performance** - Compression, connection pooling
7. **Observability** - Request logging, health checks
8. **Documentation** - Self-documenting root endpoint
9. **Consistency** - Uniform response formats
10. **Production Ready** - Environment variables, graceful shutdown

## Docker Build

```bash
docker build -t rest-api-demo .
docker run -p 3000:3000 --env-file .env rest-api-demo
```

## OpenShift Deployment

This app can be deployed to OpenShift using the Helm chart in the repository root.

## License

ISC
