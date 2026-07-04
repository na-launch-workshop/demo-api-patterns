# REST API Best Practices

## 1. **Resource-Based URLs**

**DO:**
```
GET    /api/v1/authors          # Collection
GET    /api/v1/authors/123      # Single resource
POST   /api/v1/authors          # Create
PUT    /api/v1/authors/123      # Full update
PATCH  /api/v1/authors/123      # Partial update
DELETE /api/v1/authors/123      # Delete
```

**DON'T:**
```
GET  /api/v1/getAuthors
POST /api/v1/createAuthor
GET  /api/v1/author?action=delete&id=123
```

**Rules:**
- Use nouns, not verbs
- Use plural nouns (`/authors`, not `/author`)
- Keep URLs lowercase
- Use hyphens for multi-word resources (`/book-reviews`, not `/bookReviews`)

## 2. **HTTP Methods (Verbs)**

| Method | Purpose | Idempotent | Safe |
|--------|---------|------------|------|
| **GET** | Retrieve resource(s) | ✅ | ✅ |
| **POST** | Create new resource | ❌ | ❌ |
| **PUT** | Replace entire resource | ✅ | ❌ |
| **PATCH** | Partial update | ❌ | ❌ |
| **DELETE** | Remove resource | ✅ | ❌ |

**Key Concepts:**
- **Idempotent** = Multiple identical requests have same effect as single request
- **Safe** = Read-only, no side effects

## 3. **HTTP Status Codes**

### Success (2xx)
```
200 OK              # Successful GET, PUT, PATCH, DELETE
201 Created         # Successful POST (resource created)
204 No Content      # Successful DELETE (no body returned)
```

### Client Errors (4xx)
```
400 Bad Request     # Invalid input/validation error
401 Unauthorized    # Authentication required
403 Forbidden       # Authenticated but not authorized
404 Not Found       # Resource doesn't exist
409 Conflict        # Conflicting state (duplicate key, etc.)
422 Unprocessable   # Validation error (semantic)
429 Too Many Req    # Rate limit exceeded
```

### Server Errors (5xx)
```
500 Internal Error  # Generic server error
503 Service Unavail # Server down/overloaded
```

## 4. **Request & Response Format**

### Consistent Response Structure

**Success:**
```json
{
  "data": { ... },
  "message": "Optional success message"
}
```

**List with Pagination:**
```json
{
  "data": [ ... ],
  "pagination": {
    "total": 1000,
    "limit": 20,
    "offset": 40,
    "hasMore": true
  }
}
```

**Error:**
```json
{
  "error": "ValidationError",
  "message": "Invalid input",
  "errors": [
    {
      "field": "email",
      "message": "Must be valid email"
    }
  ]
}
```

## 5. **Versioning**

**URL Versioning (Recommended):**
```
/api/v1/authors
/api/v2/authors
```

**Header Versioning:**
```
Accept: application/vnd.myapi.v1+json
```

**Why version?** Breaking changes don't break existing clients

## 6. **Filtering, Sorting, Pagination**

```bash
# Filtering
GET /api/v1/books?author=123&year=2024

# Sorting
GET /api/v1/books?sort=title,-publishedDate  # - prefix = descending

# Pagination
GET /api/v1/books?limit=20&offset=40
# OR
GET /api/v1/books?page=3&per_page=20

# Field selection (sparse fieldsets)
GET /api/v1/authors?fields=id,firstname,lastname

# Combined
GET /api/v1/books?author=123&sort=-rating&limit=10&offset=0
```

## 7. **Nested Resources**

```bash
# Get reviews for a specific book
GET /api/v1/books/123/reviews

# Create review for a book
POST /api/v1/books/123/reviews

# Get specific review
GET /api/v1/reviews/456  # Preferred for direct access
```

**Rule:** Max 2 levels deep (`/resource/:id/sub-resource`)

## 8. **Input Validation**

**Always validate:**
- Required fields
- Data types
- Format (email, date, URL)
- Range/length constraints
- Business rules

**Return 400 or 422 with clear error messages:**
```json
{
  "error": "ValidationError",
  "errors": [
    {
      "field": "rating",
      "message": "Rating must be between 1 and 5",
      "value": 10
    }
  ]
}
```

## 9. **Security Best Practices**

### Headers (use Helmet.js)
```javascript
// Security headers
helmet()  // Sets multiple security headers

// CORS
cors({
  origin: ['https://yourdomain.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
})
```

### Authentication
```bash
# Bearer token (JWT)
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# API Key
X-API-Key: your-api-key
```

### Rate Limiting
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### Input Sanitization
- Validate all inputs
- Prevent SQL injection (use parameterized queries)
- Prevent XSS (sanitize HTML)
- Limit payload size

