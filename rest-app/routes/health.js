import express from 'express';
import pgPool from '../db/postgres.js';
import mysqlPool from '../db/mysql.js';
import { dbGet } from '../db/sqlite.js';

const router = express.Router();

// Health check endpoint
router.get('/', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    databases: {
      postgres: 'unknown',
      mysql: 'unknown',
      sqlite: 'unknown'
    }
  };

  // Check PostgreSQL
  try {
    await pgPool.query('SELECT 1');
    health.databases.postgres = 'connected';
  } catch (err) {
    health.databases.postgres = 'disconnected';
    health.status = 'degraded';
  }

  // Check MySQL
  try {
    await mysqlPool.query('SELECT 1');
    health.databases.mysql = 'connected';
  } catch (err) {
    health.databases.mysql = 'disconnected';
    health.status = 'degraded';
  }

  // Check SQLite
  try {
    await dbGet('SELECT 1');
    health.databases.sqlite = 'connected';
  } catch (err) {
    health.databases.sqlite = 'disconnected';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Readiness probe
router.get('/ready', async (req, res) => {
  try {
    await pgPool.query('SELECT 1');
    await mysqlPool.query('SELECT 1');
    await dbGet('SELECT 1');
    res.status(200).json({ status: 'ready' });
  } catch (err) {
    res.status(503).json({ status: 'not ready', error: err.message });
  }
});

// Liveness probe
router.get('/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

export default router;
