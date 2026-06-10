/**
 * Gebruikersbeheer — CRUD en auto-save.
 */
class GebruikersModule {
    /** @param {Application} app */
    constructor(app) {
        this.app = app;
    }

    _setSaveStatus(status) {
        const el = document.getElementById('gebruikersSaveStatus');
        if (!el) return;
        const states = {
            pending: ['Wijzigingen niet opgeslagen...', '#888'],
            saving:  ['Bewaren…',                       '#fd7e14'],
            saved:   ['✓ Opgeslagen',                   '#28a745'],
            error:   ['✕ Fout bij opslaan',             '#dc3545'],
        };
        const [text, color] = states[status] || ['', '#333'];
        el.textContent = text;
        el.style.color = color;
        if (status === 'saved')
            setTimeout(() => { if (el.textContent.startsWith('✓')) el.textContent = ''; }, 4000);
    }

    _scheduleAutoSave(id) {
        const timers = this.app.state.gebruikersSaveTimers;
        if (timers[id]) clearTimeout(timers[id]);
        this._setSaveStatus('pending');
        timers[id] = setTimeout(async () => {
            this._setSaveStatus('saving');
            await this._wijzigGebruiker(id);
        }, 1200);
    }

    /** Laad alle gebruikers en render de beheertabel. */
    async laadGebruikers() {
        try {
            const res       = await this.app.api.call('/api/gebruikers');
            const gebruikers = await res.json();
            const tbody     = document.getElementById('gebruikersTbody');
            tbody.innerHTML = '';
            gebruikers.forEach(g => {
                const tr = document.createElement('tr');
                tr.id    = `gebruiker-rij-${g.id}`;
                tr.innerHTML = `
                    <td><input type="text" class="g-v" value="${g.voornaam}"></td>
                    <td><input type="text" class="g-a" value="${g.achternaam}"></td>
                    <td><input type="text" class="g-i" value="${g.inlognaam}"></td>
                    <td><input type="password" class="g-w" value="" placeholder="•••• (ongewijzigd)"></td>
                    <td><select class="g-t">
                        <option value="waterbeheerder" ${g.taak === 'waterbeheerder' ? 'selected' : ''}>Waterbeheerder</option>
                        <option value="coordinator"    ${g.taak === 'coordinator'    ? 'selected' : ''}>Coördinator</option>
                        <option value="Administrator"  ${g.taak === 'Administrator'  ? 'selected' : ''}>Administrator</option>
                    </select></td>
                    <td><button onclick="verwijderGebruiker(${g.id})" style="background:#dc3545;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;">Wissen</button></td>`;
                tbody.appendChild(tr);
                tr.querySelectorAll('input, select').forEach(el => {
                    el.addEventListener('input',  () => this._scheduleAutoSave(g.id));
                    el.addEventListener('change', () => this._scheduleAutoSave(g.id));
                });
            });
        } catch { this.app.ui.toonBericht('Fout bij laden gebruikers.', 'fout'); }
    }

    /** Voeg een nieuwe gebruiker toe via het aanmaakformulier. */
    async voegGebruikerToe() {
        const payload = {
            voornaam:   document.getElementById('g-voornaam').value,
            achternaam: document.getElementById('g-achternaam').value,
            inlognaam:  document.getElementById('g-inlognaam').value,
            wachtwoord: document.getElementById('g-wachtwoord').value,
            taak:       document.getElementById('g-taak').value,
        };
        const res = await this.app.api.call('/api/gebruikers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (res.ok) {
            this.app.ui.toonBericht('Gebruiker toegevoegd!', 'succes');
            ['g-voornaam','g-achternaam','g-inlognaam','g-wachtwoord']
                .forEach(id => { document.getElementById(id).value = ''; });
            this.laadGebruikers();
        } else {
            this.app.ui.toonBericht('Inlognaam bestaat waarschijnlijk al.', 'fout');
        }
    }

    /** @private */
    async _wijzigGebruiker(id) {
        const rij = document.getElementById(`gebruiker-rij-${id}`);
        const payload = {
            voornaam:   rij.querySelector('.g-v').value,
            achternaam: rij.querySelector('.g-a').value,
            inlognaam:  rij.querySelector('.g-i').value,
            wachtwoord: rij.querySelector('.g-w').value,
            taak:       rij.querySelector('.g-t').value,
        };
        const res = await this.app.api.call(`/api/gebruikers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (res.ok) {
            this._setSaveStatus('saved');
        } else {
            this._setSaveStatus('error');
            this.app.ui.toonBericht('Fout bij opslaan gebruiker.', 'fout');
        }
    }

    /**
     * Verwijder een gebruiker na bevestiging.
     * @param {number} id
     */
    async verwijderGebruiker(id) {
        if (!(await this.app.ui.bevestig({ titel: 'Gebruiker wissen', tekst: 'Weet u zeker dat u deze gebruiker wilt wissen?', bevestig: 'Wissen', gevaar: true }))) return;
        const res = await this.app.api.call(`/api/gebruikers/${id}`, { method: 'DELETE' });
        if (res.ok) { this.app.ui.toonBericht('Gebruiker gewist.', 'succes'); this.laadGebruikers(); }
    }
}
