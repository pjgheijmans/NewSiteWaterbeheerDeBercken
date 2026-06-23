/**
 * Taken — de unieke weergave van rondetaken + acties.
 *
 * Eén concept per bad: standaard dagelijkse taken (rondetaken) plus getriggerde
 * alarmen (acties), samengesteld door de backend (`/api/taken`). Gerenderd als
 * een "Taken"-subtab per bad-pagina en als globaal "Te doen"-overzicht. Schrijf-
 * acties hergebruiken de bestaande rondetaken-/acties-endpoints (zie `bron`).
 */
class TakenModule {
    /** @param {Application} app */
    constructor(app) {
        this.app = app;
        this._items = [];
    }

    async _haalOp(datum) {
        const res = await this.app.api.call(`/api/taken?datum=${datum}`);
        const data = await res.json();
        return Array.isArray(data) ? data : [];
    }

    // ── Laden ───────────────────────────────────────────────────────────────

    /** Alleen de tab-/subtab-badges verversen (bij het normale waterbeheer-laden). */
    async werkBadgeBij(datum) {
        if (!datum) return;
        try {
            this._items = await this._haalOp(datum);
            this._zetBadges();
        } catch (f) {
            console.error('Fout bij verversen taken-badges:', f);
        }
    }

    /** Laad data en render de Taken-subtab van een bad-pagina. */
    async laadBadTaken(pagina, datum) {
        if (!datum) return;
        try {
            this._items = await this._haalOp(datum);
            this._zetBadges();
            this._renderBad(pagina);
        } catch (f) {
            console.error('Fout bij laden taken:', f);
        }
    }

    /** Na een wijziging: herlaad en ververs de (mogelijk zichtbare) bad-weergaven + badges. */
    async _herlaadAlles(datum) {
        this._items = await this._haalOp(datum);
        this._zetBadges();
        this._renderBad('grote-baden');
        this._renderBad('peuterbad');
    }

    // ── Acties ────────────────────────────────────────────────────────────────

