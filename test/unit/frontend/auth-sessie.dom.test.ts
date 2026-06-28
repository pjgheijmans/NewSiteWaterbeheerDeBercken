/**
 * @jest-environment jsdom
 *
 * Tests voor de afhandeling van een verlopen sessie (idle-time-out → HTTP 401):
 * ApiClient vangt de 401 en AuthModule.sessieVerlopen keert terug naar het
 * loginscherm met een blijvende uitleg in #login-fout (Option A).
 */

export {};
const ApiClient = require('../../../frontend/js/api.js');
const AuthModule = require('../../../frontend/js/auth.js');

function zetDom() {
    document.body.innerHTML = `
        <div id="scherm-login" style="display:none"></div>
        <div id="scherm-dashboard" style="display:block"></div>
        <div id="login-fout"></div>
        <div id="gebruiker-dropdown" style="display:none"></div>`;
}

function maakApp(ingelogd = true) {
    const app: any = {
        state: { ingelogdeGebruiker: ingelogd ? { id: 1, taak: 'Administrator' } : null },
        ui: { toonBericht: jest.fn() },
    };
    app.api = new ApiClient(app);
    app.auth = new AuthModule(app);
    return app;
}

function mockFetch(status: number) {
    (global as any).fetch = jest.fn(async () => ({
        status,
        ok: status < 400,
        json: async () => ({}),
    }));
}

beforeEach(zetDom);

describe('Sessie verlopen (401) — Option A', () => {
    it('een 401 op een gewone call brengt de gebruiker terug naar login met blijvende uitleg', async () => {
        mockFetch(401);
        const app = maakApp(true);

        await app.api.call('/api/configuratie');

        expect(document.getElementById('scherm-login')!.style.display).toBe('block');
        expect(document.getElementById('scherm-dashboard')!.style.display).toBe('none');
        expect(document.getElementById('login-fout')!.innerText).toContain('verlopen');
        expect(app.state.ingelogdeGebruiker).toBeNull();
        // Geen vluchtige toast meer voor dit geval.
        expect(app.ui.toonBericht).not.toHaveBeenCalled();
    });

    it('een 401 op de login-call zelf triggert GEEN sessie-verlopen (lokaal afgehandeld)', async () => {
        mockFetch(401);
        const app = maakApp(true);

        await app.api.call('/api/login', { method: 'POST' });

        // Schermen onveranderd; nog steeds ingelogd-staat.
        expect(document.getElementById('scherm-login')!.style.display).toBe('none');
        expect(document.getElementById('scherm-dashboard')!.style.display).toBe('block');
        expect(app.state.ingelogdeGebruiker).not.toBeNull();
    });

    it('een 200 verandert niets', async () => {
        mockFetch(200);
        const app = maakApp(true);
        await app.api.call('/api/configuratie');
        expect(document.getElementById('scherm-dashboard')!.style.display).toBe('block');
        expect(app.state.ingelogdeGebruiker).not.toBeNull();
    });

    it('sessieVerlopen is idempotent: een tweede 401 doet niets extra (al uitgelogd)', async () => {
        mockFetch(401);
        const app = maakApp(true);
        await app.api.call('/api/configuratie');
        const fout = document.getElementById('login-fout')!;
        fout.innerText = 'GEWIJZIGD'; // simuleer dat de gebruiker al begint te typen
        await app.api.call('/api/configuratie'); // tweede 401
        // Guard (ingelogdeGebruiker === null) voorkomt dat de melding opnieuw gezet wordt.
        expect(fout.innerText).toBe('GEWIJZIGD');
    });

    it('ApiClient zonder app-referentie crasht niet op een 401', async () => {
        mockFetch(401);
        const api = new ApiClient(); // geen app
        const res = await api.call('/api/configuratie');
        expect(res.status).toBe(401);
    });
});
