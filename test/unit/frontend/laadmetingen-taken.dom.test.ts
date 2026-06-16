/**
 * @jest-environment jsdom
 *
 * Regressie: bij datumnavigatie moet de inhoud van de actieve subtab meelopen.
 * Specifiek de grote-baden Taken-subtab werd niet herladen (alleen de badge), zodat
 * de verplichte taken pas na een volledige refresh verschenen. laadMetingen herlaadt
 * de Taken-inhoud nu (laadBadTaken) wanneer die subtab actief is.
 */
/* eslint-disable @typescript-eslint/no-var-requires */
export {};
const MetingenModule = require('../../../frontend/js/metingen.js');

function maakApp(huidigeBadPagina: string, huidigeSubtab: string, huidigePeuterbadSubtab = 'meetwaarden') {
    return {
        state: { huidigeRol: 'waterbeheer', huidigeBadPagina, huidigeSubtab, huidigePeuterbadSubtab, versies: {} },
        api: { call: jest.fn(async () => ({ json: async () => [] })) },
        dienst: { laadDienst: jest.fn() },
        taken: { laadBadTaken: jest.fn(), werkBadgeBij: jest.fn() },
        verbruik: {
            laadEnBerekenVerbruik: jest.fn().mockResolvedValue(undefined),
            laadWaterbeheerVelden: jest.fn().mockResolvedValue(undefined),
            cacheGroteBadenVerbruik: jest.fn().mockResolvedValue(undefined),
        },
        ui: { toonBericht: jest.fn() },
    };
}

/** Stub de zware DOM-/laadmethoden zodat alleen de Taken-beslissing in laadMetingen telt. */
function maakModule(app: any) {
    const m = new MetingenModule(app);
    m._bouwTabelOp = jest.fn();
    m._onthoudMetingVersies = jest.fn();
    m.laadBezoekers = jest.fn().mockResolvedValue(undefined);
    m.laadGebondenChloor = jest.fn().mockResolvedValue(undefined);
    m.laadActies = jest.fn();
    m.werkVolledigheidBij = jest.fn();
    m.toonLaatstGewijzigd = jest.fn();
    return m;
}

beforeEach(() => { document.body.innerHTML = `<input id="centraleDatum" value="2026-07-15">`; });

describe('laadMetingen — Taken-inhoud verversen bij datumnavigatie', () => {
    it('grote-baden + Taken-subtab actief → herlaadt de inhoud (laadBadTaken), niet alleen de badge', async () => {
        const app = maakApp('grote-baden', 'taken');
        await maakModule(app).laadMetingen();
        expect(app.taken.laadBadTaken).toHaveBeenCalledWith('grote-baden', '2026-07-15');
        expect(app.taken.werkBadgeBij).not.toHaveBeenCalled();
    });

    it('grote-baden + andere subtab → alleen de badge (werkBadgeBij)', async () => {
        const app = maakApp('grote-baden', 'meetwaarden');
        await maakModule(app).laadMetingen();
        expect(app.taken.werkBadgeBij).toHaveBeenCalledWith('2026-07-15');
        expect(app.taken.laadBadTaken).not.toHaveBeenCalled();
    });

    it('peuterbad → alleen de badge in laadMetingen (de Taken-inhoud loopt via _bouwTabelOp)', async () => {
        const app = maakApp('peuterbad', 'meetwaarden', 'taken');
        await maakModule(app).laadMetingen();
        expect(app.taken.werkBadgeBij).toHaveBeenCalledWith('2026-07-15');
        expect(app.taken.laadBadTaken).not.toHaveBeenCalled();
    });
});
