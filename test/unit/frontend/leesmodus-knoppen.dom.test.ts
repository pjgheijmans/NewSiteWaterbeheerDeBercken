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
const AuthModule = require('../../../frontend/js/auth.js');

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

describe('AuthModule.actualiseerLeesmodus — velden onbewerkbaar in alleen-lezen', () => {
    function maakAuthApp(rechten: Record<string, string>, datum = '2026-07-15') {
        const app: any = {
            state: {
                huidigeRol: 'waterbeheer',
                ingelogdeGebruiker: { rechten, magHistorie: false },
            },
        };
        app.auth = new AuthModule(app);
        document.body.innerHTML = `
            <input id="centraleDatum" value="${datum}">
            <div id="sectie-dagstaat">
                <input type="number" class="c-vrij" value="1">
                <input type="text" class="notitie" value="x">
                <input type="text" class="leeg" value="">
                <select class="keuze"><option>a</option></select>
                <input type="number" class="berekend" readonly value="9">
            </div>`;
        return app;
    }

    it('zet bewerkbare velden op readonly/disabled zonder schrijfrecht', () => {
        const app = maakAuthApp({ waterbeheer: 'lezen' });
        app.auth.actualiseerLeesmodus();
        const sectie = document.getElementById('sectie-dagstaat')!;
        expect(sectie.classList.contains('alleen-lezen')).toBe(true);
        expect((sectie.querySelector('.c-vrij') as HTMLInputElement).readOnly).toBe(true);
        expect((sectie.querySelector('.notitie') as HTMLInputElement).readOnly).toBe(true);
        expect((sectie.querySelector('.keuze') as HTMLSelectElement).disabled).toBe(true);
        // Leeg veld krijgt een em-dash placeholder; gevuld veld niet.
        expect((sectie.querySelector('.leeg') as HTMLInputElement).placeholder).toBe('—');
        expect((sectie.querySelector('.notitie') as HTMLInputElement).placeholder).toBe('');
    });

    it('laat velden bewerkbaar met schrijfrecht op vandaag', () => {
        const app = maakAuthApp({ waterbeheer: 'schrijven' }, '2026-07-15');
        // magNuOpslaan gebruikt de kalenderdag Europe/Amsterdam; zet de datum op
        // die dag zodat dit los van de systeemklok slaagt.
        const vandaag = app.auth._vandaag();
        (document.getElementById('centraleDatum') as HTMLInputElement).value = vandaag;
        app.auth.actualiseerLeesmodus();
        const sectie = document.getElementById('sectie-dagstaat')!;
        expect(sectie.classList.contains('alleen-lezen')).toBe(false);
        expect((sectie.querySelector('.c-vrij') as HTMLInputElement).readOnly).toBe(false);
        expect((sectie.querySelector('.keuze') as HTMLSelectElement).disabled).toBe(false);
    });

    it('draait de aanpassing terug wanneer opslaan weer mag (en raakt vooraf-readonly velden niet)', () => {
        const app = maakAuthApp({ waterbeheer: 'lezen' });
        app.auth.actualiseerLeesmodus(); // nu alleen-lezen
        const berekend = document.querySelector('.berekend') as HTMLInputElement;
        expect(berekend.readOnly).toBe(true); // van zichzelf al readonly
        expect(berekend.hasAttribute('data-leesmodus-readonly')).toBe(false); // niet door ons gezet

        // Verleen schrijfrecht en herbereken → velden weer bewerkbaar, berekend blijft readonly.
        app.state.ingelogdeGebruiker.rechten.waterbeheer = 'schrijven';
        (document.getElementById('centraleDatum') as HTMLInputElement).value = app.auth._vandaag();
        app.auth.actualiseerLeesmodus();
        expect((document.querySelector('.c-vrij') as HTMLInputElement).readOnly).toBe(false);
        expect(berekend.readOnly).toBe(true);
        // De em-dash placeholder is weer weg zodra het veld bewerkbaar is.
        expect((document.querySelector('.leeg') as HTMLInputElement).placeholder).toBe('');
    });
});
