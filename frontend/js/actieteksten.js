/**
 * Actie-teksten — ophalen, renderen en opslaan van de tekst-sjablonen
 * waarmee acties worden gegenereerd. Alleen voor de Administrator.
 */
class ActieTekstenModule {
    /** @param {Application} app */
    constructor(app) {
        this.app = app;
    }

    // ── Statusbalk ────────────────────────────────────────────────────────

    setSaveStatus(status) {
        this.app.ui.zetOpslaanStatus(document.getElementById('actieTekstenSaveStatus'), status);
    }

    // ── Auto-save ─────────────────────────────────────────────────────────

    scheduleAutoSave() {
        const state = this.app.state;
        if (state.actieTekstenAutoSaveTimer) clearTimeout(state.actieTekstenAutoSaveTimer);
        this.setSaveStatus('pending');
        state.actieTekstenAutoSaveTimer = setTimeout(async () => {
            this.setSaveStatus('saving');
            await this.verwerkOpslaan();
        }, 1200);
    }

    // ── Plaatshouders ─────────────────────────────────────────────────────

    /**
     * Vul de plaatshouders ({bad}, {drempel}, {waarde}) in een sjabloon.
     * Spiegelt ActieTekstenRepository.render in de backend; gebruikt voor de
     * live voorbeeldweergave.
     * @param {string} sjabloon
     * @param {Object} params
     * @returns {string}
     */
    vulPlaatshouders(sjabloon, params) {
        return String(sjabloon).replace(/\{(\w+)\}/g, (_m, sleutel) =>
            sleutel in params ? String(params[sleutel]) : '',
        );
    }

    /** Voorbeeldwaarden voor de live preview. */
    static get VOORBEELD() {
        return { bad: 'Diep', drempel: '0.4', waarde: '1.25' };
    }

    // ── Laden ─────────────────────────────────────────────────────────────

    /** Laad de sjablonen van de server en render de beheertabel. */
    async laadVanServer() {
        try {
            const res = await this.app.api.call('/api/actieteksten');
            const teksten = await res.json();
            this._bouwBeheertabel(teksten);
        } catch (f) {
            console.error('Kon actie-teksten niet laden', f);
        }
    }

    /** Vul de standaardteksten in en sla direct op. */
    async laadStandaardActieTeksten() {
        if (
            !(await this.app.ui.bevestig({
                tekst: 'Standaardteksten invullen? Dit overschrijft de huidige teksten.',
                bevestig: 'Invullen',
            }))
        )
            return;
        try {
            const res = await this.app.api.call('/api/actieteksten/defaults');
            const defaults = await res.json();
            const perSleutel = {};
            defaults.forEach((d) => {
                perSleutel[d.actie_sleutel] = d.sjabloon;
            });
            document.querySelectorAll('[data-actie-sleutel]').forEach((rij) => {
                const sleutel = rij.getAttribute('data-actie-sleutel');
                if (!(sleutel in perSleutel)) return;
                const input = rij.querySelector('.at-sjabloon');
                input.value = perSleutel[sleutel];
                this._verversPreview(rij);
            });
            this.scheduleAutoSave();
        } catch {
            this.app.ui.toonBericht('Kon standaardteksten niet ophalen.', 'fout');
        }
    }

    // ── Renderen ──────────────────────────────────────────────────────────

    _bouwBeheertabel(teksten) {
        const container = document.getElementById('actieTekstenGroep');
        container.innerHTML = '';

        const box = document.createElement('div');
        box.className = 'categorie-box';
        let html = `<table class="categorie-tabel">
            <thead><tr><th>Actie</th><th>Tekst-sjabloon</th><th>Voorbeeld</th></tr></thead><tbody>`;
        teksten.forEach((t) => {
            const omschrijving = t.omschrijving || t.actie_sleutel;
            html += `<tr data-actie-sleutel="${t.actie_sleutel}">
                <td><b>${omschrijving}</b><br><code style="font-size:11px;color:#888;">${t.actie_sleutel}</code></td>
                <td><input type="text" class="at-sjabloon" style="width:100%;" value="${this._escape(t.sjabloon)}"></td>
                <td class="at-preview" style="font-size:12px;color:#555;"></td></tr>`;
        });
        html += '</tbody></table>';
        box.innerHTML = html;
        container.appendChild(box);

        box.querySelectorAll('[data-actie-sleutel]').forEach((rij) => {
            this._verversPreview(rij);
            rij.querySelector('.at-sjabloon').addEventListener('input', () => {
                this._verversPreview(rij);
                this.scheduleAutoSave();
            });
        });
    }

    /** Werk de voorbeeldkolom van één rij bij op basis van het huidige sjabloon. */
    _verversPreview(rij) {
        const sjabloon = rij.querySelector('.at-sjabloon').value;
        const cel = rij.querySelector('.at-preview');
        if (cel) cel.textContent = this.vulPlaatshouders(sjabloon, ActieTekstenModule.VOORBEELD);
    }

    /** Escape dubbele quotes voor gebruik in een HTML value-attribuut. */
    _escape(s) {
        return String(s).replace(/"/g, '&quot;');
    }

    // ── Opslaan ───────────────────────────────────────────────────────────

    async verwerkOpslaan(autoSave = true) {
        const rijen = document.querySelectorAll('[data-actie-sleutel]');
        let teller = 0;
        for (const rij of rijen) {
            const payload = {
                actie_sleutel: rij.getAttribute('data-actie-sleutel'),
                sjabloon: rij.querySelector('.at-sjabloon').value,
            };
            try {
                const res = await this.app.api.call('/api/actieteksten', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (res.ok) teller++;
            } catch (f) {
                console.error(f);
            }
        }
        if (teller === rijen.length) {
            this.setSaveStatus('saved');
            if (!autoSave) this.app.ui.toonBericht('Actie-teksten bijgewerkt!', 'succes');
        } else {
            this.setSaveStatus('error');
            this.app.ui.toonBericht('Fout bij opslaan van actie-teksten.', 'fout');
        }
    }
}

// Node/Jest: maak de klasse importeerbaar. In de browser bestaat `module` niet.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ActieTekstenModule;
}
