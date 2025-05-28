const sqlite3 = require('sqlite3').verbose();
const db = require('../config/database');
const path = require('path');

async function migrateData() {
    const sqliteDb = new sqlite3.Database(path.join(__dirname, '..', 'robots.db'));

    try {
        // Get all robots from SQLite
        const robots = await new Promise((resolve, reject) => {
            sqliteDb.all('SELECT * FROM robots', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log(`Found ${robots.length} robots to migrate`);

        // Insert each robot into PostgreSQL
        for (const robot of robots) {
            await db.query(
                `INSERT INTO robots (name, publicIP, privateIP, serialNumber, secretKey)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (serialNumber) DO NOTHING`,
                [robot.name, robot.publicIP, robot.privateIP, robot.serialNumber, robot.secretKey]
            );
        }

        console.log('Data migration completed successfully');

    } catch (err) {
        console.error('Data migration failed:', err);
    } finally {
        sqliteDb.close();
        await db.pool.end();
    }
}

migrateData(); 