function wisselTrendTab(subtab) {
        huidigeTrendSubtab = subtab;
        ['meetwaarden', 'verbruik'].forEach(s => {
            document.getElementById(`trend-tab-${s}`).classList.toggle('actief', s === subtab);
            document.getElementById(`trend-${s}-content`).style.display = (s === subtab) ? 'block' : 'none';
        });
    }

function initTrendDatums() {
        const tot = new Date();
        const van = new Date();
        van.setDate(van.getDate() - 30);
        const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        if (!document.getElementById('trend-van').value) document.getElementById('trend-van').value = fmt(van);
        if (!document.getElementById('trend-tot').value) document.getElementById('trend-tot').value = fmt(tot);
    }

function datumStr(d) {
        if (!d) return '';
        if (d instanceof Date) return d.toISOString().split('T')[0];
        return String(d).split('T')[0];
    }

function vernietigChart(id) {
        if (trendCharts[id]) { trendCharts[id].destroy(); delete trendCharts[id]; }
    }

function maakLineChart(canvasId, labels, datasets) {
        vernietigChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        trendCharts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                plugins: { legend: { position: 'top' } },
                scales: {
                    x: { ticks: { maxTicksLimit: 12, maxRotation: 45 } },
                    y: { beginAtZero: false }
                }
            }
        });
    }

async function laadTrendData() {
        const van = document.getElementById('trend-van').value;
        const tot = document.getElementById('trend-tot').value;
        if (!van || !tot) { toonBericht('Vul een geldig datumbereik in.', 'fout'); return; }
        toonBericht('Grafiek laden...', '');
        if (huidigeTrendSubtab === 'meetwaarden') await laadTrendMetingen(van, tot);
        else await laadTrendVerbruik(van, tot);
        toonBericht('', '');
    }

async function laadTrendMetingen(van, tot) {
        try {
            const res = await apiCall(`/api/trend/metingen?van=${van}&tot=${tot}`);
            const data = await res.json();

            const diep = data.filter(r => r.bad_naam === 'Diep');
            const ondiep = data.filter(r => r.bad_naam === 'Ondiep');
            const peuter = data.filter(r => r.bad_naam === 'Peuterbad');

            const grootLabels = [...new Set([...diep, ...ondiep].map(r => datumStr(r.datum)))].sort();
            const peuterLabels = peuter.map(r => datumStr(r.datum));

            const haal = (arr, veld, lbls) => lbls.map(d => {
                const r = arr.find(x => datumStr(x.datum) === d);
                return r ? r[veld] : null;
            });
            const ds = (label, arr, veld, lbls, kleur) => ({
                label, data: haal(arr, veld, lbls),
                borderColor: kleur, backgroundColor: kleur + '22',
                tension: 0.3, spanGaps: true, pointRadius: 3
            });

            maakLineChart('chart-ph-groot', grootLabels, [
                ds('Diep', diep, 'ph_waarde', grootLabels, '#007BFF'),
                ds('Ondiep', ondiep, 'ph_waarde', grootLabels, '#28a745')]);
            maakLineChart('chart-chloor-groot', grootLabels, [
                ds('Diep', diep, 'chloor_waarde', grootLabels, '#007BFF'),
                ds('Ondiep', ondiep, 'chloor_waarde', grootLabels, '#28a745')]);
            maakLineChart('chart-temp-groot', grootLabels, [
                ds('Diep', diep, 'temperatuur', grootLabels, '#007BFF'),
                ds('Ondiep', ondiep, 'temperatuur', grootLabels, '#28a745')]);
            maakLineChart('chart-flow-groot', grootLabels, [
                ds('Diep', diep, 'flow', grootLabels, '#007BFF'),
                ds('Ondiep', ondiep, 'flow', grootLabels, '#28a745')]);
            maakLineChart('chart-filterin-groot', grootLabels, [
                ds('Diep', diep, 'filter_druk_in', grootLabels, '#007BFF'),
                ds('Ondiep', ondiep, 'filter_druk_in', grootLabels, '#28a745')]);
            maakLineChart('chart-filteruit-groot', grootLabels, [
                ds('Diep', diep, 'filter_druk_uit', grootLabels, '#007BFF'),
                ds('Ondiep', ondiep, 'filter_druk_uit', grootLabels, '#28a745')]);

            maakLineChart('chart-ph-peuter', peuterLabels, [
                ds('Peuterbad', peuter, 'ph_waarde', peuterLabels, '#fd7e14')]);
            maakLineChart('chart-chloor-peuter', peuterLabels, [
                ds('Peuterbad', peuter, 'chloor_waarde', peuterLabels, '#fd7e14')]);
            maakLineChart('chart-flow-peuter', peuterLabels, [
                ds('Peuterbad', peuter, 'flow', peuterLabels, '#fd7e14')]);
            maakLineChart('chart-filterin-peuter', peuterLabels, [
                ds('Peuterbad', peuter, 'filter_druk_in', peuterLabels, '#fd7e14')]);

        } catch (fout) { console.error('Fout trend metingen:', fout); toonBericht('Fout bij laden grafiek.', 'fout'); }
    }

