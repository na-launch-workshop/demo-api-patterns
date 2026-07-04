import grpc from '@grpc/grpc-js';
import { dbAll, dbGet, dbRun } from '../db/sqlite.js';

// ListReviews - Get all reviews with pagination
export async function ListReviews(call, callback) {
  try {
    const { limit = 100, offset = 0 } = call.request;

    const reviews = await dbAll(
      'SELECT * FROM reviews ORDER BY id LIMIT ? OFFSET ?',
      [limit, offset]
    );

    const countResult = await dbGet('SELECT COUNT(*) as total FROM reviews');

    callback(null, {
      reviews,
      total: countResult.total
    });
  } catch (err) {
    console.error('ListReviews error:', err);
    callback({
      code: grpc.status.INTERNAL,
      message: err.message
    });
  }
}

// GetReview - Get review by ID
export async function GetReview(call, callback) {
  try {
    const { id } = call.request;

    const review = await dbGet('SELECT * FROM reviews WHERE id = ?', [id]);

    if (!review) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: `Review with id ${id} not found`
      });
    }

    callback(null, review);
  } catch (err) {
    console.error('GetReview error:', err);
    callback({
      code: grpc.status.INTERNAL,
      message: err.message
    });
  }
}

// CreateReview - Create new review
export async function CreateReview(call, callback) {
  try {
    const { book_id, reviewer_name, rating, comment } = call.request;

    if (!book_id || !reviewer_name || !rating || !comment) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'All fields are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'Rating must be between 1 and 5'
      });
    }

    const result = await dbRun(
      'INSERT INTO reviews (book_id, reviewer_name, rating, comment) VALUES (?, ?, ?, ?)',
      [book_id, reviewer_name, rating, comment]
    );

    const newReview = await dbGet('SELECT * FROM reviews WHERE id = ?', [result.id]);

    callback(null, newReview);
  } catch (err) {
    console.error('CreateReview error:', err);
    callback({
      code: grpc.status.INTERNAL,
      message: err.message
    });
  }
}

// DeleteReview - Delete review
export async function DeleteReview(call, callback) {
  try {
    const { id } = call.request;

    const result = await dbRun('DELETE FROM reviews WHERE id = ?', [id]);

    if (result.changes === 0) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: `Review with id ${id} not found`
      });
    }

    callback(null, {
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (err) {
    console.error('DeleteReview error:', err);
    callback({
      code: grpc.status.INTERNAL,
      message: err.message
    });
  }
}

// GetReviewsByBook - Get reviews for a specific book
export async function GetReviewsByBook(call, callback) {
  try {
    const { book_id } = call.request;

    const reviews = await dbAll(
      'SELECT * FROM reviews WHERE book_id = ? ORDER BY id',
      [book_id]
    );

    const total = reviews.length;

    callback(null, { reviews, total });
  } catch (err) {
    console.error('GetReviewsByBook error:', err);
    callback({
      code: grpc.status.INTERNAL,
      message: err.message
    });
  }
}

// AddReviews - Client streaming to add multiple reviews
export function AddReviews(call, callback) {
  let count = 0;

  call.on('data', async (request) => {
    try {
      const { book_id, reviewer_name, rating, comment } = request;

      await dbRun(
        'INSERT INTO reviews (book_id, reviewer_name, rating, comment) VALUES (?, ?, ?, ?)',
        [book_id, reviewer_name, rating, comment]
      );

      count++;
    } catch (err) {
      console.error('AddReviews data error:', err);
    }
  });

  call.on('end', () => {
    callback(null, {
      count,
      message: `Successfully added ${count} reviews`
    });
  });

  call.on('error', (err) => {
    console.error('AddReviews stream error:', err);
    callback({
      code: grpc.status.INTERNAL,
      message: err.message
    });
  });
}
