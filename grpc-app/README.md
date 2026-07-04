# gRPC API Demo - Best Practices

A Node.js gRPC API demonstrating best practices with Protocol Buffers, using the same data model as the REST and GraphQL demos.

## What is gRPC?

**gRPC** (gRPC Remote Procedure Call) is a modern, high-performance RPC framework developed by Google that:

- Uses **HTTP/2** for transport (multiplexing, server push, header compression)
- Uses **Protocol Buffers** for serialization (binary, compact, fast)
- Provides **strongly-typed contracts** via .proto files
- Supports **4 types of communication**:
  - **Unary** (request-response)
  - **Server streaming** (one request, stream of responses)
  - **Client streaming** (stream of requests, one response)
  - **Bidirectional streaming** (stream both ways)
- Auto-generates client/server code for 10+ languages
- Built-in features: deadlines, cancellation, authentication, load balancing

## gRPC vs REST vs GraphQL

| Feature | REST | GraphQL | gRPC |
|---------|------|---------|------|
| Protocol | HTTP/1.1 | HTTP/1.1 | HTTP/2 |
| Format | JSON (text) | JSON (text) | Protobuf (binary) |
| Schema | Optional (OpenAPI) | Required (SDL) | Required (.proto) |
| Streaming | Limited (SSE) | Subscriptions | Full support |
| Browser Support | ✅ Full | ✅ Full | ⚠️ Limited (needs proxy) |
| Performance | Good | Good | Excellent |
| Best For | Public APIs, web | Flexible queries | Microservices, real-time |

## Features Demonstrated

✅ **Protocol Buffers** - Strongly-typed service definitions  
✅ **Unary RPCs** - Standard request-response  
✅ **Server Streaming** - Stream authors, stream books by author  
✅ **Client Streaming** - Batch add reviews  
✅ **Error Handling** - gRPC status codes  
✅ **Health Checks** - Standard health check service  
✅ **Multi-Database** - PostgreSQL, MySQL, SQLite  
✅ **Production Ready** - Graceful shutdown, error handling  

## Tech Stack

- **Node.js 20** - Runtime
- **@grpc/grpc-js** - gRPC implementation
- **@grpc/proto-loader** - Dynamic .proto loading
- **Protocol Buffers** - Interface definition language
- **PostgreSQL** - Authors data
- **MySQL** - Books data
- **SQLite** - Reviews data

## Installation

```bash
cd grpc-app
npm install
```

## Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials.

## Running the Server

```bash
# Production mode
npm start

# Development mode with auto-reload
npm run dev
```

The gRPC server will listen on port `50051`.

## Running the Demo Client

```bash
npm run client
```

This will run through various gRPC calls demonstrating different features.

## Project Structure

```
grpc-app/
├── index.js              # gRPC server
├── client.js             # Demo client
├── package.json          # Dependencies
├── Dockerfile            # Container image
├── .env.example          # Environment template
├── proto/                # Protocol Buffer definitions
│   ├── authors.proto     # Author service
│   ├── books.proto       # Book service
│   ├── reviews.proto     # Review service
│   └── health.proto      # Health check service
├── services/             # Service implementations
│   ├── authorService.js  # Author RPC handlers
│   ├── bookService.js    # Book RPC handlers
│   ├── reviewService.js  # Review RPC handlers
│   └── healthService.js  # Health check handlers
├── db/                   # Database connections
│   ├── postgres.js
│   ├── mysql.js
│   └── sqlite.js
├── scripts/
│   └── seed.js           # Database seeding
├── authors.json          # Sample data
├── books.json
└── reviews.json
```

## Services & RPCs

### AuthorService (PostgreSQL)

**Unary RPCs:**
- `ListAuthors(ListAuthorsRequest) → ListAuthorsResponse` - Get all authors with pagination
- `GetAuthor(GetAuthorRequest) → Author` - Get author by ID with books
- `CreateAuthor(CreateAuthorRequest) → Author` - Create new author
- `UpdateAuthor(UpdateAuthorRequest) → Author` - Update author
- `DeleteAuthor(DeleteAuthorRequest) → DeleteAuthorResponse` - Delete author

**Server Streaming:**
- `StreamAuthors(StreamAuthorsRequest) → stream Author` - Stream all authors

### BookService (MySQL)

**Unary RPCs:**
- `ListBooks(ListBooksRequest) → ListBooksResponse` - Get all books with pagination
- `GetBook(GetBookRequest) → Book` - Get book by ID
- `CreateBook(CreateBookRequest) → Book` - Create new book
- `UpdateBook(UpdateBookRequest) → Book` - Update book
- `DeleteBook(DeleteBookRequest) → DeleteBookResponse` - Delete book

**Server Streaming:**
- `GetBooksByAuthor(GetBooksByAuthorRequest) → stream Book` - Stream books by author

