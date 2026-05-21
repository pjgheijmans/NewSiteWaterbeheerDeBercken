/**
 * Load the full gebruikers list from the backend and render it in the management table.
 */
async function laadGebruikers() {
        try {
            const res = await apiCall('/api/gebruikers');
            const gebruikers = await res.json();
            const tbody = document.getElementById('gebruikersTbody');
            tbody.innerHTML = '';
            gebruikers.forEach(g => {
                tbody.innerHTML += `<tr id="gebruiker-rij-${g.id}">
                    <td><input type="text" class="g-v" value="${g.voornaam}"></td>
                    <td><input type="text" class="g-a" value="${g.achternaam}"></td>
                    <td><input type="text" class="g-i" value="${g.inlognaam}"></td>
                    <td><input type="text" class="g-w" value="${g.wachtwoord}"></td>
                    <td><select class="g-t"><option value="waterbeheerder" ${g.taak === 'waterbeheerder' ? 'selected' : ''}>Waterbeheerder</option><option value="coordinator" ${g.taak === 'coordinator' ? 'selected' : ''}>Coördinator</option><option value="Administrator" ${g.taak === 'Administrator' ? 'selected' : ''}>Administrator</option></select></td>
                    <td><button onclick="wijzigGebruiker(${g.id})" style="background:#007BFF; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Update</button>
                        <button onclick="verwijderGebruiker(${g.id})" style="background:#dc3545; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Wissen</button></td></tr>`;
            });
        } catch (f) { toonBericht('Fout bij laden gebruikers.', 'fout'); }
    }

/**
 * Create a new user account from the form values and refresh the user list.
 */
async function voegGebruikerToe() {
        const payload = {
            voornaam: document.getElementById('g-voornaam').value, achternaam: document.getElementById('g-achternaam').value,
            inlognaam: document.getElementById('g-inlognaam').value, wachtwoord: document.getElementById('g-wachtwoord').value, taak: document.getElementById('g-taak').value
        };
        const res = await apiCall('/api/gebruikers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) { toonBericht('Gebruiker toegevoegd!', 'succes');['g-voornaam', 'g-achternaam', 'g-inlognaam', 'g-wachtwoord'].forEach(id => document.getElementById(id).value = ''); laadGebruikers(); }
        else { toonBericht('Inlognaam bestaat waarschijnlijk al.', 'fout'); }
    }

/**
 * Save updated values for an existing user row by id.
 * @param {number} id - The database id of the user to update.
 */
async function wijzigGebruiker(id) {
        const rij = document.getElementById(`gebruiker-rij-${id}`);
        const payload = {
            voornaam: rij.querySelector('.g-v').value, achternaam: rij.querySelector('.g-a').value,
            inlognaam: rij.querySelector('.g-i').value, wachtwoord: rij.querySelector('.g-w').value, taak: rij.querySelector('.g-t').value
        };
        const res = await apiCall(`/api/gebruikers/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) { toonBericht('Gebruiker succesvol bijgewerkt!', 'succes'); laadGebruikers(); }
    }

/**
 * Delete a user after confirmation and refresh the list.
 * @param {number} id - The database id of the user to remove.
 */
async function verwijderGebruiker(id) {
        if (confirm('Weet u zeker dat u deze gebruiker wilt wissen?')) {
            const res = await apiCall(`/api/gebruikers/${id}`, { method: 'DELETE' });
            if (res.ok) { toonBericht('Gebruiker gewist.', 'succes'); laadGebruikers(); }
        }
    }
