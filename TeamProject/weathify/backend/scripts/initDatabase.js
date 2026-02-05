const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initializeDatabase() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    // Don't specify database yet - we'll create it
  });

  try {
    // Check if database exists, create if it doesn't
    const dbCheckQuery = `
      SELECT 1 FROM pg_database WHERE datname = $1
    `;
    
    const result = await pool.query(dbCheckQuery, [process.env.DB_NAME]);
    
    if (result.rows.length === 0) {
      console.log(`📦 Creating database: ${process.env.DB_NAME}`);
      await pool.query(`CREATE DATABASE ${process.env.DB_NAME}`);
      console.log('✅ Database created successfully');
    } else {
      console.log(`✅ Database ${process.env.DB_NAME} already exists`);
    }
    
    await pool.end();
    
    // Connect to the new database
    const dbPool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
    
    // Read and execute schema
    console.log('\n📋 Creating database schema...');
    const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await dbPool.query(schema);
    console.log('✅ Schema created successfully');
    
    // Read and execute seed data
    console.log('\n🌱 Seeding initial data...');
    const seedPath = path.join(__dirname, '..', '..', 'database', 'seed.sql');
    const seed = fs.readFileSync(seedPath, 'utf8');
    
    await dbPool.query(seed);
    console.log('✅ Data seeded successfully');
    
    await dbPool.end();
    
    console.log('\n🎉 Database initialization complete!\n');
    
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    process.exit(1);
  }
}

initializeDatabase();
