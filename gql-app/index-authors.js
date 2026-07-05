import 'dotenv/config';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { startStandaloneServer } from '@apollo/server/standalone';
import pg from 'pg';

const { Pool } = pg;

// -----------------------------
// PostgreSQL connection only
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

const toNullableString = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = value.toString().trim();
  return trimmed.length === 0 ? null : trimmed;
};

// -----------------------------
// GraphQL schema & resolvers (Authors only)
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
  }

  type Query {
    authors: [Author!]!
    author(id: ID!): Author
  }

  type Mutation {
    addAuthor(input: AddAuthorInput!): Author!
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
  },
  Mutation: {
    addAuthor: async (_, { input }) => {
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

      return mapAuthorRow(row);
    },
    deleteAuthor: async (_, { id }) => {
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

      await pgPool.query(
        `DELETE FROM authors WHERE id = $1`,
        [authorId]
      );

      return true;
    },
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
  }),
});

console.log(`🚀 GraphQL (Authors Only) running at ${url}`);

process.on('SIGINT', () => {
  console.log('Shutting down...');
  pgPool.end();
  process.exit(0);
});
