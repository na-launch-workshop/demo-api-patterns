import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import authorsRouter from './routes/authors.js';
import booksRouter from './routes/books.js';
import reviewsRouter from './routes/reviews.js';
import healthRouter from './routes/health.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// Enable CORS
app.use(cors());

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/authors', authorsRouter);
app.use('/api/v1/books', booksRouter);
app.use('/api/v1/reviews', reviewsRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'REST API Demo - Best Practices',
    version: '1.0.0',
    endpoints: {
      health: '/api/v1/health',
      authors: '/api/v1/authors',
      books: '/api/v1/books',
      reviews: '/api/v1/reviews'
    },
    documentation: {
      authors: {
        'GET /api/v1/authors': 'List all authors',
        'GET /api/v1/authors/:id': 'Get author by ID',
        'POST /api/v1/authors': 'Create new author',
        'PUT /api/v1/authors/:id': 'Update author',
        'DELETE /api/v1/authors/:id': 'Delete author'
      },
      books: {
        'GET /api/v1/books': 'List all books',
        'GET /api/v1/books/:id': 'Get book by ID',
        'GET /api/v1/books/:id/reviews': 'Get reviews for a book',
        'POST /api/v1/books': 'Create new book',
        'PUT /api/v1/books/:id': 'Update book',
        'DELETE /api/v1/books/:id': 'Delete book'
      },
      reviews: {
        'GET /api/v1/reviews': 'List all reviews',
        'GET /api/v1/reviews/:id': 'Get review by ID',
        'POST /api/v1/reviews': 'Create new review',
        'DELETE /api/v1/reviews/:id': 'Delete review'
      }
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    error: err.name || 'Error',
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`REST API server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API Documentation: http://localhost:${PORT}/`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
