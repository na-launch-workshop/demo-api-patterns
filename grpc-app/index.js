import 'dotenv/config';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';

// Import service implementations
import * as authorService from './services/authorService.js';
import * as bookService from './services/bookService.js';
import * as reviewService from './services/reviewService.js';
import * as healthService from './services/healthService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 50051;

// Proto loader options
const packageDefinition = protoLoader.loadSync(
  [
    path.join(__dirname, 'proto/authors.proto'),
    path.join(__dirname, 'proto/books.proto'),
    path.join(__dirname, 'proto/reviews.proto'),
    path.join(__dirname, 'proto/health.proto')
  ],
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  }
);

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

// Create gRPC server
const server = new grpc.Server();

// Add AuthorService
server.addService(protoDescriptor.authors.AuthorService.service, {
  ListAuthors: authorService.ListAuthors,
  GetAuthor: authorService.GetAuthor,
  CreateAuthor: authorService.CreateAuthor,
  UpdateAuthor: authorService.UpdateAuthor,
  DeleteAuthor: authorService.DeleteAuthor,
  StreamAuthors: authorService.StreamAuthors
});

// Add BookService
server.addService(protoDescriptor.books.BookService.service, {
  ListBooks: bookService.ListBooks,
  GetBook: bookService.GetBook,
  CreateBook: bookService.CreateBook,
  UpdateBook: bookService.UpdateBook,
  DeleteBook: bookService.DeleteBook,
  GetBooksByAuthor: bookService.GetBooksByAuthor
});

// Add ReviewService
server.addService(protoDescriptor.reviews.ReviewService.service, {
  ListReviews: reviewService.ListReviews,
  GetReview: reviewService.GetReview,
  CreateReview: reviewService.CreateReview,
  DeleteReview: reviewService.DeleteReview,
  GetReviewsByBook: reviewService.GetReviewsByBook,
  AddReviews: reviewService.AddReviews
});

// Add HealthService
server.addService(protoDescriptor.health.HealthService.service, {
  Check: healthService.Check,
  Watch: healthService.Watch
});

// Start server
server.bindAsync(
  `0.0.0.0:${PORT}`,
  grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) {
      console.error('Failed to start gRPC server:', err);
      process.exit(1);
    }
    console.log(`gRPC server running on port ${port}`);
    console.log('Services:');
    console.log('  - AuthorService');
    console.log('  - BookService');
    console.log('  - ReviewService');
    console.log('  - HealthService');
  }
);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.tryShutdown(() => {
    console.log('Server shut down');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.tryShutdown(() => {
    console.log('Server shut down');
    process.exit(0);
  });
});
