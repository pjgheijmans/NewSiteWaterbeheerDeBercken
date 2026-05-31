/**
 * Trendanalyse — Chart.js grafieken voor metingen en verbruik.
 */
class TrendModule {
    /** @param {Application} app */
    constructor(app) {
        this.app = app;
    }

    /**
     * Wissel het actieve trend-tabblad.
     * @param {string} subtab - 'meetwaarden' of 'verbruik'
     */
    wisselTrendTab(subtab) {
        this.app.state.huidigeTrendSubtab = subtab;
        ['meetwaarden', 'verbruik'].forEach(s => {
            document.getElementById(`trend-tab-${s}`).classList.toggle('actief', s === subtab);
            document.getElementById(`trend-${s}-content`).style.display = (s === subtab) ? 'block' : 'none';
        });
    }

    /** Initialiseer datumkiezers op een standaardbereik van 30 dagen. */
    initTrendDatums() {
        const tot = new Date();
        const van = new Date();
        van.setDate(van.getDate() - 30);
        const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        if (!document.getElementById('trend-van').value) document.getElementById('trend-van').value = fmt(van);
        if (!document.getElementById('trend-tot').value) document.getElementById('trend-tot').value = fmt(tot);
    }

    /** Laad en render trenddata voor het geselecteerde bereik. */
    async laadTrendData() {
        const van = document.getElementById('trend-van').value;
        const tot = document.getElementById('trend-tot').value;
        if (!van || !tot) { this.app.ui.toonBericht('Vul een geldig datumbereik in.', 'fout'); return; }
        this.app.ui.toonBericht('Grafiek laden...', '');
        if (this.app.state.huidigeTrendSubtab === 'meetwaarden')
            await this._laadTrendMetingen(van, tot);
        else
            await this._laadTrendVerbruik(van, tot);
        this.app.ui.toonBericht('', '');
    }

    // ── Chart helpers ─────────────────────────────────────────────────────

    _datumStr(d) {
        if (!d) return '';
        if (d instanceof Date) return d.toISOString().split('T')[0];
        return String(d).split('T')[0];
    }

    _vernietigChart(id) {
        const charts = this.app.state.trendCharts;
        if (charts[id]) { charts[id].destroy(); delete charts[id]; }
    }