### ReviewService (SQLite)

**Unary RPCs:**
- `ListReviews(ListReviewsRequest) → ListReviewsResponse` - Get all reviews with pagination
- `GetReview(GetReviewRequest) → Review` - Get review by ID
- `CreateReview(CreateReviewRequest) → Review` - Create new review
- `DeleteReview(DeleteReviewRequest) → DeleteReviewResponse` - Delete review
- `GetReviewsByBook(GetReviewsByBookRequest) → ListReviewsResponse` - Get reviews for a book

**Client Streaming:**
- `AddReviews(stream CreateReviewRequest) → AddReviewsResponse` - Batch add multiple reviews

### HealthService

**Unary:**
- `Check(HealthCheckRequest) → HealthCheckResponse` - Health check

**Server Streaming:**
- `Watch(HealthCheckRequest) → stream HealthCheckResponse` - Watch health status

## gRPC Error Codes

gRPC uses standardized status codes (similar to HTTP but more granular):

| Code | Name | Description | HTTP Equivalent |
|------|------|-------------|-----------------|
| 0 | OK | Success | 200 OK |
| 3 | INVALID_ARGUMENT | Client error (bad input) | 400 Bad Request |
| 5 | NOT_FOUND | Resource not found | 404 Not Found |
| 7 | PERMISSION_DENIED | Not authorized | 403 Forbidden |
| 13 | INTERNAL | Server error | 500 Internal Error |
| 14 | UNAVAILABLE | Service unavailable | 503 Service Unavailable |
| 16 | UNAUTHENTICATED | Authentication required | 401 Unauthorized |

## Testing with grpcurl

