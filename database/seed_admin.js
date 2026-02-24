#!/usr/bin/env node
/**
 * WEATHIFY — Admin Account Seeder
 *
 * Creates the admins table (if missing) and inserts or resets the
 * default admin account.
 *
 * Usage:
 *   node database/seed_admin.js                     # uses defaults
 *   node database/seed_admin.js  --reset            # resets password to default
 *   ADMIN_USER=myadmin ADMIN_PASS=secret123 node database/seed_admin.js
 *
 * Environment variables (all optional):
 *   ADMIN_USER   — username  (default: admin)
 *   ADMIN_EMAIL  — email     (default: admin@weathify.com)
 *   ADMIN_PASS   — password  (default: admin123)
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const SALT_ROUNDS = 10;

const pool = new Pool({
  user:     process.env.DB_USER     || 'postgres',
  host:     process.env.DB_HOST     || 'localhost',
  database: process.env.DB_NAME     || 'weathify_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
});

async function run() {
  const username = process.env.ADMIN_USER  || 'admin';
  const email    = process.env.ADMIN_EMAIL || `${username}@weathify.com`;
  const password = process.env.ADMIN_PASS  || 'admin123';
  const reset    = process.argv.includes('--reset');

  console.log(`[seed_admin] Config: username=${username}, email=${email}`);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── 1. Ensure the admins table exists ────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'read_only')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      );
    `);
    console.log('[seed_admin] ✓ admins table ready');

    // ── 2. Check if admin already exists ─────────────────────
    const existing = await client.query(
      'SELECT id, username FROM admins WHERE username = $1',
      [username]
    );

    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Also check if another admin already uses this email
    const emailConflict = await client.query(
      'SELECT id, username FROM admins WHERE email = $1 AND username != $2',
      [email, username]
    );

    if (emailConflict.rows.length > 0) {
      const other = emailConflict.rows[0].username;
      throw new Error(
        `Email "${email}" is already used by admin "${other}". ` +
        `Set ADMIN_EMAIL to a different value, e.g.:\n` +
        `  ADMIN_USER=${username} ADMIN_EMAIL=${username}@example.com ADMIN_PASS=... node database/seed_admin.js`
      );
    }

    if (existing.rows.length > 0 && reset) {
      // Reset password (and update email if changed)
      await client.query(
        'UPDATE admins SET password_hash = $1, email = $2, updated_at = CURRENT_TIMESTAMP WHERE username = $3',
        [hash, email, username]
      );
      console.log(`[seed_admin] ✓ Password reset for admin "${username}"`);
    } else if (existing.rows.length > 0) {
      console.log(`[seed_admin] ✓ Admin "${username}" already exists (use --reset to update password)`);
    } else {
      // Insert new admin — use ON CONFLICT to handle race conditions
      await client.query(
        `INSERT INTO admins (username, email, password_hash, role)
         VALUES ($1, $2, $3, 'admin')
         ON CONFLICT (username) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             email = EXCLUDED.email,
             updated_at = CURRENT_TIMESTAMP`,
        [username, email, hash]
      );
      console.log(`[seed_admin] ✓ Created admin account "${username}"`);
    }

    await client.query('COMMIT');

    // ── 3. Verify ────────────────────────────────────────────
    const verify = await client.query(
      'SELECT id, username, email, role, created_at FROM admins WHERE username = $1',
      [username]
    );

    if (verify.rows.length > 0) {
      const a = verify.rows[0];
      console.log('[seed_admin] ────────────────────────────────────');
      console.log(`  Username : ${a.username}`);
      console.log(`  Email    : ${a.email}`);
      console.log(`  Role     : ${a.role}`);
      console.log(`  Password : ${password}`);
      console.log('[seed_admin] ────────────────────────────────────');
      console.log('[seed_admin] ✓ Admin account is ready. Log in at /admin.html');
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[seed_admin] ✗ Failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
