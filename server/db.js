const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // нужно для Railway
});

async function connectDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS games (
        id SERIAL PRIMARY KEY,
        player VARCHAR(100),
        score INTEGER,
        duration VARCHAR(20),
        date TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("PostgreSQL connected!");
  } catch (err) {
    console.error("PostgreSQL connection error:", err);
    process.exit(1);
  }
}

module.exports = { pool, connectDB };
