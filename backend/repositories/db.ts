import mysql from 'mysql2/promise';

/**
 * Gedeelde MySQL connection pool voor alle repositories.
 */
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'geheim_wachtwoord',
    database: process.env.DB_NAME || 'zwembad_status',
    waitForConnections: true,
    connectionLimit: 10,
});

export default pool;
