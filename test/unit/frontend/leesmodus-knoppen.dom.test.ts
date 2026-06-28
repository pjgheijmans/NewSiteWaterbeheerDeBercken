/**
 * @jest-environment jsdom
 *
 * jsdom-test voor de alleen-lezen bewaking op schrijf-actieknoppen. Een gebruiker
 * met alleen leesrecht (bv. waterbeheer die de coordinator-tab mag inzien) mag via
 * de "+ Nieuw blok/tekstblok"-knop géén nieuwe blokken kunnen aanmaken. De knoppen
 * zijn visueel uitgeschakeld via de .schrijf-actie CSS in alleen-lezen modus; deze
 * test borgt de tweede verdedigingslinie: de handlers zelf doen niets wanneer
 * magNuOpslaan() false is (bv. toetsenbord-/programmatische activatie).
 */
export {};

const MetingenModule = require('../../../frontend/js/metingen.js');
const LogboekModule = require('../../../frontend/js/logboek.js');

function maakApp(magOpslaan: boolean) {
    return {
        auth: { magNuOpslaan: () => magOpslaan },
        state: {
            ingelogdeGebruiker: { voornaam: 'Test', achternaam: 'User', inlognaam: 'test' },
        },
        ui: { toonBericht: jest.fn(), valideerVeld: jest.fn() },
        opslaan: { scheduleAutoSaveBlok: jest.fn() },
        api: {
            call: jest.fn(async () => ({ ok: true, json: async () => ({ id: 1, auteur: '' }) })),
        },
    };
}

describe('MetingenModule.voegNieuwBlokToe — alleen-lezen bewaking', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <input id="centraleDatum" value="2026-07-15">
            <div id="coordinatoren-blokken-content"><div class="btn-rij"></div></div>`;
    });

    it('voegt geen meetblok toe wanneer opslaan niet mag', () => {
        new MetingenModule(maakApp(false)).voegNieuwBlokToe();
        expect(document.querySelectorAll('[data-blok-tijdstip]').length).toBe(0);
    });

    it('voegt wel een meetblok toe wanneer opslaan mag', () => {
        new MetingenModule(maakApp(true)).voegNieuwBlokToe();
        expect(document.querySelectorAll('[data-blok-tijdstip]').length).toBe(1);
    });
});

describe('LogboekModule.voegLogboekBlokToe — alleen-lezen bewaking', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <input id="centraleDatum" value="2026-07-15">
            <div id="logboek-blokken"></div>`;
    });

    it('doet geen API-aanroep wanneer opslaan niet mag', async () => {
        const app = maakApp(false);
        await new LogboekModule(app).voegLogboekBlokToe();
        expect(app.api.call).not.toHaveBeenCalled();
        expect(document.querySelectorAll('#logboek-blokken > *').length).toBe(0);
    });

    it('maakt wel een tekstblok aan wanneer opslaan mag', async () => {
        const app = maakApp(true);
        await new LogboekModule(app).voegLogboekBlokToe();
        expect(app.api.call).toHaveBeenCalledTimes(1);
        expect(document.querySelectorAll('#logboek-blokken > *').length).toBe(1);
    });
});
