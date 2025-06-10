const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

console.log('Environment variables:', {
    user: process.env.POSTGRES_USER,
    password: typeof process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT
});

console.log('Looking for .env file in:', path.join(__dirname, '..', '.env'));

// Using hardcoded values that we know work
const pool = new Pool({
    user: 'Denton Burr',
    password: 'burr',
    database: 'postgres',
    host: 'localhost',
    port: 5432
});

// Test the connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to PostgreSQL:', err);
    } else {
        console.log('Successfully connected to PostgreSQL');
        release();
    }
});

// Function to check database size
const getDatabaseSize = async () => {
    try {
        const sizeQuery = await pool.query(`
            SELECT 
                pg_size_pretty(pg_database_size(current_database())) as database_size,
                pg_size_pretty(pg_total_relation_size('robots')) as robots_table_size,
                pg_size_pretty(pg_available_extension_versions()) as available_space;
        `);
        return sizeQuery.rows[0];
    } catch (err) {
        console.error('Error checking database size:', err);
        throw err;
    }
};

// Function to check table sizes
const getTableSizes = async () => {
    try {
        const tableSizesQuery = await pool.query(`
            SELECT 
                relname as table_name,
                pg_size_pretty(pg_total_relation_size(relid)) as total_size,
                pg_size_pretty(pg_table_size(relid)) as table_size,
                pg_size_pretty(pg_indexes_size(relid)) as index_size
            FROM pg_catalog.pg_statio_user_tables
            ORDER BY pg_total_relation_size(relid) DESC;
        `);
        return tableSizesQuery.rows;
    } catch (err) {
        console.error('Error checking table sizes:', err);
        throw err;
    }
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
    getDatabaseSize,
    getTableSizes
}; 