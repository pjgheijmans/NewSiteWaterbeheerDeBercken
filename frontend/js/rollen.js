/**
 * Rollenbeheer — de rechtenmatrix (rol × domein) ophalen, renderen en opslaan.
 */
class RollenModule {
    /** @param {Application} app */
    constructor(app) {
        this.app = app;
    }

    /** Domeinen in vaste kolomvolgorde: [sleutel, label]. */
    static get DOMEINEN() {
        return [
            ['beheer', 'Beheer'],
            ['waterbeheer', 'Waterbeheer'],
            ['coordinator', 'Coördinator'],
        ];
    }

    /** Niveaus in oplopende macht: [waarde, label]. */
    static get NIVEAUS() {
        return [
            ['geen', 'Geen'],
            ['lezen', 'Lezen'],
            ['schrijven', 'Schrijven'],
        ];
    }

    _setSaveStatus(status) {
        const el = document.getElementById('rollenSaveStatus');
        if (!el) return;
        const states = {
            pending: ['Wijzigingen niet opgeslagen...', '#888'],
            saving: ['Bewaren…', '#fd7e14'],
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

    /** Laad alle rollen en render de matrix. */
    async laad() {
        try {
            const res = await this.app.api.call('/api/rollen');
            const rollen = await res.json();
            const tbody = document.getElementById('rollenTbody');
            tbody.innerHTML = '';
            rollen.forEach((rol) => tbody.appendChild(this._rij(rol)));
        } catch {
            this.app.ui.toonBericht('Fout bij laden rollen.', 'fout');
        }
    }

    /** @private Bouw een <select> voor het niveau van een domein. */
    _selectHtml(domein, niveau) {
        const opts = RollenModule.NIVEAUS.map(
            ([v, l]) => `<option value="${v}" ${niveau === v ? 'selected' : ''}>${l}</option>`,
        ).join('');
        return `<select class="r-niveau" data-domein="${domein}">${opts}</select>`;
    }

    /** @private Bouw de tabelrij voor één rol. */
    _rij(rol) {
        const tr = document.createElement('tr');
        tr.id = `rol-rij-${rol.id}`;
        const cellen = RollenModule.DOMEINEN.map(
            ([d]) => `<td>${this._selectHtml(d, (rol.rechten && rol.rechten[d]) || 'geen')}</td>`,
        ).join('');
        tr.innerHTML = `
            <td><input type="text" class="r-n" value="${rol.naam}"></td>
            ${cellen}
            <td style="text-align:center;"><input type="checkbox" class="r-h" ${rol.mag_historie_bewerken ? 'checked' : ''}></td>
            <td><button onclick="verwijderRol(${rol.id})" style="background:#dc3545;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;">Wissen</button></td>`;
        tr.querySelectorAll('input, select').forEach((el) => {
            el.addEventListener('input', () => this._scheduleAutoSave(rol.id));
            el.addEventListener('change', () => this._scheduleAutoSave(rol.id));
        });
        return tr;
    }

    _scheduleAutoSave(id) {
        const timers = this.app.state.rollenSaveTimers;
        if (timers[id]) clearTimeout(timers[id]);
        this._setSaveStatus('pending');
        timers[id] = setTimeout(() => {
            this._setSaveStatus('saving');
            this._wijzigRol(id);
        }, 1200);
    }

    /** @private */
    async _wijzigRol(id) {
        const rij = document.getElementById(`rol-rij-${id}`);
        if (!rij) return;
        const rechten = {};
        rij.querySelectorAll('.r-niveau').forEach((sel) => {
            rechten[sel.dataset.domein] = sel.value;
        });
        const payload = {
            naam: rij.querySelector('.r-n').value,
            mag_historie_bewerken: rij.querySelector('.r-h').checked,
            rechten,
        };
        try {
            const res = await this.app.api.call(`/api/rollen/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) this._setSaveStatus('saved');
            else {
                this._setSaveStatus('error');
                this.app.ui.toonBericht('Fout bij opslaan rol.', 'fout');
            }
        } catch {
            this._setSaveStatus('error');
        }
    }

    /** Voeg een nieuwe (lege) rol toe; rechten zet je daarna in de matrix. */
    async voegRolToe() {
        const naamEl = document.getElementById('r-naam');
        const naam = naamEl.value.trim();
        if (!naam) {
            this.app.ui.toonBericht('Geef een rolnaam op.', 'fout');
            return;
        }
        const res = await this.app.api.call('/api/rollen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ naam }),
        });
        if (res.ok) {
            naamEl.value = '';
            this.app.ui.toonBericht('Rol toegevoegd!', 'succes');
            this.laad();
        } else {
            this.app.ui.toonBericht('Rol bestaat waarschijnlijk al.', 'fout');
        }
    }

    /**
     * Verwijder een rol na bevestiging. Gebruikers die de rol hadden, verliezen hem.
     * @param {number} id
     */
    async verwijderRol(id) {
        if (
            !(await this.app.ui.bevestig({
                titel: 'Rol wissen',
                tekst: 'Weet u zeker dat u deze rol wilt wissen? Gebruikers met deze rol verliezen de bijbehorende rechten.',
                bevestig: 'Wissen',
                gevaar: true,
            }))
        )
            return;
        const res = await this.app.api.call(`/api/rollen/${id}`, { method: 'DELETE' });
        if (res.ok) {
            this.app.ui.toonBericht('Rol gewist.', 'succes');
            this.laad();
        }
    }
}

// Node/Jest: maak de klasse importeerbaar. In de browser bestaat `module` niet.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RollenModule;
}
