import grpc from '@grpc/grpc-js';
import pgPool from '../db/postgres.js';
import mysqlPool from '../db/mysql.js';
import { dbGet } from '../db/sqlite.js';

const startTime = Date.now();

// Check - Health check
export async function Check(call, callback) {
  const health = {
    status: 1, // SERVING
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
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
    health.status = 2; // NOT_SERVING
  }

  // Check MySQL
  try {
    await mysqlPool.query('SELECT 1');
    health.databases.mysql = 'connected';
  } catch (err) {
    health.databases.mysql = 'disconnected';
    health.status = 2; // NOT_SERVING
  }

  // Check SQLite
  try {
    await dbGet('SELECT 1');
    health.databases.sqlite = 'connected';
  } catch (err) {
    health.databases.sqlite = 'disconnected';
    health.status = 2; // NOT_SERVING
  }

  callback(null, health);
}

// Watch - Stream health status (server streaming)
export async function Watch(call) {
  const interval = setInterval(async () => {
    const health = {
      status: 1, // SERVING
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      databases: {
        postgres: 'unknown',
        mysql: 'unknown',
        sqlite: 'unknown'
      }
    };

    // Check databases
    try {
      await pgPool.query('SELECT 1');
      health.databases.postgres = 'connected';
    } catch (err) {
      health.databases.postgres = 'disconnected';
      health.status = 2;
    }

    try {
      await mysqlPool.query('SELECT 1');
      health.databases.mysql = 'connected';
    } catch (err) {
      health.databases.mysql = 'disconnected';
      health.status = 2;
    }

    try {
      await dbGet('SELECT 1');
      health.databases.sqlite = 'connected';
    } catch (err) {
      health.databases.sqlite = 'disconnected';
      health.status = 2;
    }

    call.write(health);
  }, 5000); // Send health update every 5 seconds

  call.on('cancelled', () => {
    clearInterval(interval);
    call.end();
  });
}
