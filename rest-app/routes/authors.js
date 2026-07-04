import express from 'express';
import { body, param, validationResult } from 'express-validator';
import pgPool from '../db/postgres.js';

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

// GET /api/v1/authors - List all authors
router.get('/', async (req, res, next) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const result = await pgPool.query(
      'SELECT id, firstname, lastname, birthdate, favoriteColor, bio FROM authors ORDER BY id LIMIT $1 OFFSET $2',
      [Number(limit), Number(offset)]
    );

    const countResult = await pgPool.query('SELECT COUNT(*) FROM authors');

    res.json({
      data: result.rows,
      pagination: {
        total: Number(countResult.rows[0].count),
        limit: Number(limit),
        offset: Number(offset)
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/authors/:id - Get author by ID
router.get('/:id',
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      // Get author
      const authorResult = await pgPool.query(
        'SELECT id, firstname, lastname, birthdate, favoriteColor, bio FROM authors WHERE id = $1',
        [id]
      );

      if (authorResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: `Author with id ${id} not found`
        });
      }

      const author = authorResult.rows[0];

      // Get author's books
      const booksResult = await pgPool.query(
        'SELECT id, title, synopsis FROM books WHERE author_id = $1 ORDER BY id',
        [id]
      );

      author.books = booksResult.rows;

      res.json({ data: author });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/authors - Create new author
router.post('/',
  body('firstname').trim().notEmpty().withMessage('First name is required'),
  body('lastname').trim().notEmpty().withMessage('Last name is required'),
  body('birthdate').optional().isISO8601().withMessage('Birthdate must be a valid date'),
  body('favoriteColor').optional().trim(),
  body('bio').optional().trim(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { firstname, lastname, birthdate, favoriteColor, bio } = req.body;

      const result = await pgPool.query(
        `INSERT INTO authors (firstname, lastname, birthdate, favoriteColor, bio)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, firstname, lastname, birthdate, favoriteColor, bio`,
        [firstname, lastname, birthdate || null, favoriteColor || null, bio || null]
      );

      res.status(201).json({
        data: result.rows[0],
        message: 'Author created successfully'
      });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/v1/authors/:id - Update author
router.put('/:id',
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
  body('firstname').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastname').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('birthdate').optional().isISO8601().withMessage('Birthdate must be a valid date'),
  body('favoriteColor').optional().trim(),
  body('bio').optional().trim(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { firstname, lastname, birthdate, favoriteColor, bio } = req.body;

      // Check if author exists
      const checkResult = await pgPool.query('SELECT id FROM authors WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: `Author with id ${id} not found`
        });
      }

      // Build dynamic update query
      const updates = [];
      const values = [];
      let valueIndex = 1;

      if (firstname !== undefined) {
        updates.push(`firstname = $${valueIndex++}`);
        values.push(firstname);
      }
      if (lastname !== undefined) {
        updates.push(`lastname = $${valueIndex++}`);
        values.push(lastname);
      }
      if (birthdate !== undefined) {
        updates.push(`birthdate = $${valueIndex++}`);
        values.push(birthdate);
      }
      if (favoriteColor !== undefined) {
        updates.push(`favoriteColor = $${valueIndex++}`);
        values.push(favoriteColor);
      }
      if (bio !== undefined) {
        updates.push(`bio = $${valueIndex++}`);
        values.push(bio);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'No fields to update'
        });
      }

      values.push(id);
      const query = `UPDATE authors SET ${updates.join(', ')} WHERE id = $${valueIndex}
                     RETURNING id, firstname, lastname, birthdate, favoriteColor, bio`;

      const result = await pgPool.query(query, values);

      res.json({
        data: result.rows[0],
        message: 'Author updated successfully'
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/v1/authors/:id - Delete author
router.delete('/:id',
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const result = await pgPool.query('DELETE FROM authors WHERE id = $1 RETURNING id', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: `Author with id ${id} not found`
        });
      }

      res.json({
        message: 'Author deleted successfully',
        deletedId: id
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
