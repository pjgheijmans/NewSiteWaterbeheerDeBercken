/**
 * Verbruik en verwarmingssysteem — laden, opslaan en berekeningen.
 */
class VerbruikModule {
    /** @param {Application} app */
    constructor(app) {
        this.app = app;
    }

    /** Laad verbruik- en verwarmingssysteem-velden voor de geselecteerde datum. */
    async laadWaterbeheerVelden() {
        const datum = document.getElementById('centraleDatum').value;
        try {
            const [verbruikRes, warmteRes] = await Promise.all([
                this.app.api.call(`/api/verbruik/diep-ondiep?datum=${datum}`),
                this.app.api.call(`/api/verbruik/verwarmingssysteem?datum=${datum}`),
            ]);
            const data = { ...await verbruikRes.json(), ...await warmteRes.json() };

            document.getElementById('floculant').value                = data.floculant               || '';
            document.getElementById('water-diep').value               = data.water_diep              || '';
            document.getElementById('water-ondiep').value             = data.water_ondiep            || '';
            document.getElementById('water-totaal').value             = data.water_totaal            || '';
            document.getElementById('elektriciteit-nacht').value      = data.elektriciteit_nacht     || '';
            document.getElementById('elektriciteit-dag').value        = data.elektriciteit_dag       || '';
            document.getElementById('gas').value                      = data.gas                     || '';
            document.getElementById('chemicalien-chloor').value       = data.chemicalien_chloor      || '';
            document.getElementById('chemicalien-zwavelzuur').value   = data.chemicalien_zwavelzuur  || '';
            document.getElementById('systeem-status-1').checked       = data.verwarming_status_1    === 1;
            document.getElementById('systeem-status-2').checked       = data.verwarming_status_2    === 1;
            document.getElementById('systeem-status-3').checked       = data.verwarming_status_3    === 1;
            document.getElementById('systeem-status-4').checked       = data.verwarming_status_4    === 1;
            document.getElementById('systeem-druk-ok').checked        = data.verwarming_druk_ok     === 1;
            document.getElementById('visuele-inspectie').checked      = data.verwarming_visuele_controle === 1;
        } catch (f) { console.error('Fout bij laden algemene velden:', f); }
    }

    /**
     * Sla verbruik- en verwarmingsgegevens op naar de backend.
     * @returns {Promise<boolean>}
     */
    async slaAlgemeenGegevensOp() {
        const api   = this.app.api;
        const datum = document.getElementById('centraleDatum').value;

        const verbruikPayload = {
            datum,
            floculant:           document.getElementById('floculant').value || null,
            water_diep:          api.parseNumberValue('water-diep'),
            water_ondiep:        api.parseNumberValue('water-ondiep'),
            water_totaal:        api.parseNumberValue('water-totaal'),
            elektriciteit_nacht: api.parseNumberValue('elektriciteit-nacht'),
            elektriciteit_dag:   api.parseNumberValue('elektriciteit-dag'),
            gas:                 api.parseNumberValue('gas'),
            chemicalien_chloor:    document.getElementById('chemicalien-chloor').value    || null,
            chemicalien_zwavelzuur:document.getElementById('chemicalien-zwavelzuur').value || null,
        };
        const verwarmingsPayload = {
            datum,
            verwarming_status_1:         document.getElementById('systeem-status-1').checked,
            verwarming_status_2:         document.getElementById('systeem-status-2').checked,
            verwarming_status_3:         document.getElementById('systeem-status-3').checked,
            verwarming_status_4:         document.getElementById('systeem-status-4').checked,
            verwarming_druk_ok:          document.getElementById('systeem-druk-ok').checked,
            verwarming_visuele_controle: document.getElementById('visuele-inspectie').checked,
        };

        try {
            const [r1, r2] = await Promise.all([
                api.call('/api/verbruik/diep-ondiep',      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(verbruikPayload) }),
                api.call('/api/verbruik/verwarmingssysteem',{ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(verwarmingsPayload) }),
            ]);
            return r1.ok && r2.ok;
        } catch (f) { console.error('Fout bij opslaan algemene gegevens:', f); return false; }
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
                const h  = parseFloat(huidig[dbSleutel]);
                const v  = parseFloat(vorige[dbSleutel]) || 0;
                const el = document.getElementById(`${veldId}-verbruik`);
                if (!el) return;
                if (isNaN(h)) { el.value = '-'; return; }
                el.value = String(Math.round(h) - Math.round(v));
            };

            ['water-diep','water-ondiep','water-totaal','elektriciteit-nacht',
             'elektriciteit-dag','gas','floculant','chemicalien-chloor','chemicalien-zwavelzuur']
                .forEach(id => berekenEnZet(id, id.replace(/-/g, '_')));
        } catch (f) { console.error('Fout bij laden verbruik:', f); }
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
            const vindPeuter = arr => (Array.isArray(arr) ? arr.find(m => m.bad_naam === 'Peuterbad') : null) || {};
            const huidig = vindPeuter(await huidigRes.json());
            const vorige = vindPeuter(await vorigeRes.json());

            const berekenEnZet = (veldId, sleutel) => {
                const el = document.getElementById(`${veldId}-verbruik`);
                if (!el) return;
                const h = parseFloat(huidig[sleutel]);
                const v = parseFloat(vorige[sleutel]) || 0;
                el.value = isNaN(h) ? '-' : String(Math.round(h) - Math.round(v));
            };
            berekenEnZet('peuterbad-water',                 'water');
            berekenEnZet('peuterbad-chemicalien-chloor',    'chemicalien_chloor');
            berekenEnZet('peuterbad-chemicalien-zwavelzuur','chemicalien_zwavelzuur');
        } catch (f) { console.error('Fout bij laden peuterbad-verbruik:', f); }
    }
}
