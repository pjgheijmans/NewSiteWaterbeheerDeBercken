const pool = require('../db');

async function findByLogin(inlognaam, wachtwoord) {
    const [rows] = await pool.execute(
        'SELECT id, voornaam, achternaam, inlognaam, taak FROM gebruikers WHERE inlognaam = ? AND wachtwoord = ?',
        [inlognaam, wachtwoord]
    );
    return rows[0] || null;
}

async function getAll() {
    const [rows] = await pool.execute(
        'SELECT id, voornaam, achternaam, inlognaam, wachtwoord, taak FROM gebruikers'
    );
    return rows;
}

async function create({ voornaam, achternaam, inlognaam, wachtwoord, taak }) {
    await pool.execute(
        'INSERT INTO gebruikers (voornaam, achternaam, inlognaam, wachtwoord, taak) VALUES (?, ?, ?, ?, ?)',
        [voornaam, achternaam, inlognaam, wachtwoord, taak]
    );
}

async function update(id, { voornaam, achternaam, inlognaam, wachtwoord, taak }) {
    await pool.execute(
        'UPDATE gebruikers SET voornaam=?, achternaam=?, inlognaam=?, wachtwoord=?, taak=? WHERE id=?',
        [voornaam, achternaam, inlognaam, wachtwoord, taak, id]
    );
}

async function remove(id) {
    await pool.execute('DELETE FROM gebruikers WHERE id = ?', [id]);
}

module.exports = { findByLogin, getAll, create, update, remove };