[grpcurl](https://github.com/fullstorydev/grpcurl) is like `curl` for gRPC:

### Install grpcurl

```bash
# macOS
brew install grpcurl

# Linux
go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest
```

### List Services

```bash
grpcurl -plaintext localhost:50051 list
```

Output:
```
authors.AuthorService
books.BookService
health.HealthService
reviews.ReviewService
```

### Describe a Service

```bash
grpcurl -plaintext localhost:50051 describe authors.AuthorService
```

### Health Check

```bash
grpcurl -plaintext localhost:50051 health.HealthService/Check
```

### List Authors

```bash
grpcurl -plaintext \
  -d '{"limit": 5, "offset": 0}' \
  localhost:50051 authors.AuthorService/ListAuthors
```

### Get Author by ID

```bash
grpcurl -plaintext \
  -d '{"id": 1}' \
  localhost:50051 authors.AuthorService/GetAuthor
```

### Create Author

```bash
grpcurl -plaintext \
  -d '{
    "firstname": "Jane",
    "lastname": "Austen",
    "birthdate": "1775-12-16",
    "favoriteColor": "green",
    "bio": "English novelist"
  }' \
  localhost:50051 authors.AuthorService/CreateAuthor
```

### Update Author

```bash
grpcurl -plaintext \
  -d '{
    "id": 1,
    "bio": "Updated biography"
  }' \
  localhost:50051 authors.AuthorService/UpdateAuthor
```

### Delete Author

```bash
grpcurl -plaintext \
  -d '{"id": 104}' \
  localhost:50051 authors.AuthorService/DeleteAuthor
```

### Stream Authors (Server Streaming)

```bash
grpcurl -plaintext \
  -d '{"batch_size": 10}' \
  localhost:50051 authors.AuthorService/StreamAuthors
```

### List Books

```bash
grpcurl -plaintext \
  -d '{"limit": 5, "offset": 0}' \
  localhost:50051 books.BookService/ListBooks
```

### Get Book by ID

```bash
grpcurl -plaintext \
  -d '{"id": 1}' \
  localhost:50051 books.BookService/GetBook
```

### Create Book

```bash
grpcurl -plaintext \
  -d '{
    "title": "New Book",
    "author_id": 1,
    "synopsis": "A great story"
  }' \
  localhost:50051 books.BookService/CreateBook
```

### Get Books by Author (Server Streaming)

```bash
grpcurl -plaintext \
  -d '{"author_id": 1}' \
  localhost:50051 books.BookService/GetBooksByAuthor
```

### List Reviews

```bash
grpcurl -plaintext \
  -d '{"limit": 5, "offset": 0}' \
  localhost:50051 reviews.ReviewService/ListReviews
```

### Get Reviews for a Book

```bash
grpcurl -plaintext \
  -d '{"book_id": 1}' \
  localhost:50051 reviews.ReviewService/GetReviewsByBook
```

### Create Review

```bash
grpcurl -plaintext \
  -d '{
    "book_id": 1,
    "reviewer_name": "Book Lover",
    "rating": 5,
    "comment": "Amazing book!"
  }' \
  localhost:50051 reviews.ReviewService/CreateReview
```

### Watch Health (Server Streaming)

```bash
grpcurl -plaintext \
  localhost:50051 health.HealthService/Watch
```

Press `Ctrl+C` to stop the stream.

## Using the Node.js Client

The included `client.js` demonstrates how to call gRPC services from JavaScript:

```javascript
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

// Load proto
const packageDefinition = protoLoader.loadSync('proto/authors.proto', {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

// Create client
const client = new protoDescriptor.authors.AuthorService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

// Unary call
client.GetAuthor({ id: 1 }, (err, response) => {
  if (err) {
    console.error('Error:', err.message);
  } else {
    console.log('Author:', response);
  }
});

// Server streaming
const call = client.StreamAuthors({ batch_size: 10 });

call.on('data', (author) => {
  console.log('Received:', author);
});

call.on('end', () => {
  console.log('Stream ended');
});

call.on('error', (err) => {
  console.error('Stream error:', err);
});
```

## Database Seeding

Populate the databases with sample data:

```bash
npm run seed
```

## Protocol Buffers Best Practices

### 1. Field Numbering
- Never reuse field numbers
- Reserve deprecated field numbers
- Use 1-15 for frequently used fields (1-byte encoding)

### 2. Naming Conventions
- Services: PascalCase with "Service" suffix (`AuthorService`)
- RPCs: PascalCase verbs (`GetAuthor`, `ListAuthors`)
- Messages: PascalCase (`CreateAuthorRequest`)
- Fields: snake_case (`author_id`, `reviewer_name`)

### 3. Message Design
- Use separate request/response messages (even if empty)
- Add pagination to list operations
- Include metadata in responses (total count, etc.)

### 4. Versioning
- Add new fields, don't modify existing
- Use reserved keywords for deprecated fields
- Consider new service versions for breaking changes

## When to Use gRPC

### ✅ Great For:
- **Microservice communication** - Fast, efficient, type-safe
- **Real-time streaming** - Server push, bidirectional communication
- **Polyglot systems** - Auto-generate clients in many languages
- **Internal APIs** - Where you control both client and server
- **High-performance needs** - Binary protocol is faster than JSON
- **Mobile apps** - Efficient bandwidth usage

### ❌ Not Ideal For:
- **Browser-based apps** - Limited support (needs gRPC-Web proxy)
- **Public APIs** - Less tooling than REST
- **Simple CRUD** - REST might be simpler
- **Human debugging** - Binary format isn't readable
- **Third-party integrations** - REST is more universal

## Production Considerations

### Security
```javascript
// Use TLS in production
const credentials = grpc.credentials.createSsl(
  fs.readFileSync('ca.pem'),
  fs.readFileSync('key.pem'),
  fs.readFileSync('cert.pem')
);

server.bindAsync('0.0.0.0:50051', credentials, callback);
```

### Load Balancing
gRPC supports client-side load balancing:
```javascript
const client = new AuthorService(
  'dns:///my-service:50051',  // DNS-based
  credentials
);
```

### Interceptors (Middleware)
```javascript
// Logging interceptor
function loggingInterceptor(options, nextCall) {
  return new grpc.InterceptingCall(nextCall(options), {
    start: (metadata, listener, next) => {
      console.log('Starting call:', options.method_definition.path);
      next(metadata, listener);
    }
  });
}
```

### Deadlines
```javascript
// Client sets deadline (timeout)
const deadline = new Date();
deadline.setSeconds(deadline.getSeconds() + 5);

client.GetAuthor(
  { id: 1 },
  { deadline: deadline.getTime() },
  callback
);
```

## Docker Build

```bash
docker build -t grpc-api-demo .
docker run -p 50051:50051 --env-file .env grpc-api-demo
```

## OpenShift Deployment

This app can be deployed to OpenShift using a Helm chart (similar to the GraphQL and REST apps).

## Comparison: Same Operation in All Three APIs

### Get Author with Books - REST
```bash
GET /api/v1/authors/1
```
Response: JSON (text), ~500 bytes

### Get Author with Books - GraphQL
```graphql
query {
  author(id: "1") {
    id
    firstname
    lastname
    books { id title }
  }
}
```
Response: JSON (text), ~400 bytes (only requested fields)

### Get Author with Books - gRPC
```protobuf
GetAuthor(GetAuthorRequest { id: 1 })
```
Response: Protobuf (binary), ~200 bytes (strongly typed, compact)

## Resources

- [gRPC Documentation](https://grpc.io/docs/)
- [Protocol Buffers Guide](https://protobuf.dev/)
- [gRPC Node.js Guide](https://grpc.io/docs/languages/node/)
- [grpcurl Tool](https://github.com/fullstorydev/grpcurl)

## License

ISC