    _maakLineChart(canvasId, labels, datasets) {
        this._vernietigChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        this.app.state.trendCharts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                plugins: { legend: { position: 'top' } },
                scales: {
                    x: { ticks: { maxTicksLimit: 12, maxRotation: 45 } },
                    y: { beginAtZero: false },
                },
            },
        });
    }

    // ── Metingen trend ────────────────────────────────────────────────────

    async _laadTrendMetingen(van, tot) {
        try {
            const res  = await this.app.api.call(`/api/trend/metingen?van=${van}&tot=${tot}`);
            const data = await res.json();

            const diep   = data.filter(r => r.bad_naam === 'Diep');
            const ondiep = data.filter(r => r.bad_naam === 'Ondiep');
            const peuter = data.filter(r => r.bad_naam === 'Peuterbad');

            const grootLabels  = [...new Set([...diep, ...ondiep].map(r => this._datumStr(r.datum)))].sort();
            const peuterLabels = peuter.map(r => this._datumStr(r.datum));

            const haal = (arr, veld, lbls) => lbls.map(d => {
                const r = arr.find(x => this._datumStr(x.datum) === d);
                return r ? r[veld] : null;
            });
            const ds = (label, arr, veld, lbls, kleur) => ({
                label, data: haal(arr, veld, lbls),
                borderColor: kleur, backgroundColor: kleur + '22',
                tension: 0.3, spanGaps: true, pointRadius: 3,
            });

            this._maakLineChart('chart-ph-groot',       grootLabels, [ds('Diep', diep, 'ph_waarde',       grootLabels, '#007BFF'), ds('Ondiep', ondiep, 'ph_waarde',       grootLabels, '#28a745')]);
            this._maakLineChart('chart-chloor-groot',   grootLabels, [ds('Diep', diep, 'chloor_waarde',   grootLabels, '#007BFF'), ds('Ondiep', ondiep, 'chloor_waarde',   grootLabels, '#28a745')]);
            this._maakLineChart('chart-temp-groot',     grootLabels, [ds('Diep', diep, 'temperatuur',     grootLabels, '#007BFF'), ds('Ondiep', ondiep, 'temperatuur',     grootLabels, '#28a745')]);
            this._maakLineChart('chart-flow-groot',     grootLabels, [ds('Diep', diep, 'flow',            grootLabels, '#007BFF'), ds('Ondiep', ondiep, 'flow',            grootLabels, '#28a745')]);
            this._maakLineChart('chart-filterin-groot', grootLabels, [ds('Diep', diep, 'filter_druk_in',  grootLabels, '#007BFF'), ds('Ondiep', ondiep, 'filter_druk_in',  grootLabels, '#28a745')]);
            this._maakLineChart('chart-filteruit-groot',grootLabels, [ds('Diep', diep, 'filter_druk_uit', grootLabels, '#007BFF'), ds('Ondiep', ondiep, 'filter_druk_uit', grootLabels, '#28a745')]);

            this._maakLineChart('chart-ph-peuter',      peuterLabels, [ds('Peuterbad', peuter, 'ph_waarde',     peuterLabels, '#fd7e14')]);
            this._maakLineChart('chart-chloor-peuter',  peuterLabels, [ds('Peuterbad', peuter, 'chloor_waarde', peuterLabels, '#fd7e14')]);
            this._maakLineChart('chart-flow-peuter',    peuterLabels, [ds('Peuterbad', peuter, 'flow',          peuterLabels, '#fd7e14')]);
            this._maakLineChart('chart-filterin-peuter',peuterLabels, [ds('Peuterbad', peuter, 'filter_druk_in',peuterLabels, '#fd7e14')]);
        } catch (f) { console.error('Fout trend metingen:', f); this.app.ui.toonBericht('Fout bij laden grafiek.', 'fout'); }
    }

    // ── Verbruik trend ────────────────────────────────────────────────────

    async _laadTrendVerbruik(van, tot) {
        try {
            const res    = await this.app.api.call(`/api/trend/verbruik?van=${van}&tot=${tot}`);
            const data   = await res.json();
            const alg    = data.algemeen  || [];
            const peuter = data.peuterbad || [];

            const labels       = alg.map(r => this._datumStr(r.datum));
            const peuterLabels = peuter.map(r => this._datumStr(r.datum));
            const v = (arr, veld) => arr.map(r => r[veld]);
            const lijn = (label, arr, veld, kleur) => ({
                label, data: v(arr, veld), borderColor: kleur, backgroundColor: kleur + '22',
                tension: 0.3, spanGaps: true,
            });

            this._maakLineChart('chart-water-groot',     labels, [lijn('Diep (m³)', alg, 'water_diep', '#007BFF'), lijn('Ondiep (m³)', alg, 'water_ondiep', '#28a745'), { ...lijn('Totaal (m³)', alg, 'water_totaal', '#6c757d'), borderDash: [5,5] }]);
            this._maakLineChart('chart-elektriciteit',   labels, [lijn('Nacht (kWh)', alg, 'elektriciteit_nacht', '#6f42c1'), lijn('Dag (kWh)', alg, 'elektriciteit_dag', '#e83e8c')]);
            this._maakLineChart('chart-gas',             labels, [lijn('Gas (m³)', alg, 'gas', '#fd7e14')]);
            this._maakLineChart('chart-water-peuter',    peuterLabels, [lijn('Water (m³)', peuter, 'water', '#fd7e14')]);
            this._maakLineChart('chart-chem-chloor-groot',  labels, [lijn('Chloor', alg, 'chemicalien_chloor', '#17a2b8')]);
            this._maakLineChart('chart-chem-zwavel-groot',  labels, [lijn('Zwavelzuur', alg, 'chemicalien_zwavelzuur', '#dc3545')]);
            this._maakLineChart('chart-chem-chloor-peuter', peuterLabels, [lijn('Chloor', peuter, 'chemicalien_chloor', '#17a2b8')]);
            this._maakLineChart('chart-chem-zwavel-peuter', peuterLabels, [lijn('Zwavelzuur', peuter, 'chemicalien_zwavelzuur', '#dc3545')]);
        } catch (f) { console.error('Fout trend verbruik:', f); this.app.ui.toonBericht('Fout bij laden grafiek.', 'fout'); }
    }
}
