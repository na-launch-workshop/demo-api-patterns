import grpc from '@grpc/grpc-js';
import pgPool from '../db/postgres.js';

// ListAuthors - Get all authors with pagination
export async function ListAuthors(call, callback) {
  try {
    const { limit = 100, offset = 0 } = call.request;

    const result = await pgPool.query(
      'SELECT id, firstname, lastname, birthdate, favoriteColor, bio FROM authors ORDER BY id LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    const countResult = await pgPool.query('SELECT COUNT(*) FROM authors');

    callback(null, {
      authors: result.rows,
      total: Number(countResult.rows[0].count)
    });
  } catch (err) {
    console.error('ListAuthors error:', err);
    callback({
      code: grpc.status.INTERNAL,
      message: err.message
    });
  }
}

// GetAuthor - Get author by ID with books
export async function GetAuthor(call, callback) {
  try {
    const { id } = call.request;

    const authorResult = await pgPool.query(
      'SELECT id, firstname, lastname, birthdate, favoriteColor, bio FROM authors WHERE id = $1',
      [id]
    );

    if (authorResult.rows.length === 0) {
      return callback({
        code: grpc.status.NOT_FOUND,
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

    callback(null, author);
  } catch (err) {
    console.error('GetAuthor error:', err);
    callback({
      code: grpc.status.INTERNAL,
      message: err.message
    });
  }
}

// CreateAuthor - Create new author
export async function CreateAuthor(call, callback) {
  try {
    const { firstname, lastname, birthdate, favoriteColor, bio } = call.request;

    if (!firstname || !lastname) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'Firstname and lastname are required'
      });
    }

    const result = await pgPool.query(
      `INSERT INTO authors (firstname, lastname, birthdate, favoriteColor, bio)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, firstname, lastname, birthdate, favoriteColor, bio`,
      [firstname, lastname, birthdate || null, favoriteColor || null, bio || null]
    );

    const author = result.rows[0];
    author.books = [];

    callback(null, author);
  } catch (err) {
    console.error('CreateAuthor error:', err);
    callback({
      code: grpc.status.INTERNAL,
      message: err.message
    });
  }
}

// UpdateAuthor - Update existing author
export async function UpdateAuthor(call, callback) {
  try {
    const { id, firstname, lastname, birthdate, favoriteColor, bio } = call.request;

    // Check if author exists
    const checkResult = await pgPool.query('SELECT id FROM authors WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: `Author with id ${id} not found`
      });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let valueIndex = 1;

    if (firstname) {
      updates.push(`firstname = $${valueIndex++}`);
      values.push(firstname);
    }
    if (lastname) {
      updates.push(`lastname = $${valueIndex++}`);
      values.push(lastname);
    }
    if (birthdate) {
      updates.push(`birthdate = $${valueIndex++}`);
      values.push(birthdate);
    }
    if (favoriteColor) {
      updates.push(`favoriteColor = $${valueIndex++}`);
      values.push(favoriteColor);
    }
    if (bio) {
      updates.push(`bio = $${valueIndex++}`);
      values.push(bio);
    }

    if (updates.length === 0) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'No fields to update'
      });
    }

    values.push(id);
    const query = `UPDATE authors SET ${updates.join(', ')} WHERE id = $${valueIndex}
                   RETURNING id, firstname, lastname, birthdate, favoriteColor, bio`;

    const result = await pgPool.query(query, values);
    const author = result.rows[0];
    author.books = [];

    callback(null, author);
  } catch (err) {
    console.error('UpdateAuthor error:', err);
    callback({
      code: grpc.status.INTERNAL,
      message: err.message
    });
  }
}

// DeleteAuthor - Delete author
export async function DeleteAuthor(call, callback) {
  try {
    const { id } = call.request;

    const result = await pgPool.query('DELETE FROM authors WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: `Author with id ${id} not found`
      });
    }

    callback(null, {
      success: true,
      message: 'Author deleted successfully'
    });
  } catch (err) {
    console.error('DeleteAuthor error:', err);
    callback({
      code: grpc.status.INTERNAL,
      message: err.message
    });
  }
}

// StreamAuthors - Server streaming of authors
export async function StreamAuthors(call) {
  try {
    const { batch_size = 10 } = call.request;

    const result = await pgPool.query(
      'SELECT id, firstname, lastname, birthdate, favoriteColor, bio FROM authors ORDER BY id'
    );

    // Stream authors in batches
    for (const author of result.rows) {
      author.books = [];
      call.write(author);

      // Simulate streaming delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    call.end();
  } catch (err) {
    console.error('StreamAuthors error:', err);
    call.destroy({
      code: grpc.status.INTERNAL,
      message: err.message
    });
  }
}
