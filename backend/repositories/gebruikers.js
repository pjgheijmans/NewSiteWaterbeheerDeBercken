/**
 * Repository for gebruikers account CRUD operations.
 */
const pool = require('./db');

const DEFAULT_GEBRUIKERS = [
    { voornaam: 'Admin',  achternaam: '',         inlognaam: 'Admin',    wachtwoord: 'lpphw', taak: 'Administrator'   },
    { voornaam: 'Paul',   achternaam: 'Heijmans',  inlognaam: 'pheijmans',wachtwoord: 'Paul',  taak: 'waterbeheerder'  },
];

/**
 * Find a gebruiker by login credentials.
 * @returns {Promise<Object|null>} The gebruiker or null when not found.
 */
async function findByLogin(inlognaam, wachtwoord) {
    const [rows] = await pool.execute(
        'SELECT id, voornaam, achternaam, inlognaam, taak FROM gebruikers WHERE inlognaam = ? AND wachtwoord = ?',
        [inlognaam, wachtwoord]
    );
    return rows[0] || null;
}

/**
 * Return all gebruiker records.
 */
async function getAll() {
    const [rows] = await pool.execute(
        'SELECT id, voornaam, achternaam, inlognaam, wachtwoord, taak FROM gebruikers'
    );
    return rows;
}

/**
 * Create a new gebruiker.
 */
async function create({ voornaam, achternaam, inlognaam, wachtwoord, taak }) {
    await pool.execute(
        'INSERT INTO gebruikers (voornaam, achternaam, inlognaam, wachtwoord, taak) VALUES (?, ?, ?, ?, ?)',
        [voornaam, achternaam, inlognaam, wachtwoord, taak]
    );
}

/**
 * Update a gebruiker by id.
 */
async function update(id, { voornaam, achternaam, inlognaam, wachtwoord, taak }) {
    await pool.execute(
        'UPDATE gebruikers SET voornaam=?, achternaam=?, inlognaam=?, wachtwoord=?, taak=? WHERE id=?',
        [voornaam, achternaam, inlognaam, wachtwoord, taak, id]
    );
}

/**
 * Remove a gebruiker by id.
 */
async function remove(id) {
    await pool.execute('DELETE FROM gebruikers WHERE id = ?', [id]);
}

/**
 * Insert all default gebruikers, skipping any whose inlognaam already exists.
 */
async function seedDefaults() {
    for (const g of DEFAULT_GEBRUIKERS) {
        await pool.execute(
            'INSERT IGNORE INTO gebruikers (voornaam, achternaam, inlognaam, wachtwoord, taak) VALUES (?, ?, ?, ?, ?)',
            [g.voornaam, g.achternaam, g.inlognaam, g.wachtwoord, g.taak]
        );
    }
}

module.exports = { findByLogin, getAll, create, update, remove, seedDefaults };
