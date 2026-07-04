import grpc from '@grpc/grpc-js';
import mysqlPool from '../db/mysql.js';

// ListBooks - Get all books with pagination
export async function ListBooks(call, callback) {
  try {
    const { limit = 100, offset = 0 } = call.request;

    const [books] = await mysqlPool.query(
      'SELECT id, title, author_id, synopsis FROM books ORDER BY id LIMIT ? OFFSET ?',
      [limit, offset]
    );

    const [[{ total }]] = await mysqlPool.query('SELECT COUNT(*) as total FROM books');

    callback(null, { books, total });
  } catch (err) {
    console.error('ListBooks error:', err);
    callback({
      code: grpc.status.INTERNAL,
      message: err.message
    });
  }
}

// GetBook - Get book by ID
export async function GetBook(call, callback) {
  try {
    const { id } = call.request;

    const [books] = await mysqlPool.query(
      'SELECT id, title, author_id, synopsis FROM books WHERE id = ?',
      [id]
    );

    if (books.length === 0) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: `Book with id ${id} not found`
      });
    }

    callback(null, books[0]);
  } catch (err) {
    console.error('GetBook error:', err);
    callback({
      code: grpc.status.INTERNAL,
      message: err.message
    });
  }
}

// CreateBook - Create new book
export async function CreateBook(call, callback) {
  try {
    const { title, author_id, synopsis } = call.request;

    if (!title || !author_id) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'Title and author_id are required'
      });
    }

    const [result] = await mysqlPool.query(
      'INSERT INTO books (title, author_id, synopsis) VALUES (?, ?, ?)',
      [title, author_id, synopsis || null]
    );

    const [newBook] = await mysqlPool.query(
      'SELECT id, title, author_id, synopsis FROM books WHERE id = ?',
      [result.insertId]
    );

    callback(null, newBook[0]);
  } catch (err) {
    console.error('CreateBook error:', err);
    callback({
      code: grpc.status.INTERNAL,
      message: err.message
    });
  }
}

// UpdateBook - Update existing book
export async function UpdateBook(call, callback) {
  try {
    const { id, title, author_id, synopsis } = call.request;

    const [books] = await mysqlPool.query('SELECT id FROM books WHERE id = ?', [id]);
    if (books.length === 0) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: `Book with id ${id} not found`
      });
    }

    const updates = [];
    const values = [];

    if (title) {
      updates.push('title = ?');
      values.push(title);
    }
    if (author_id) {
      updates.push('author_id = ?');
      values.push(author_id);
    }
    if (synopsis) {
      updates.push('synopsis = ?');
      values.push(synopsis);
    }

    if (updates.length === 0) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
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

    callback(null, updatedBook[0]);
  } catch (err) {
    console.error('UpdateBook error:', err);
    callback({
      code: grpc.status.INTERNAL,
      message: err.message
    });
  }
}

// DeleteBook - Delete book
export async function DeleteBook(call, callback) {
  try {
    const { id } = call.request;

    const [result] = await mysqlPool.query('DELETE FROM books WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: `Book with id ${id} not found`
      });
    }

    callback(null, {
      success: true,
      message: 'Book deleted successfully'
    });
  } catch (err) {
    console.error('DeleteBook error:', err);
    callback({
      code: grpc.status.INTERNAL,
      message: err.message
    });
  }
}

// GetBooksByAuthor - Server streaming of books by author
export async function GetBooksByAuthor(call) {
  try {
    const { author_id } = call.request;

    const [books] = await mysqlPool.query(
      'SELECT id, title, author_id, synopsis FROM books WHERE author_id = ? ORDER BY id',
      [author_id]
    );

    for (const book of books) {
      call.write(book);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    call.end();
  } catch (err) {
    console.error('GetBooksByAuthor error:', err);
    call.destroy({
      code: grpc.status.INTERNAL,
      message: err.message
    });
  }
}
