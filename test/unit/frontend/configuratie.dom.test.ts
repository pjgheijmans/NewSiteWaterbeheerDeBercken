/**
 * @jest-environment jsdom
 *
 * jsdom-tests voor de autosave (1,2 s debounce) van het configuratiescherm:
 * geen opslaan-knop meer, een wijziging slaat zichzelf op zoals elders in de app.
 */

export {};
const ConfiguratieModule = require('../../../frontend/js/configuratie.js');

const ITEMS = [
    {
        sleutel: 'sessie_timeout_minuten',
        waarde: '5',
        omschrijving: 'Sessie-time-out',
        type: 'getal',
    },
];

function maakApp() {
    return {
        api: {
            call: jest.fn(async (url: string, opts?: any) => {
                if (url === '/api/configuratie' && !opts) return { json: async () => ITEMS };
                return { ok: true, json: async () => ({}) };
            }),
        },
        ui: { toonBericht: jest.fn() },
        state: { configuratieSaveTimers: {} as Record<string, any> },
    };
}

beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = `
        <table><tbody id="configuratieTbody"></tbody></table>
        <span id="configuratieSaveStatus"></span>`;
});
afterEach(() => jest.useRealTimers());

function putCalls(app: any) {
    return app.api.call.mock.calls.filter((c: any[]) => c[1]?.method === 'PUT');
}

describe('Configuratie — autosave (geen knop)', () => {
    it('rendert een invoerveld zonder opslaan-knop', async () => {
        const app = maakApp();
        await new ConfiguratieModule(app).laad();
        expect(document.getElementById('cfg-sessie_timeout_minuten')).not.toBeNull();
        expect(document.querySelector('#configuratieTbody button')).toBeNull();
    });

    it('een wijziging slaat na 1,2 s automatisch op met de juiste waarde', async () => {
        const app = maakApp();
        await new ConfiguratieModule(app).laad();

        const input = document.getElementById('cfg-sessie_timeout_minuten') as HTMLInputElement;
        input.value = '10';
        input.dispatchEvent(new Event('input'));

        // Vóór de debounce nog geen PUT.
        expect(putCalls(app)).toHaveLength(0);

        await jest.advanceTimersByTimeAsync(1200);

        const put = putCalls(app);
        expect(put).toHaveLength(1);
        expect(put[0][0]).toBe('/api/configuratie/sessie_timeout_minuten');
        expect(JSON.parse(put[0][1].body)).toEqual({ waarde: '10' });
    });

    it('debounce: snel achter elkaar typen levert één opslag op', async () => {
        const app = maakApp();
        await new ConfiguratieModule(app).laad();
        const input = document.getElementById('cfg-sessie_timeout_minuten') as HTMLInputElement;

        input.value = '1';
        input.dispatchEvent(new Event('input'));
        await jest.advanceTimersByTimeAsync(400);
        input.value = '12';
        input.dispatchEvent(new Event('input'));
        await jest.advanceTimersByTimeAsync(1200);

        const put = putCalls(app);
        expect(put).toHaveLength(1);
        expect(JSON.parse(put[0][1].body)).toEqual({ waarde: '12' });
    });

    it('toont een foutmelding als de backend de opslag weigert', async () => {
        const app = maakApp();
        app.api.call = jest.fn(async (url: string, opts?: any) => {
            if (url === '/api/configuratie' && !opts) return { json: async () => ITEMS };
            return {
                ok: false,
                json: async () => ({ error: 'Sessie-time-out moet 1–1440 zijn.' }),
            };
        });
        await new ConfiguratieModule(app).laad();
        const input = document.getElementById('cfg-sessie_timeout_minuten') as HTMLInputElement;
        input.value = '0';
        input.dispatchEvent(new Event('input'));
        await jest.advanceTimersByTimeAsync(1200);
        expect(app.ui.toonBericht).toHaveBeenCalledWith(
            'Sessie-time-out moet 1–1440 zijn.',
            'fout',
        );
        expect(document.getElementById('configuratieSaveStatus')!.textContent).toContain('Fout');
    });
});
