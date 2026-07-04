import express from 'express';
import { body, param, validationResult } from 'express-validator';
import mysqlPool from '../db/mysql.js';

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      errors: errors.array()
    });
  }
  next();
};

// GET /api/v1/books - List all books
router.get('/', async (req, res, next) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const [books] = await mysqlPool.query(
      'SELECT id, title, author_id, synopsis FROM books ORDER BY id LIMIT ? OFFSET ?',
      [Number(limit), Number(offset)]
    );

    const [[{ total }]] = await mysqlPool.query('SELECT COUNT(*) as total FROM books');

    res.json({
      data: books,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset)
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/books/:id - Get book by ID
router.get('/:id',
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const [books] = await mysqlPool.query(
        'SELECT id, title, author_id, synopsis FROM books WHERE id = ?',
        [id]
      );

      if (books.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: `Book with id ${id} not found`
        });
      }

      res.json({ data: books[0] });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/books/:id/reviews - Get reviews for a book
router.get('/:id/reviews',
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      // Check if book exists
      const [books] = await mysqlPool.query('SELECT id FROM books WHERE id = ?', [id]);
      if (books.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: `Book with id ${id} not found`
        });
      }

      // Import SQLite operations (reviews are in SQLite)
      const { dbAll } = await import('../db/sqlite.js');
      const reviews = await dbAll('SELECT * FROM reviews WHERE book_id = ? ORDER BY id', [id]);

      res.json({
        data: reviews,
        bookId: id
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/books - Create new book
router.post('/',
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('author_id').isInt({ min: 1 }).withMessage('Valid author_id is required'),
  body('synopsis').optional().trim(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { title, author_id, synopsis } = req.body;

      const [result] = await mysqlPool.query(
        'INSERT INTO books (title, author_id, synopsis) VALUES (?, ?, ?)',
        [title, author_id, synopsis || null]
      );

      const [newBook] = await mysqlPool.query(
        'SELECT id, title, author_id, synopsis FROM books WHERE id = ?',
        [result.insertId]
      );

      res.status(201).json({
        data: newBook[0],
        message: 'Book created successfully'
      });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/v1/books/:id - Update book
router.put('/:id',
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('author_id').optional().isInt({ min: 1 }).withMessage('Valid author_id is required'),
  body('synopsis').optional().trim(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { title, author_id, synopsis } = req.body;

      // Check if book exists
      const [books] = await mysqlPool.query('SELECT id FROM books WHERE id = ?', [id]);
      if (books.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: `Book with id ${id} not found`
        });
      }

      // Build dynamic update query
      const updates = [];
      const values = [];

      if (title !== undefined) {
        updates.push('title = ?');
        values.push(title);
      }
      if (author_id !== undefined) {
        updates.push('author_id = ?');
        values.push(author_id);
      }
      if (synopsis !== undefined) {
        updates.push('synopsis = ?');
        values.push(synopsis);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'No fields to update'
        });
      }

      values.push(id);
      await mysqlPool.query(
        `UPDATE books SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      const [updatedBook] = await mysqlPool.query(
        'SELECT id, title, author_id, synopsis FROM books WHERE id = ?',
        [id]
      );

      res.json({
        data: updatedBook[0],
        message: 'Book updated successfully'
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/v1/books/:id - Delete book
router.delete('/:id',
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const [result] = await mysqlPool.query('DELETE FROM books WHERE id = ?', [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: `Book with id ${id} not found`
        });
      }

      res.json({
        message: 'Book deleted successfully',
        deletedId: id
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
