/**
 * @jest-environment jsdom
 *
 * jsdom-tests voor het opslaan op de grote-baden pagina (Diep/Ondiep), gedreven
 * via de echte module-methode. De vroegere "niet alle velden ingevuld"-waarschuwing
 * na elke opslag is vervangen door een passieve markering op de subtab
 * (zie volledigheid.dom.test.ts); hier verifiëren we dat de autosave zelf
 * niet meer waarschuwt en de juiste verversingen aanroept.
 */
/* eslint-disable @typescript-eslint/no-var-requires */
export {}; // markeer als module zodat top-level consts niet botsen met andere testbestanden
const ApiClient = require('../../../frontend/js/api.js');
const OpslaanModule = require('../../../frontend/js/opslaan.js');

/** Mock-app met echte ApiClient (parseNumberValue leest uit jsdom). */
function maakApp() {
    const api = new ApiClient();
    api.call = jest.fn(async () => ({ ok: true, json: async () => ({}) }));
    return {
        api,
        ui: { toonBericht: jest.fn(), setAutoSaveStatus: jest.fn() },
        metingen: { laadMetingen: jest.fn(), laadActies: jest.fn(), werkVolledigheidBij: jest.fn() },
        taken: { werkBadgeBij: jest.fn() },
        verbruik: { laadEnBerekenVerbruik: jest.fn(), laadEnBerekenPeuterbadVerbruik: jest.fn() },
        state: {
            huidigeRol: 'waterbeheer', huidigeBadPagina: 'grote-baden',
            huidigeSubtab: 'meetwaarden', huidigeCoordSubtab: 'metingen',
            huidigePeuterbadSubtab: 'meetwaarden',
        },
    };
}

/** Bouw het Diep/Ondiep meetwaarden-formulier; alleen meegegeven velden krijgen een waarde. */
function zetMeetwaardenFormulier(velden: Record<string, string>) {
    const baden = ['diep', 'ondiep'];
    const velis = ['ph', 'chloor', 'temp', 'flow', 'filter-in', 'filter-uit', 'kath'];
    const inputs = baden.flatMap(b => velis.map(v => `<input id="${v}-${b}">`)).join('');
    document.body.innerHTML = `<input id="centraleDatum" value="2026-07-15">${inputs}`;
    for (const [id, val] of Object.entries(velden)) {
        (document.getElementById(id) as HTMLInputElement).value = val;
    }
}

/** Alle zeven velden van één bad ingevuld. */
function volledigBad(bad: string): Record<string, string> {
    return {
        [`ph-${bad}`]: '7.2', [`chloor-${bad}`]: '1.0', [`temp-${bad}`]: '28',
        [`flow-${bad}`]: '200', [`filter-in-${bad}`]: '0.5', [`filter-uit-${bad}`]: '0.4',
        [`kath-${bad}`]: '0.8',
    };
}

describe('Grote baden — autosave waarschuwt niet meer over onvolledige velden', () => {
    it('alleen pH + chloor ingevuld → status "saved" (geen "warning" meer)', async () => {
        zetMeetwaardenFormulier({
            'ph-diep': '7.2', 'chloor-diep': '1.0',
            'ph-ondiep': '7.2', 'chloor-ondiep': '1.0',
        });
        const app = maakApp();

        await new OpslaanModule(app).verwerkCentraleOpslaan(true);

        expect(app.ui.setAutoSaveStatus).toHaveBeenCalledWith('saved');
        expect(app.ui.setAutoSaveStatus).not.toHaveBeenCalledWith('warning');
        // De volledigheid wordt passief via de markering bijgewerkt.
        expect(app.metingen.werkVolledigheidBij).toHaveBeenCalled();
    });

    it('alle velden van beide baden ingevuld → status "saved"', async () => {
        zetMeetwaardenFormulier({ ...volledigBad('diep'), ...volledigBad('ondiep') });
        const app = maakApp();

        await new OpslaanModule(app).verwerkCentraleOpslaan(true);

        expect(app.ui.setAutoSaveStatus).toHaveBeenCalledWith('saved');
        expect(app.ui.setAutoSaveStatus).not.toHaveBeenCalledWith('warning');
    });
});

describe('Grote baden — automatische verversing van indicatoren én tab-badges na opslaan', () => {
    it('werkt na opslaan zowel de veld-indicatoren (laadActies) als de tab-badges (werkBadgeBij) bij', async () => {
        zetMeetwaardenFormulier({ 'flow-diep': '10' }); // lage flow → actie + badge
        const app = maakApp();

        await new OpslaanModule(app).verwerkCentraleOpslaan(true);

        // Regressie: voorheen werd alleen laadActies aangeroepen, niet werkBadgeBij,
        // waardoor de ⚠-badge op de Diep/Ondiep- en Taken-tab pas na een volledige
        // herlaad verscheen i.p.v. automatisch na het opslaan.
        const datum = '2026-07-15';
        expect(app.metingen.laadActies).toHaveBeenCalledWith(datum);
        expect(app.taken.werkBadgeBij).toHaveBeenCalledWith(datum);
        expect(app.metingen.werkVolledigheidBij).toHaveBeenCalled();
    });
});

describe('Grote baden — Verbruik/Verwarmingssysteem opslaan waarschuwt niet', () => {
    /** App met gemockte slaAlgemeenGegevensOp (geeft nu enkel ok terug). */
    function maakVerbruikApp(subtab: string) {
        return {
            api: { call: jest.fn() },
            ui: { toonBericht: jest.fn(), setAutoSaveStatus: jest.fn() },
            metingen: { laadMetingen: jest.fn(), laadActies: jest.fn(), werkVolledigheidBij: jest.fn() },
            taken: { werkBadgeBij: jest.fn() },
            verbruik: {
                slaAlgemeenGegevensOp: jest.fn(async () => true),
                laadEnBerekenVerbruik: jest.fn(), laadEnBerekenPeuterbadVerbruik: jest.fn(),
            },
            state: {
                huidigeRol: 'waterbeheer', huidigeBadPagina: 'grote-baden',
                huidigeSubtab: subtab, huidigeCoordSubtab: 'metingen',
                huidigePeuterbadSubtab: 'meetwaarden',
            },
        };
    }

    beforeEach(() => { document.body.innerHTML = `<input id="centraleDatum" value="2026-07-15">`; });

    it('Verbruik-subtab → status "saved" (volledigheid via de markering)', async () => {
        const app = maakVerbruikApp('verbruik');
        await new OpslaanModule(app).verwerkCentraleOpslaan(true);
        expect(app.ui.setAutoSaveStatus).toHaveBeenCalledWith('saved');
        expect(app.ui.setAutoSaveStatus).not.toHaveBeenCalledWith('warning');
    });

    it('Verwarmingssysteem-subtab → status "saved"', async () => {
        const app = maakVerbruikApp('verwarmingssysteem');
        await new OpslaanModule(app).verwerkCentraleOpslaan(true);
        expect(app.ui.setAutoSaveStatus).toHaveBeenCalledWith('saved');
        expect(app.ui.setAutoSaveStatus).not.toHaveBeenCalledWith('warning');
    });
});
