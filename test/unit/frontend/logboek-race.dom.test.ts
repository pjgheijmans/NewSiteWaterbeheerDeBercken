/**
 * @jest-environment jsdom
 *
 * Regressie: op de waterbeheer-logboektab werd de meetwaardentabel (de Peuterbad-rij
 * uit de generieke tabel-fallback) over de logboekweergave getekend. Twee oorzaken:
 *   1) een trage `laadMetingen()`-respons die pas binnenkomt nadat de gebruiker naar
 *      de logboektab was gewisseld, riep alsnog `_bouwTabelOp` aan (stale async race);
 *   2) `_bouwTabelOp` had geen logboek-geval en viel door naar de tabel-fallback.
 */

export {};
const MetingenModule = require('../../../frontend/js/metingen.js');

function maakApp() {
    return {
        state: {
            huidigeRol: 'waterbeheer',
            huidigeBadPagina: 'grote-baden',
            huidigeSubtab: 'meetwaarden',
            huidigePeuterbadSubtab: 'meetwaarden',
            huidigeCoordSubtab: 'metingen',
            versies: {},
        },
        api: { call: jest.fn() },
        dienst: { laadDienst: jest.fn() },
        taken: { laadBadTaken: jest.fn(), werkBadgeBij: jest.fn() },
        logboek: { laadLogboek: jest.fn() },
        verbruik: {
            laadEnBerekenVerbruik: jest.fn().mockResolvedValue(undefined),
            laadWaterbeheerVelden: jest.fn().mockResolvedValue(undefined),
            cacheGroteBadenVerbruik: jest.fn().mockResolvedValue(undefined),
        },
        ui: { toonBericht: jest.fn() },
    } as any;
}

beforeEach(() => {
    document.body.innerHTML = `<input id="centraleDatum" value="2026-07-15">`;
});

describe('logboektab — geen meetwaardentabel eroverheen', () => {
    it('_bouwTabelOp doet niets op de waterbeheer-logboekpagina (geen Peuterbad-rij)', () => {
        const app = maakApp();
        app.state.huidigeBadPagina = 'logboek';
        // Zou anders de generieke tabel-fallback openzetten en dagstaatTbody vullen.
        document.body.innerHTML += `
            <div id="waterbeheer-grote-baden-content"></div>
            <div id="waterbeheer-peuterbad-content"></div>
            <div id="waterbeheer-logboek-content"></div>
            <div id="tables-content" style="display:none">
                <table><thead id="tabelKop"></thead><tbody id="dagstaatTbody"></tbody></table>
            </div>`;
        const m = new MetingenModule(app);
        m._bouwTabelOp([{ bad_naam: 'Peuterbad', ph_waarde: 7 }]);
        expect(document.getElementById('tables-content')!.style.display).toBe('none');
        expect(document.getElementById('dagstaatTbody')!.innerHTML).toBe('');
    });

    it('een verouderde laadMetingen-respons (gebruiker wisselde naar logboek) rendert niet', async () => {
        const app = maakApp();
        // De trage grote-baden-fetch die pas ná de tabwissel resolvet.
        let resolveFetch: (v: any) => void = () => {};
        app.api.call = jest.fn(
            () =>
                new Promise((resolve) => {
                    resolveFetch = resolve;
                }),
        );
        const m = new MetingenModule(app);
        m._bouwTabelOp = jest.fn();
        m._onthoudMetingVersies = jest.fn();

        const traag = m.laadMetingen(); // token 1, wacht op fetch

        // Gebruiker wisselt naar de logboektab → nieuwe laadMetingen bumpt de token.
        app.state.huidigeBadPagina = 'logboek';
        await m.laadMetingen(); // token 2, early-return naar laadLogboek

        // De trage fetch komt nu pas binnen.
        resolveFetch({ json: async () => [{ bad_naam: 'Peuterbad' }] });
        await traag;

        expect(m._bouwTabelOp).not.toHaveBeenCalled();
        expect(app.logboek.laadLogboek).toHaveBeenCalled();
    });
});
