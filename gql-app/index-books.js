import 'dotenv/config';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { startStandaloneServer } from '@apollo/server/standalone';
import DataLoader from 'dataloader';
import pg from 'pg';
import mysql from 'mysql2/promise';

const { Pool } = pg;

// -----------------------------
// Database connections (PostgreSQL + MySQL)
// -----------------------------

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.PGHOST,
  port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl:
    process.env.PGSSLMODE && process.env.PGSSLMODE.toLowerCase() === 'require'
      ? { rejectUnauthorized: false }
      : undefined,
});

const mariaPool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'appuser',
  password: process.env.MYSQL_PASSWORD || 'apppass',
  database: process.env.MYSQL_DATABASE || 'appdb',
  waitForConnections: true,
  connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
  queueLimit: 0,
});

// -----------------------------
// Row mappers & utilities
// -----------------------------

const mapAuthorRow = (row) => ({
  id: row.id?.toString() ?? null,
  firstname: row.firstname,
  lastname: row.lastname,
  birthdate: normalizeDate(row.birthdate),
  deathdate: normalizeDate(row.deathdate),
  favoriteColor: row.favoritecolor ?? row.favorite_color ?? null,
  bio: row.bio,
  nationality: row.nationality,
  dateCreated: normalizeDateTime(row.datecreated ?? row.date_created),
});

const mapBookRow = (row) => ({
  id: row.id?.toString() ?? null,
  authorId: row.authorid?.toString() ?? row.author_id?.toString() ?? null,
  title: row.title,
  synopsis: row.synopsis,
  isbn: row.isbn,
  publicationDate: normalizeDate(row.publicationdate ?? row.publication_date),
});

const normalizeDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  const str = value.toString();
  return str.length >= 10 ? str.slice(0, 10) : str;
};

const normalizeDateTime = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value.toString();
};

const buildSqlPlaceholders = (count) => new Array(count).fill('?').join(', ');

const toNullableString = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = value.toString().trim();
  return trimmed.length === 0 ? null : trimmed;
};

// -----------------------------
// DataLoaders
// -----------------------------

const createLoaders = () => ({
  authorById: new DataLoader(async (ids) => {
    if (ids.length === 0) return [];
    const numericIds = ids.map((id) => Number(id));
    const { rows } = await pgPool.query(
      `SELECT id, firstname, lastname, birthdate, deathdate, favoritecolor, bio, nationality, datecreated
       FROM authors
       WHERE id = ANY($1)`,
      [numericIds]
    );
    const authorById = new Map(rows.map((row) => [Number(row.id), mapAuthorRow(row)]));
    return numericIds.map((id) => authorById.get(id) ?? null);
  }),
  booksByAuthorId: new DataLoader(async (ids) => {
    if (ids.length === 0) return [];
    const numericIds = ids.map((id) => Number(id));
    const placeholders = buildSqlPlaceholders(numericIds.length);
    const [rows] = await mariaPool.query(
      `SELECT id, author_id, title, synopsis, isbn, publicationdate
       FROM books
       WHERE author_id IN (${placeholders})`,
      numericIds
    );
    const booksByAuthor = new Map();
    for (const row of rows) {
      const key = Number(row.author_id);
      const list = booksByAuthor.get(key) ?? [];
      list.push(mapBookRow(row));
      booksByAuthor.set(key, list);
    }
    return numericIds.map((id) => booksByAuthor.get(id) ?? []);
  }),
  bookById: new DataLoader(async (ids) => {
    if (ids.length === 0) return [];
    const numericIds = ids.map((id) => Number(id));
    const placeholders = buildSqlPlaceholders(numericIds.length);
    const [rows] = await mariaPool.query(
      `SELECT id, author_id, title, synopsis, isbn, publicationdate
       FROM books
       WHERE id IN (${placeholders})`,
      numericIds
    );
    const bookById = new Map(rows.map((row) => [Number(row.id), mapBookRow(row)]));
    return numericIds.map((id) => bookById.get(id) ?? null);
  }),
});

// -----------------------------
// GraphQL schema & resolvers (Authors + Books)
// -----------------------------

