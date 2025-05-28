const db = require('../config/database');
const fs = require('fs');
const path = require('path');

async function migrate() {
    try {
        // Create robots table
        await db.query(`
            CREATE TABLE IF NOT EXISTS robots (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                publicIP TEXT NOT NULL,
                privateIP TEXT NOT NULL,
                serialNumber TEXT UNIQUE NOT NULL,
                secretKey TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('Migration completed successfully');

        // If there's an existing SQLite database, migrate the data
        const sqliteDbPath = path.join(__dirname, '..', 'robots.db');
        if (fs.existsSync(sqliteDbPath)) {
            console.log('Found existing SQLite database. Please run the data migration script.');
        }

    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await db.pool.end();
    }
}

migrate(); 