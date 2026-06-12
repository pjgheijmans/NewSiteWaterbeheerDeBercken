/**
 * @jest-environment jsdom
 *
 * jsdom-tests voor de drie peuterbad Verbruik-tab fixes, gedreven via de echte
 * module-methodes tegen een opgebouwde DOM. Dit dekt de bugs die naar master
 * zijn gemerged zonder runtime-verificatie:
 *   1) save stuurt null (niet '') voor lege INT-velden
 *   2) waarschuwing is subtab-bewust
 *   3) de Verbruik-subtab vult de peuterbad verbruik-cellen
 */
/* eslint-disable @typescript-eslint/no-var-requires */
export {}; // markeer als module zodat top-level consts niet botsen met andere testbestanden
const ApiClient = require('../../../frontend/js/api.js');
const OpslaanModule = require('../../../frontend/js/opslaan.js');
const VerbruikModule = require('../../../frontend/js/verbruik.js');
const MetingenModule = require('../../../frontend/js/metingen.js');

/** Bouw een mock-app met echte ApiClient (parseNumberValue leest uit jsdom). */
function maakApp(overrides: any = {}) {
    const api = new ApiClient();
    const app: any = {
        api,
        ui: { toonBericht: jest.fn(), setAutoSaveStatus: jest.fn() },
        metingen: { laadMetingen: jest.fn(), laadActies: jest.fn(), werkVolledigheidBij: jest.fn() },
        taken: { werkBadgeBij: jest.fn() },
        verbruik: { laadEnBerekenVerbruik: jest.fn(), laadEnBerekenPeuterbadVerbruik: jest.fn() },
        state: {
            huidigeRol: 'waterbeheer', huidigeBadPagina: 'peuterbad',
            huidigeSubtab: 'meetwaarden', huidigeCoordSubtab: 'metingen',
            huidigePeuterbadSubtab: 'verbruik',
        },
    };
    return Object.assign(app, overrides);
}

function zetPeuterbadFormulier(velden: Record<string, string>) {
    document.body.innerHTML = `
        <input id="centraleDatum" value="2026-07-15">
        <input id="peuterbad-ph"><input id="peuterbad-chloor">
        <input id="peuterbad-flow"><input id="peuterbad-filterdruk">
        <input id="peuterbad-water">
        <input id="peuterbad-chemicalien-chloor">
        <input id="peuterbad-chemicalien-zwavelzuur">`;
    for (const [id, val] of Object.entries(velden)) {
        (document.getElementById(id) as HTMLInputElement).value = val;
    }
}

describe('Fix #1 — peuterbad save stuurt null voor lege velden', () => {
    it('alleen chloor ingevuld → water/zwavelzuur worden null, chloor wordt een getal', async () => {
        zetPeuterbadFormulier({ 'peuterbad-chemicalien-chloor': '8' });
        const app = maakApp();
        let captured: any = null;
        app.api.call = jest.fn(async (url: string, opts: any) => {
            captured = { url, body: JSON.parse(opts.body) };
            return { ok: true, json: async () => ({}) };
        });

        await new OpslaanModule(app).verwerkCentraleOpslaan(true);

        expect(captured.url).toBe('/api/metingen');
        expect(captured.body.bad_naam).toBe('Peuterbad');
        expect(captured.body.water).toBeNull();
        expect(captured.body.chemicalien_zwavelzuur).toBeNull();
        // De cruciale regressie: een getal, geen lege string (die de INT-insert liet falen)
        expect(captured.body.chemicalien_chloor).toBe(8);
        expect(captured.body.chemicalien_chloor).not.toBe('');
    });
});

describe('Fix #2 — autosave waarschuwt niet meer (passieve markering i.p.v. nag)', () => {
    it('alle Verbruik-velden ingevuld → status "saved", geen "warning"', async () => {
        zetPeuterbadFormulier({
            'peuterbad-water': '130',
            'peuterbad-chemicalien-chloor': '8',
            'peuterbad-chemicalien-zwavelzuur': '7',
        });
        const app = maakApp();
        app.api.call = jest.fn(async () => ({ ok: true, json: async () => ({}) }));

        await new OpslaanModule(app).verwerkCentraleOpslaan(true);

        expect(app.ui.setAutoSaveStatus).toHaveBeenCalledWith('saved');
        expect(app.ui.setAutoSaveStatus).not.toHaveBeenCalledWith('warning');
    });

    it('óók bij onvolledige velden → "saved" (geen "warning" meer); volledigheid loopt via de markering', async () => {
        zetPeuterbadFormulier({ 'peuterbad-chemicalien-chloor': '8' }); // water/zwavelzuur leeg
        const app = maakApp();
        app.api.call = jest.fn(async () => ({ ok: true, json: async () => ({}) }));

        await new OpslaanModule(app).verwerkCentraleOpslaan(true);

        expect(app.ui.setAutoSaveStatus).toHaveBeenCalledWith('saved');
        expect(app.ui.setAutoSaveStatus).not.toHaveBeenCalledWith('warning');
        // De volledigheids-markering wordt na het opslaan bijgewerkt.
        expect(app.metingen.werkVolledigheidBij).toHaveBeenCalled();
    });
});

describe('Fix #3 — Verbruik-subtab berekent peuterbad-verbruik', () => {
    it('wisselPeuterbadSubtab("verbruik") roept de peuterbad-berekening aan, niet de Diep/Ondiep-versie', () => {
        document.body.innerHTML = `
            <button id="subtab-peuterbad-meetwaarden"></button>
            <button id="subtab-peuterbad-verbruik"></button>
            <button id="subtab-peuterbad-taken"></button>
            <div id="peuterbad-meetwaarden-content"></div>
            <div id="peuterbad-verbruik-content"></div>
            <div id="peuterbad-taken-content"></div>`;
        const app = maakApp();
        new MetingenModule(app).wisselPeuterbadSubtab('verbruik');

        expect(app.verbruik.laadEnBerekenPeuterbadVerbruik).toHaveBeenCalledTimes(1);
        expect(app.verbruik.laadEnBerekenVerbruik).not.toHaveBeenCalled();
    });

    it('laadEnBerekenPeuterbadVerbruik vult de cellen met (vandaag − vorige dag)', async () => {
        document.body.innerHTML = `
            <input id="centraleDatum" value="2026-07-15">
            <input id="peuterbad-water-verbruik">
            <input id="peuterbad-chemicalien-chloor-verbruik">
            <input id="peuterbad-chemicalien-zwavelzuur-verbruik">`;
        const huidig = [{ bad_naam: 'Peuterbad', water: 130, chemicalien_chloor: 8, chemicalien_zwavelzuur: 7 }];
        const vorige = [{ bad_naam: 'Peuterbad', water: 100, chemicalien_chloor: 20, chemicalien_zwavelzuur: 10 }];
        const app = maakApp();
        app.api.call = jest.fn(async (url: string) => ({
            json: async () => (url.includes('2026-07-14') ? vorige : huidig),
        }));

        await new VerbruikModule(app).laadEnBerekenPeuterbadVerbruik();

        const val = (id: string) => (document.getElementById(id) as HTMLInputElement).value;
        expect(val('peuterbad-water-verbruik')).toBe('30');         // 130 − 100
        expect(val('peuterbad-chemicalien-chloor-verbruik')).toBe('-12');    // 8 − 20
        expect(val('peuterbad-chemicalien-zwavelzuur-verbruik')).toBe('-3'); // 7 − 10
        // De vorige dag is correct opgevraagd
        expect(app.api.call).toHaveBeenCalledWith('/api/metingen?datum=2026-07-14');
    });
});