    async toggle(sleutel, voltooid) {
        const datum = document.getElementById('centraleDatum').value;
        const item = this._items.find((i) => i.sleutel === sleutel);
        if (!item) return;
        try {
            if (item.bron.type === 'rondetaak') {
                const endpoint = voltooid ? 'voltooi' : 'heropen';
                await this.app.api.call(`/api/rondetaken/${item.bron.sleutel}/${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ datum }),
                });
            } else {
                const endpoint = voltooid ? 'resolve' : 'unresolve';
                await Promise.all(
                    item.bron.ids.map((id) =>
                        this.app.api.call(`/api/acties/${id}/${endpoint}`, { method: 'POST' }),
                    ),
                );
            }
            await this._herlaadAlles(datum);
            this.app.ui.toonBericht(voltooid ? 'Taak afgevinkt!' : 'Taak heropend.', 'succes');
        } catch (f) {
            console.error('Fout bij bijwerken taak:', f);
        }
    }

    // ── Renderen ──────────────────────────────────────────────────────────────

    static get GEBIED_VOLGORDE() {
        return {
            'grote-baden': ['Diep', 'Ondiep', 'Glijbaan', 'Speeltoestel', 'Douches', 'Algemeen'],
            peuterbad: ['Peuterbad', 'Spraypark'],
        };
    }

    /** Positie van een gebied binnen de vaste volgorde van een pagina. */
    static _gebiedIndex(pagina, gebied) {
        const i = TakenModule.GEBIED_VOLGORDE[pagina].indexOf(gebied);
        return i === -1 ? 99 : i;
    }

    /** Open (niet-afgehandelde) items eerst, daarna afgehandelde. */
    static _openEerst(a, b) {
        return (a.voltooid ? 1 : 0) - (b.voltooid ? 1 : 0);
    }

    /** Achtergrondtint per categorie voor een open (niet-afgehandelde) rij. */
    static _categorieTint(categorie) {
        if (categorie === 'verplicht') return '#fff5f5'; // lichtrood
        if (categorie === 'belangrijk') return '#fff9e6'; // lichtamber
        return ''; // overig: geen tint
    }

    _rij(item) {
        const done = item.voltooid;
        const tijd = item.voltooid_op
            ? String(item.voltooid_op).slice(0, 16).replace('T', ' ')
            : '';
        const door = item.voltooid_door ? ` door ${item.voltooid_door}` : '';
        const nadruk = item.categorie === 'verplicht' || item.categorie === 'belangrijk';
        const labelCel = done
            ? `<span style="text-decoration:line-through;">${item.label}</span>
               <span style="font-size:12px;color:#28a745;display:block;">✓ Uitgevoerd${door}${tijd ? ' om ' + tijd : ''}</span>`
            : nadruk
              ? `<b>${item.label}</b>`
              : item.label;
        const reden = item.reden
            ? done
                ? `<span style="text-decoration:line-through;">${item.reden}</span>`
                : item.reden
            : '';
        const tint = TakenModule._categorieTint(item.categorie);
        const rijStijl = done
            ? ' style="background:#f0fff0;color:#555;"'
            : tint
              ? ` style="background:${tint};"`
              : '';
        const sleutel = String(item.sleutel).replace(/'/g, "\\'");
        return `
            <tr${rijStijl}>
                <td><b>${item.gebied}</b></td>
                <td>${labelCel}</td>
                <td>${reden}</td>
                <td style="text-align:center;">
                    <input type="checkbox" ${done ? 'checked' : ''}
                        onchange="toggleTaak('${sleutel}', this.checked)"
                        style="width:18px;height:18px;cursor:pointer;">
                </td>
            </tr>`;
    }

    _sectieBox(titel, kleur, items) {
        const open = items.filter((i) => !i.voltooid).length;
        return `
            <div class="categorie-box">
                <h3 style="color:${kleur};">${titel}${open > 0 ? ` (${open} open)` : ''}</h3>
                <table class="categorie-tabel">
                    <thead><tr><th>Gebied</th><th>Taak</th><th>Reden</th><th style="text-align:center;width:110px;">Uitgevoerd</th></tr></thead>
                    <tbody>${items.map((i) => this._rij(i)).join('')}</tbody>
                </table>
            </div>`;
    }

    /**
     * Rendert de Taken-subtab als drie duidelijk gescheiden secties:
     *  - "Verplicht vandaag" — getriggerde alarmen die uitgevoerd moeten worden;
     *  - "Belangrijk" — kritieke rondetaken (regelaars/spraypark): belangrijk, niet verplicht;
     *  - "Overige taken" — de overige (optionele) rondetaken.
     * Alle gesorteerd op gebiedsvolgorde, open items eerst.
     */
    _renderBad(pagina) {
        const id = pagina === 'peuterbad' ? 'peuterbad-taken-inhoud' : 'grote-baden-taken-inhoud';
        const el = document.getElementById(id);
        if (!el) return;
        const items = this._items
            .filter((i) => i.pagina === pagina)
            .sort((a, b) => {
                const g =
                    TakenModule._gebiedIndex(pagina, a.gebied) -
                    TakenModule._gebiedIndex(pagina, b.gebied);
                return g !== 0 ? g : TakenModule._openEerst(a, b);
            });
        const verplicht = items.filter((i) => i.categorie === 'verplicht');
        const belangrijk = items.filter((i) => i.categorie === 'belangrijk');
        const overig = items.filter((i) => i.categorie === 'overig');
        let html = '';
        if (verplicht.length) html += this._sectieBox('Verplicht vandaag', '#dc3545', verplicht);
        if (belangrijk.length) html += this._sectieBox('Belangrijk', '#fd7e14', belangrijk);
        if (overig.length) html += this._sectieBox('Overige taken', '#0d6efd', overig);
        el.innerHTML =
            html ||
            `<div class="categorie-box" style="color:#28a745;">Geen taken voor deze dag.</div>`;
    }

    // ── Badges ──────────────────────────────────────────────────────────────

    _zetBadges() {
        // Alleen openstaande Verplicht-taken (echte alarmen) verdienen de ⚠-markering.
        const openVerplicht = this._items.filter((i) => i.categorie === 'verplicht' && !i.voltooid);

        // Bad-paginatabs + Taken-subtabs: ⚠ als er open verplichte taken op die pagina staan.
        const groteOpen = openVerplicht.some((i) => i.pagina === 'grote-baden');
        const peuterOpen = openVerplicht.some((i) => i.pagina === 'peuterbad');
        this._zetMarker('tab-grote-baden', 'Diep / Ondiep', groteOpen);
        this._zetMarker('tab-peuterbad', 'Peuterbad', peuterOpen);
        this._zetMarker('subtab-taken', 'Taken', groteOpen);
        this._zetMarker('subtab-peuterbad-taken', 'Taken', peuterOpen);
    }

    _zetMarker(id, label, heeft) {
        const btn = document.getElementById(id);
        if (!btn) return;
        // Werk alleen het label en de eigen ⚠-marker bij; andere markeringen op de
        // knop (zoals het volledigheids-bolletje van metingen) blijven staan.
        const tekstKnoop = [...btn.childNodes].find((n) => n.nodeType === Node.TEXT_NODE);
        if (tekstKnoop) tekstKnoop.textContent = label;
        else btn.insertBefore(document.createTextNode(label), btn.firstChild);
        let marker = btn.querySelector('.tab-actie-indicator');
        if (heeft) {
            if (!marker) {
                marker = document.createElement('span');
                marker.className = 'tab-actie-indicator';
                marker.textContent = '⚠';
                marker.title = 'Openstaande taak/taken';
                btn.appendChild(marker);
            }
        } else if (marker) {
            marker.remove();
        }
    }
}

// Node/Jest: exporteer de klasse zodat pure helpers getest kunnen worden.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TakenModule;
}