async function laadTrendVerbruik(van, tot) {
        try {
            const res = await apiCall(`/api/trend/verbruik?van=${van}&tot=${tot}`);
            const data = await res.json();
            const alg = data.algemeen || [];
            const peuter = data.peuterbad || [];

            const labels = alg.map(r => datumStr(r.datum));
            const peuterLabels = peuter.map(r => datumStr(r.datum));
            const v = (arr, veld) => arr.map(r => r[veld]);

            maakLineChart('chart-water-groot', labels, [
                { label: 'Diep (m³)', data: v(alg, 'water_diep'), borderColor: '#007BFF', backgroundColor: '#007BFF22', tension: 0.3, spanGaps: true },
                { label: 'Ondiep (m³)', data: v(alg, 'water_ondiep'), borderColor: '#28a745', backgroundColor: '#28a74522', tension: 0.3, spanGaps: true },
                { label: 'Totaal (m³)', data: v(alg, 'water_totaal'), borderColor: '#6c757d', backgroundColor: '#6c757d22', tension: 0.3, spanGaps: true, borderDash: [5,5] }
            ]);
            maakLineChart('chart-elektriciteit', labels, [
                { label: 'Nacht (kWh)', data: v(alg, 'elektriciteit_nacht'), borderColor: '#6f42c1', backgroundColor: '#6f42c122', tension: 0.3, spanGaps: true },
                { label: 'Dag (kWh)', data: v(alg, 'elektriciteit_dag'), borderColor: '#e83e8c', backgroundColor: '#e83e8c22', tension: 0.3, spanGaps: true }
            ]);
            maakLineChart('chart-gas', labels, [
                { label: 'Gas (m³)', data: v(alg, 'gas'), borderColor: '#fd7e14', backgroundColor: '#fd7e1422', tension: 0.3, spanGaps: true }
            ]);
            maakLineChart('chart-water-peuter', peuterLabels, [
                { label: 'Water (m³)', data: peuter.map(r => r.water), borderColor: '#fd7e14', backgroundColor: '#fd7e1422', tension: 0.3, spanGaps: true }
            ]);
            maakLineChart('chart-chem-chloor-groot', labels, [
                { label: 'Chloor', data: v(alg, 'chemicalien_chloor'), borderColor: '#17a2b8', backgroundColor: '#17a2b822', tension: 0.3, spanGaps: true }
            ]);
            maakLineChart('chart-chem-zwavel-groot', labels, [
                { label: 'Zwavelzuur', data: v(alg, 'chemicalien_zwavelzuur'), borderColor: '#dc3545', backgroundColor: '#dc354522', tension: 0.3, spanGaps: true }
            ]);
            maakLineChart('chart-chem-chloor-peuter', peuterLabels, [
                { label: 'Chloor', data: peuter.map(r => r.chemicalien_chloor), borderColor: '#17a2b8', backgroundColor: '#17a2b822', tension: 0.3, spanGaps: true }
            ]);
            maakLineChart('chart-chem-zwavel-peuter', peuterLabels, [
                { label: 'Zwavelzuur', data: peuter.map(r => r.chemicalien_zwavelzuur), borderColor: '#dc3545', backgroundColor: '#dc354522', tension: 0.3, spanGaps: true }
            ]);

        } catch (fout) { console.error('Fout trend verbruik:', fout); toonBericht('Fout bij laden grafiek.', 'fout'); }
    }
