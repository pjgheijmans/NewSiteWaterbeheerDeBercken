/**
 * Verbruik en verwarmingssysteem — laden, opslaan en berekeningen.
 */
class VerbruikModule {
    /** @param {Application} app */
    constructor(app) {
        this.app = app;
    }

    /**
     * Bereken het dagverbruik als verschil van twee meterstanden.
     * Pure functie: '-' als de huidige stand ontbreekt/niet-numeriek is,
     * anders afgeronde huidige stand minus afgeronde vorige stand (vorige = 0 indien leeg).
     * @param {number|string|null|undefined} huidig
     * @param {number|string|null|undefined} vorige
     * @returns {string}
     */
    static berekenVerbruik(huidig, vorige) {
        const h = parseFloat(huidig);
        if (isNaN(h)) return '-';
        const v = parseFloat(vorige) || 0;
        return String(Math.round(h) - Math.round(v));
    }

    /** Laad verbruik- en verwarmingssysteem-velden voor de geselecteerde datum. */
    async laadWaterbeheerVelden() {
        const datum = document.getElementById('centraleDatum').value;
        try {
            const [verbruikRes, warmteRes] = await Promise.all([
                this.app.api.call(`/api/verbruik/diep-ondiep?datum=${datum}`),
                this.app.api.call(`/api/verbruik/verwarmingssysteem?datum=${datum}`),
            ]);
            const verbruikData = await verbruikRes.json();
            const warmteData = await warmteRes.json();
            const data = { ...verbruikData, ...warmteData };
            this.app.state.gecachteVerbruik = data; // voor de volledigheids-markering
            // Versie-meta per record bewaren (verbruik en verwarming zijn aparte records).
            this._onthoudVersie('verbruik', verbruikData);
            this._onthoudVersie('verwarming', warmteData);

            document.getElementById('Flocculant').value = data.Flocculant || '';
            document.getElementById('water-diep').value = data.water_diep || '';
            document.getElementById('water-ondiep').value = data.water_ondiep || '';
            document.getElementById('water-totaal').value = data.water_totaal || '';
            document.getElementById('elektriciteit-nacht').value = data.elektriciteit_nacht || '';
            document.getElementById('elektriciteit-dag').value = data.elektriciteit_dag || '';
            document.getElementById('gas').value = data.gas || '';
            document.getElementById('chemicalien-chloor').value = data.chemicalien_chloor || '';
            document.getElementById('chemicalien-zwavelzuur').value =
                data.chemicalien_zwavelzuur || '';
            document.getElementById('systeem-status-1').checked = data.verwarming_status_1 === 1;
            document.getElementById('systeem-status-2').checked = data.verwarming_status_2 === 1;
            document.getElementById('systeem-status-3').checked = data.verwarming_status_3 === 1;
            document.getElementById('systeem-status-4').checked = data.verwarming_status_4 === 1;
            document.getElementById('systeem-druk-ok').checked = data.verwarming_druk_ok === 1;
            document.getElementById('visuele-inspectie').checked =
                data.verwarming_visuele_controle === 1;
        } catch (f) {
            console.error('Fout bij laden algemene velden:', f);
        }
    }

    /**
     * Haal en cache alleen de Diep/Ondiep-verbruikstanden (zonder de DOM te vullen),
     * zodat het volledigheids-bolletje op de Diep/Ondiep-pagina-tab ook klopt terwijl
     * de Peuterbad-pagina actief is. Vult `state.gecachteVerbruik`.
     */
    async cacheGroteBadenVerbruik() {
        const datum = document.getElementById('centraleDatum').value;
        try {
            const res = await this.app.api.call(`/api/verbruik/diep-ondiep?datum=${datum}`);
            const data = await res.json();
            this.app.state.gecachteVerbruik = data;
            this._onthoudVersie('verbruik', data);
        } catch (f) {
            console.error('Fout bij cachen verbruikstanden:', f);
        }
    }

    /** Bewaar de versie/auteur/bijgewerkt_op-meta van een verbruik-/verwarmingsrecord. */
    _onthoudVersie(sleutel, data) {
        if (!data) return; // mislukte JSON-parse: houd de bestaande versie aan
        this.app.state.versies[sleutel] = {
            versie: data.versie ?? null,
            auteur: data.auteur ?? null,
            bijgewerkt_op: data.bijgewerkt_op ?? null,
        };
    }

    /**
     * Bepaal of de Diep/Ondiep Verbruik-standen onvolledig zijn.
     * Pure functie: alle door de gebruiker in te vullen standen tellen mee
     * (water diep/ondiep/totaal, elektriciteit nacht/dag, gas, Flocculant,
     * chloor, zwavelzuur). Een waarde is "leeg" als ze null is (0 telt als ingevuld).
     * @param {{water_diep:?number, water_ondiep:?number, water_totaal:?number, elektriciteit_nacht:?number, elektriciteit_dag:?number, gas:?number, Flocculant:?(number|string), chemicalien_chloor:?(number|string), chemicalien_zwavelzuur:?(number|string)}} payload
     * @returns {boolean}
     */
    static verbruikOnvolledig(payload) {
        return [
            payload.water_diep,
            payload.water_ondiep,
            payload.water_totaal,
            payload.elektriciteit_nacht,
            payload.elektriciteit_dag,
            payload.gas,
            payload.Flocculant,
            payload.chemicalien_chloor,
            payload.chemicalien_zwavelzuur,
        ].some((v) => v == null);
    }

