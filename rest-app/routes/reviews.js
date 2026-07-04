import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { dbAll, dbGet, dbRun } from '../db/sqlite.js';

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

// GET /api/v1/reviews - List all reviews
router.get('/', async (req, res, next) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const reviews = await dbAll(
      'SELECT * FROM reviews ORDER BY id LIMIT ? OFFSET ?',
      [Number(limit), Number(offset)]
    );

    const countResult = await dbGet('SELECT COUNT(*) as total FROM reviews');

    res.json({
      data: reviews,
      pagination: {
        total: countResult.total,
        limit: Number(limit),
        offset: Number(offset)
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/reviews/:id - Get review by ID
router.get('/:id',
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const review = await dbGet('SELECT * FROM reviews WHERE id = ?', [id]);

      if (!review) {
        return res.status(404).json({
          error: 'Not Found',
          message: `Review with id ${id} not found`
        });
      }

      res.json({ data: review });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/reviews - Create new review
router.post('/',
  body('book_id').isInt({ min: 1 }).withMessage('Valid book_id is required'),
  body('reviewer_name').trim().notEmpty().withMessage('Reviewer name is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').trim().notEmpty().withMessage('Comment is required'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { book_id, reviewer_name, rating, comment } = req.body;

      const result = await dbRun(
        'INSERT INTO reviews (book_id, reviewer_name, rating, comment) VALUES (?, ?, ?, ?)',
        [book_id, reviewer_name, rating, comment]
      );

      const newReview = await dbGet('SELECT * FROM reviews WHERE id = ?', [result.id]);

      res.status(201).json({
        data: newReview,
        message: 'Review created successfully'
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/v1/reviews/:id - Delete review
router.delete('/:id',
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const result = await dbRun('DELETE FROM reviews WHERE id = ?', [id]);

      if (result.changes === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: `Review with id ${id} not found`
        });
      }

      res.json({
        message: 'Review deleted successfully',
        deletedId: id
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
