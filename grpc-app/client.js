import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_ADDRESS = process.env.GRPC_SERVER || 'localhost:50051';

// Load proto files
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

// Create clients
const authorClient = new protoDescriptor.authors.AuthorService(
  SERVER_ADDRESS,
  grpc.credentials.createInsecure()
);

const bookClient = new protoDescriptor.books.BookService(
  SERVER_ADDRESS,
  grpc.credentials.createInsecure()
);

const reviewClient = new protoDescriptor.reviews.ReviewService(
  SERVER_ADDRESS,
  grpc.credentials.createInsecure()
);

const healthClient = new protoDescriptor.health.HealthService(
  SERVER_ADDRESS,
  grpc.credentials.createInsecure()
);

// Example usage
async function main() {
  console.log('gRPC Client Demo\n');

  // Health check
  console.log('1. Health Check:');
  healthClient.Check({}, (err, response) => {
    if (err) {
      console.error('Health check failed:', err.message);
    } else {
      console.log('Status:', response.status === 1 ? 'SERVING' : 'NOT_SERVING');
      console.log('Databases:', response.databases);
      console.log();
    }

    // List authors
    console.log('2. List Authors:');
    authorClient.ListAuthors({ limit: 5, offset: 0 }, (err, response) => {
      if (err) {
        console.error('ListAuthors failed:', err.message);
      } else {
        console.log(`Found ${response.total} authors (showing first ${response.authors.length}):`);
        response.authors.forEach(author => {
          console.log(`  - ${author.firstname} ${author.lastname} (ID: ${author.id})`);
        });
        console.log();
      }

      // Get author by ID
      console.log('3. Get Author by ID (with books):');
      authorClient.GetAuthor({ id: 1 }, (err, response) => {
        if (err) {
          console.error('GetAuthor failed:', err.message);
        } else {
          console.log(`Author: ${response.firstname} ${response.lastname}`);
          console.log(`Books: ${response.books.length}`);
          response.books.slice(0, 3).forEach(book => {
            console.log(`  - ${book.title}`);
          });
          console.log();
        }

        // Server streaming - Stream authors
        console.log('4. Stream Authors (server streaming):');
        const streamCall = authorClient.StreamAuthors({ batch_size: 10 });
        let count = 0;

        streamCall.on('data', (author) => {
          count++;
          if (count <= 5) {
            console.log(`  Received: ${author.firstname} ${author.lastname}`);
          }
        });

        streamCall.on('end', () => {
          console.log(`  Total streamed: ${count} authors\n`);

          // List books
          console.log('5. List Books:');
          bookClient.ListBooks({ limit: 5, offset: 0 }, (err, response) => {
            if (err) {
              console.error('ListBooks failed:', err.message);
            } else {
              console.log(`Found ${response.total} books (showing first ${response.books.length}):`);
              response.books.forEach(book => {
                console.log(`  - ${book.title} (ID: ${book.id})`);
              });
              console.log();
            }

            // Get reviews for a book
            console.log('6. Get Reviews for Book:');
            reviewClient.GetReviewsByBook({ book_id: 1 }, (err, response) => {
              if (err) {
                console.error('GetReviewsByBook failed:', err.message);
              } else {
                console.log(`Found ${response.total} reviews for book ID 1`);
                response.reviews.slice(0, 3).forEach(review => {
                  console.log(`  - ${review.reviewer_name}: ${review.rating}/5 - "${review.comment}"`);
                });
                console.log();
              }

              console.log('Demo complete!');
              process.exit(0);
            });
          });
        });

        streamCall.on('error', (err) => {
          console.error('Stream error:', err.message);
        });
      });
    });
  });
}

main().catch(err => {
  console.error('Client error:', err);
  process.exit(1);
});
