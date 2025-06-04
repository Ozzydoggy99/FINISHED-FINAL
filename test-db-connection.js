const db = require('./db');
require('dotenv').config();

async function testConnection() {
    try {
        console.log('Attempting to connect to database with these settings:');
        console.log('Host:', process.env.DB_HOST);
        console.log('Port:', process.env.DB_PORT);
        console.log('Database:', process.env.DB_NAME);
        console.log('User:', process.env.DB_USER);
        
        // Test basic query
        const result = await db.query('SELECT NOW()');
        console.log('\nDatabase connection successful!');
        console.log('Current database time:', result.rows[0].now);
        
        // Test if we can access our tables
        const tables = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('\nAvailable tables:');
        tables.rows.forEach(table => console.log('-', table.table_name));
        
    } catch (error) {
        console.error('\nDatabase connection test failed:');
        console.error('Error details:', error.message);
        if (error.code) console.error('Error code:', error.code);
        if (error.stack) console.error('Stack trace:', error.stack);
    } finally {
        // Close the pool
        await db.pool.end();
    }
}

testConnection(); 