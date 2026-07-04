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
            saving: ['Opslaan', '#fd7e14'],
            saved: ['✓ Opgeslagen', '#28a745'],
            error: ['✕ Fout bij opslaan', '#dc3545'],
        };
        const [text, color] = states[status] || ['', '#333'];
        el.textContent = text;
        el.style.color = color;
        if (status === 'saved')
            setTimeout(() => {
                if (el.textContent.startsWith('✓')) el.textContent = '';
            }, 4000);
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

    /** @private Bouw rol-selectievakjes; vink de toegekende rollen aan. */
    _rolCheckboxes(geselecteerd) {
        const ids = (geselecteerd || []).map(Number);
        return (this._rollen || [])
            .map(
                (rol) => `<label style="display:block; margin:0 0 4px 0; white-space:nowrap;">
                <input type="checkbox" class="g-r" value="${rol.id}" ${ids.includes(rol.id) ? 'checked' : ''}> ${rol.naam}</label>`,
            )
            .join('');
    }

    /** Laad alle gebruikers (en de beschikbare rollen) en render de beheertabel. */
    async laadGebruikers() {
        try {
            const rolRes = await this.app.api.call('/api/rollen');
            this._rollen = await rolRes.json();
            const res = await this.app.api.call('/api/gebruikers');
            const gebruikers = await res.json();
            const tbody = document.getElementById('gebruikersTbody');
            tbody.innerHTML = '';
            gebruikers.forEach((g) => {
                const tr = document.createElement('tr');
                tr.id = `gebruiker-rij-${g.id}`;
                tr.innerHTML = `
                    <td><input type="text" class="g-v" value="${g.voornaam}"></td>
                    <td><input type="text" class="g-a" value="${g.achternaam}"></td>
                    <td><input type="text" class="g-i" value="${g.inlognaam}"></td>
                    <td><input type="password" class="g-w" value="" placeholder="•••• (ongewijzigd)"></td>
                    <td>${this._rolCheckboxes(g.rol_ids)}</td>
                    <td><button onclick="verwijderGebruiker(${g.id})" style="background:#dc3545;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;">Wissen</button></td>`;
                tbody.appendChild(tr);
                tr.querySelectorAll('input, select').forEach((el) => {
                    el.addEventListener('input', () => this._scheduleAutoSave(g.id));
                    el.addEventListener('change', () => this._scheduleAutoSave(g.id));
                });
            });
            // Selectievakjes voor de nieuwe-gebruiker-rij.
            const nieuw = document.getElementById('g-rollen-nieuw');
            if (nieuw) nieuw.innerHTML = this._rolCheckboxes([]);
        } catch {
            this.app.ui.toonBericht('Fout bij laden gebruikers.', 'fout');
        }
    }

    /** Voeg een nieuwe gebruiker toe via het aanmaakformulier. */
    async voegGebruikerToe() {
        const rol_ids = [...document.querySelectorAll('#g-rollen-nieuw .g-r:checked')].map((c) =>
            Number(c.value),
        );
        const payload = {
            voornaam: document.getElementById('g-voornaam').value,
            achternaam: document.getElementById('g-achternaam').value,
            inlognaam: document.getElementById('g-inlognaam').value,
            wachtwoord: document.getElementById('g-wachtwoord').value,
            rol_ids,
        };
        const res = await this.app.api.call('/api/gebruikers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (res.ok) {
            this.app.ui.toonBericht('Gebruiker toegevoegd!', 'succes');
            ['g-voornaam', 'g-achternaam', 'g-inlognaam', 'g-wachtwoord'].forEach((id) => {
                document.getElementById(id).value = '';
            });
            this.laadGebruikers();
        } else {
            this.app.ui.toonBericht('Inlognaam bestaat waarschijnlijk al.', 'fout');
        }
    }

    /** @private */
    async _wijzigGebruiker(id) {
        const rij = document.getElementById(`gebruiker-rij-${id}`);
        const payload = {
            voornaam: rij.querySelector('.g-v').value,
            achternaam: rij.querySelector('.g-a').value,
            inlognaam: rij.querySelector('.g-i').value,
            wachtwoord: rij.querySelector('.g-w').value,
            rol_ids: [...rij.querySelectorAll('.g-r:checked')].map((c) => Number(c.value)),
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
        if (
            !(await this.app.ui.bevestig({
                titel: 'Gebruiker wissen',
                tekst: 'Weet u zeker dat u deze gebruiker wilt wissen?',
                bevestig: 'Wissen',
                gevaar: true,
            }))
        )
            return;
        const res = await this.app.api.call(`/api/gebruikers/${id}`, { method: 'DELETE' });
        if (res.ok) {
            this.app.ui.toonBericht('Gebruiker gewist.', 'succes');
            this.laadGebruikers();
        }
    }
}

// Node/Jest: exporteer de klasse zodat hij in jsdom-tests gebruikt kan worden.
// In de browser bestaat `module` niet en wordt dit genegeerd.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GebruikersModule;
}
