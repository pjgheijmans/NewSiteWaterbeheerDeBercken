/**
 * MySQL connection pool using mysql2 promise wrapper.
 * The pool is reused across repository modules for query execution.
 */
const mysql = require('mysql2');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'geheim_wachtwoord',
    database: process.env.DB_NAME || 'zwembad_status',
    waitForConnections: true,
    connectionLimit: 10
}).promise();

module.exports = pool;