    /**
     * Sla verbruik- en verwarmingsgegevens op naar de backend. Stuurt de verwachte
     * versie mee (optimistische concurrency) en onthoudt de nieuwe versie bij succes.
     * @returns {Promise<{ok:boolean, conflict:boolean}>} `conflict` = HTTP 409 (iemand
     *   anders wijzigde de gegevens); de aanroeper herlaadt dan via behandelConflict.
     */
    async slaAlgemeenGegevensOp() {
        const api = this.app.api;
        const datum = document.getElementById('centraleDatum').value;
        const versies = this.app.state.versies;

        const verbruikPayload = {
            datum,
            Flocculant: document.getElementById('Flocculant').value || null,
            water_diep: api.parseNumberValue('water-diep'),
            water_ondiep: api.parseNumberValue('water-ondiep'),
            water_totaal: api.parseNumberValue('water-totaal'),
            elektriciteit_nacht: api.parseNumberValue('elektriciteit-nacht'),
            elektriciteit_dag: api.parseNumberValue('elektriciteit-dag'),
            gas: api.parseNumberValue('gas'),
            chemicalien_chloor: document.getElementById('chemicalien-chloor').value || null,
            chemicalien_zwavelzuur: document.getElementById('chemicalien-zwavelzuur').value || null,
            versie: versies['verbruik']?.versie ?? null,
        };
        const verwarmingsPayload = {
            datum,
            verwarming_status_1: document.getElementById('systeem-status-1').checked,
            verwarming_status_2: document.getElementById('systeem-status-2').checked,
            verwarming_status_3: document.getElementById('systeem-status-3').checked,
            verwarming_status_4: document.getElementById('systeem-status-4').checked,
            verwarming_druk_ok: document.getElementById('systeem-druk-ok').checked,
            verwarming_visuele_controle: document.getElementById('visuele-inspectie').checked,
            versie: versies['verwarming']?.versie ?? null,
        };

        try {
            const [r1, r2] = await Promise.all([
                api.call('/api/verbruik/diep-ondiep', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(verbruikPayload),
                }),
                api.call('/api/verbruik/verwarmingssysteem', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(verwarmingsPayload),
                }),
            ]);
            if (r1.status === 409 || r2.status === 409) return { ok: false, conflict: true };
            if (r1.ok) this._onthoudVersie('verbruik', await r1.json().catch(() => null));
            if (r2.ok) this._onthoudVersie('verwarming', await r2.json().catch(() => null));
            return { ok: r1.ok && r2.ok, conflict: false };
        } catch (f) {
            console.error('Fout bij opslaan algemene gegevens:', f);
            return { ok: false, conflict: false };
        }
    }

    /** Laad verbruikdeltas (huidig − vorige dag) en vul de berekeningsvelden. */
    async laadEnBerekenVerbruik() {
        const datum = document.getElementById('centraleDatum').value;
        if (!datum) return;
        try {
            const [huidigRes, vorigeRes] = await Promise.all([
                this.app.api.call(`/api/verbruik/diep-ondiep?datum=${datum}`),
                this.app.api.call(`/api/verbruik/diep-ondiep/vorige?datum=${datum}`),
            ]);
            const huidig = await huidigRes.json();
            const vorige = await vorigeRes.json();

            const berekenEnZet = (veldId, dbSleutel) => {
                const el = document.getElementById(`${veldId}-verbruik`);
                if (!el) return;
                el.value = VerbruikModule.berekenVerbruik(huidig[dbSleutel], vorige[dbSleutel]);
            };

            [
                'water-diep',
                'water-ondiep',
                'water-totaal',
                'elektriciteit-nacht',
                'elektriciteit-dag',
                'gas',
                'Flocculant',
                'chemicalien-chloor',
                'chemicalien-zwavelzuur',
            ].forEach((id) => berekenEnZet(id, id.replace(/-/g, '_')));
        } catch (f) {
            console.error('Fout bij laden verbruik:', f);
        }
    }

    /** Laad peuterbad-meterstanden (huidig − vorige dag) en vul de peuterbad-verbruikvelden. */
    async laadEnBerekenPeuterbadVerbruik() {
        const datum = document.getElementById('centraleDatum').value;
        if (!datum) return;
        const d = new Date(datum);
        d.setDate(d.getDate() - 1);
        const vorigeDatum = d.toISOString().split('T')[0];
        try {
            const [huidigRes, vorigeRes] = await Promise.all([
                this.app.api.call(`/api/metingen?datum=${datum}`),
                this.app.api.call(`/api/metingen?datum=${vorigeDatum}`),
            ]);
            const vindPeuter = (arr) =>
                (Array.isArray(arr) ? arr.find((m) => m.bad_naam === 'Peuterbad') : null) || {};
            const huidig = vindPeuter(await huidigRes.json());
            const vorige = vindPeuter(await vorigeRes.json());

            const berekenEnZet = (veldId, sleutel) => {
                const el = document.getElementById(`${veldId}-verbruik`);
                if (!el) return;
                el.value = VerbruikModule.berekenVerbruik(huidig[sleutel], vorige[sleutel]);
            };
            berekenEnZet('peuterbad-water', 'water');
            berekenEnZet('peuterbad-chemicalien-chloor', 'chemicalien_chloor');
            berekenEnZet('peuterbad-chemicalien-zwavelzuur', 'chemicalien_zwavelzuur');
        } catch (f) {
            console.error('Fout bij laden peuterbad-verbruik:', f);
        }
    }
}

// Node/Jest: maak de klasse importeerbaar. In de browser bestaat `module` niet.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VerbruikModule;
}