const typeDefs = `#graphql
  type Author {
    id: ID!
    firstname: String!
    lastname: String!
    birthdate: String
    deathdate: String
    favoriteColor: String
    bio: String
    nationality: String
    dateCreated: String
    books: [Book!]!
  }

  type Book {
    id: ID!
    authorId: ID!
    title: String!
    synopsis: String
    isbn: String
    publicationDate: String
    author: Author!
  }

  type Query {
    authors: [Author!]!
    author(id: ID!): Author
    books: [Book!]!
    book(id: ID!): Book
  }

  type Mutation {
    addAuthor(input: AddAuthorInput!): Author!
    addBook(input: AddBookInput!): Book!
    deleteAuthor(id: ID!): Boolean!
  }

  input AddAuthorInput {
    firstname: String!
    lastname: String!
    birthdate: String
    deathdate: String
    favoriteColor: String
    bio: String
    nationality: String
    dateCreated: String
  }

  input AddBookInput {
    authorId: ID!
    title: String!
    synopsis: String
    isbn: String
    publicationDate: String
    id: ID
  }
`;

const resolvers = {
  Query: {
    authors: async () => {
      const { rows } = await pgPool.query(
        `SELECT id, firstname, lastname, birthdate, deathdate, favoritecolor, bio, nationality, datecreated
         FROM authors
         ORDER BY id`
      );
      return rows.map(mapAuthorRow);
    },
    author: async (_, { id }) => {
      const numericId = Number(id);
      const { rows } = await pgPool.query(
        `SELECT id, firstname, lastname, birthdate, deathdate, favoritecolor, bio, nationality, datecreated
         FROM authors
         WHERE id = $1`,
        [numericId]
      );
      const row = rows[0];
      return row ? mapAuthorRow(row) : null;
    },
    books: async () => {
      const [rows] = await mariaPool.query(
        `SELECT id, author_id, title, synopsis, isbn, publicationdate
         FROM books
         ORDER BY id`
      );
      return rows.map(mapBookRow);
    },
    book: async (_, { id }) => {
      const numericId = Number(id);
      const [rows] = await mariaPool.query(
        `SELECT id, author_id, title, synopsis, isbn, publicationdate
         FROM books
         WHERE id = ?
         LIMIT 1`,
        [numericId]
      );
      const row = rows[0];
      return row ? mapBookRow(row) : null;
    },
  },
  Mutation: {
    addAuthor: async (_, { input }, { loaders }) => {
      const firstname = toNullableString(input.firstname);
      const lastname = toNullableString(input.lastname);

      if (!firstname) {
        throw new Error('firstname is required');
      }
      if (!lastname) {
        throw new Error('lastname is required');
      }

      const birthdate = toNullableString(input.birthdate);
      const deathdate = toNullableString(input.deathdate);
      const favoriteColor = toNullableString(input.favoriteColor);
      const bio = toNullableString(input.bio);
      const nationality = toNullableString(input.nationality);
      const dateCreated = toNullableString(input.dateCreated) ?? new Date().toISOString().slice(0, 10);

      const { rows } = await pgPool.query(
        `INSERT INTO authors (
           firstname, lastname, birthdate, deathdate, favoritecolor, bio, nationality, datecreated
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, firstname, lastname, birthdate, deathdate, favoritecolor, bio, nationality, datecreated`,
        [firstname, lastname, birthdate, deathdate, favoriteColor, bio, nationality, dateCreated]
      );

      const row = rows[0];
      if (!row) {
        throw new Error('Failed to create author');
      }

      const author = mapAuthorRow(row);

      if (loaders?.authorById) {
        loaders.authorById.clear(author.id).prime(author.id, author);
      }
      if (loaders?.booksByAuthorId) {
        loaders.booksByAuthorId.clear(author.id).prime(author.id, []);
      }

      return author;
    },
    addBook: async (_, { input }, { loaders }) => {
      const hasExplicitId = input.id !== undefined && input.id !== null;
      const numericAuthorId = Number(input.authorId);
      if (!Number.isInteger(numericAuthorId) || numericAuthorId <= 0) {
        throw new Error('authorId must be a positive integer');
      }

      let desiredBookId = null;
      if (hasExplicitId) {
        desiredBookId = Number(input.id);
        if (!Number.isInteger(desiredBookId) || desiredBookId <= 0) {
          throw new Error('Book id must be a positive integer when provided');
        }
      }

      const title = toNullableString(input.title);
      if (!title) {
        throw new Error('title is required');
      }

      const synopsis = toNullableString(input.synopsis);
      const isbn = toNullableString(input.isbn);
      const publicationDate = toNullableString(input.publicationDate);

      const { rows: authorRows } = await pgPool.query(
        `SELECT id FROM authors WHERE id = $1`,
        [numericAuthorId]
      );
      if (!authorRows[0]) {
        throw new Error(`Author ${input.authorId} not found`);
      }

      if (hasExplicitId) {
        const [existingBooks] = await mariaPool.query(
          `SELECT id FROM books WHERE id = ? LIMIT 1`,
          [desiredBookId]
        );
        if (Array.isArray(existingBooks) && existingBooks.length > 0) {
          throw new Error(`Book ${input.id} already exists`);
        }
      }

      let insertId;
      if (hasExplicitId) {
        await mariaPool.query(
          `INSERT INTO books (id, author_id, title, synopsis, isbn, publicationdate)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [desiredBookId, numericAuthorId, title, synopsis, isbn, publicationDate]
        );
        insertId = desiredBookId;
      } else {
        const [result] = await mariaPool.query(
          `INSERT INTO books (author_id, title, synopsis, isbn, publicationdate)
           VALUES (?, ?, ?, ?, ?)`,
          [numericAuthorId, title, synopsis, isbn, publicationDate]
        );
        insertId = result.insertId;
      }

      const [rows] = await mariaPool.query(
        `SELECT id, author_id, title, synopsis, isbn, publicationdate
         FROM books
         WHERE id = ?
         LIMIT 1`,
        [insertId]
      );

      const bookRow = rows[0];
      if (!bookRow) {
        throw new Error('Failed to load created book');
      }

      const book = mapBookRow(bookRow);

      if (loaders?.bookById) {
        loaders.bookById.clear(book.id).prime(book.id, book);
      }
      if (loaders?.booksByAuthorId) {
        loaders.booksByAuthorId.clear(book.authorId);
      }

      return book;
    },
    deleteAuthor: async (_, { id }, { loaders }) => {
      const authorId = Number(id);
      if (!Number.isInteger(authorId) || authorId <= 0) {
        throw new Error('Invalid author id');
      }

      const { rows: authorRows } = await pgPool.query(
        `SELECT id FROM authors WHERE id = $1`,
        [authorId]
      );
      if (!authorRows[0]) {
        return false;
      }

      const [bookRows] = await mariaPool.query(
        `SELECT id FROM books WHERE author_id = ?`,
        [authorId]
      );
      const bookIds = Array.isArray(bookRows) ? bookRows.map((row) => Number(row.id)) : [];

      await mariaPool.query('BEGIN');
      try {
        if (bookIds.length > 0) {
          const placeholders = buildSqlPlaceholders(bookIds.length);
          await mariaPool.query(
            `DELETE FROM books WHERE id IN (${placeholders})`,
            bookIds
          );
        }

        await pgPool.query(
          `DELETE FROM authors WHERE id = $1`,
          [authorId]
        );

        await mariaPool.query('COMMIT');
      } catch (err) {
        await mariaPool.query('ROLLBACK').catch(() => undefined);
        throw err;
      }

      if (loaders?.authorById) {
        loaders.authorById.clear(authorId);
      }
      if (loaders?.booksByAuthorId) {
        loaders.booksByAuthorId.clear(authorId);
      }
      if (loaders?.bookById) {
        for (const bookId of bookIds) {
          loaders.bookById.clear(bookId);
        }
      }

      return true;
    },
  },
  Author: {
    books: (author, _, { loaders }) => loaders.booksByAuthorId.load(author.id),
  },
  Book: {
    author: (book, _, { loaders }) => loaders.authorById.load(book.authorId),
  },
};

// -----------------------------
// Startup
// -----------------------------

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  plugins: [ApolloServerPluginLandingPageLocalDefault({ embed: true })],
});

const { url } = await startStandaloneServer(server, {
  listen: { port: Number(process.env.PORT || 4000) },
  context: async () => ({
    pgPool,
    mariaPool,
    loaders: createLoaders(),
  }),
});

console.log(`🚀 GraphQL (Authors + Books) running at ${url}`);

process.on('SIGINT', () => {
  console.log('Shutting down...');
  pgPool.end();
  mariaPool.end();
  process.exit(0);
});