## 10. **Idempotency**

**Idempotent Operations:**
```bash
# Same result no matter how many times called
GET    /api/v1/authors/123  # Always returns same author
PUT    /api/v1/authors/123  # Replaces with same data
DELETE /api/v1/authors/123  # Author deleted once, subsequent calls = 404
```

**Non-Idempotent:**
```bash
POST /api/v1/authors  # Creates new author each time
```

**Idempotency Keys** (for POST):
```bash
POST /api/v1/payments
Idempotency-Key: unique-key-12345

# Retry with same key = same result (prevents duplicate charges)
```

## 11. **HATEOAS (Hypermedia)**

Include links to related resources:

```json
{
  "data": {
    "id": 123,
    "title": "Book Title",
    "author_id": 456
  },
  "links": {
    "self": "/api/v1/books/123",
    "author": "/api/v1/authors/456",
    "reviews": "/api/v1/books/123/reviews"
  }
}
```

## 12. **Caching**

```bash
# Response headers
Cache-Control: public, max-age=3600  # Cache for 1 hour
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"
Last-Modified: Wed, 21 Oct 2024 07:28:00 GMT

# Conditional requests
If-None-Match: "33a64df551425fcc55e4d42a148795d9f25f89d4"
If-Modified-Since: Wed, 21 Oct 2024 07:28:00 GMT
```

## 13. **Compression**

```javascript
import compression from 'compression';

app.use(compression());  // Gzip responses > 1KB
```

## 14. **Health Checks**

```bash
GET /health        # Full health check
GET /health/ready  # Readiness probe (dependencies ready?)
GET /health/live   # Liveness probe (app alive?)
```

```json
{
  "status": "healthy",
  "uptime": 12345,
  "timestamp": "2024-07-04T17:00:00Z",
  "databases": {
    "postgres": "connected",
    "redis": "connected"
  }
}
```

## 15. **Error Handling**

```javascript
// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err);
  
  const status = err.status || 500;
  
  res.status(status).json({
    error: err.name,
    message: err.message,
    // Only in development
    ...(process.env.NODE_ENV !== 'production' && { 
      stack: err.stack 
    })
  });
});
```

## 16. **Logging**

```javascript
// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Use proper logger (Winston, Pino, Bunyan)
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

## 17. **Documentation**

**OpenAPI/Swagger:**
```yaml
openapi: 3.0.0
info:
  title: My API
  version: 1.0.0
paths:
  /api/v1/authors:
    get:
      summary: List all authors
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
      responses:
        '200':
          description: Success
```

**Self-Documenting Root:**
```bash
GET /

{
  "version": "1.0.0",
  "endpoints": {
    "authors": "/api/v1/authors",
    "books": "/api/v1/books"
  }
}
```

## 18. **Performance**

- **Database Connection Pooling** (not new connection per request)
- **Pagination** (never return all records)
- **Field Selection** (return only requested fields)
- **Compression** (gzip)
- **Caching** (Redis, CDN)
- **Async/Await** (non-blocking I/O)
- **Load Balancing** (horizontal scaling)

## 19. **Testing**

```javascript
// Unit tests
describe('GET /api/v1/authors', () => {
  it('should return list of authors', async () => {
    const res = await request(app).get('/api/v1/authors');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });
});

// Integration tests
// Load tests (k6, Artillery)
// Security tests (OWASP ZAP)
```

## 20. **Graceful Shutdown**

```javascript
process.on('SIGTERM', async () => {
  console.log('SIGTERM received');
  
  // Stop accepting new connections
  server.close(async () => {
    // Close database connections
    await db.close();
    
    // Exit
    process.exit(0);
  });
  
  // Force shutdown after timeout
  setTimeout(() => process.exit(1), 10000);
});
```

---

## Summary Checklist

✅ Resource-based URLs with nouns  
✅ Proper HTTP methods and status codes  
✅ API versioning  
✅ Input validation  
✅ Consistent response format  
✅ Pagination, filtering, sorting  
✅ Error handling  
✅ Security (Helmet, CORS, rate limiting)  
✅ Authentication & authorization  
✅ Compression  
✅ Caching headers  
✅ Health checks  
✅ Request logging  
✅ Documentation  
✅ Testing  
✅ Graceful shutdown  

---

## Implementation Example

See the `rest-app/` directory in this repository for a complete implementation of these best practices using Node.js and Express.js.

The demo app demonstrates:
- Multi-database architecture (PostgreSQL, MySQL, SQLite)
- Full CRUD operations
- Input validation with express-validator
- Security middleware (Helmet, CORS)
- Health check endpoints
- Consistent error handling
- Self-documenting API
- Production-ready setup
