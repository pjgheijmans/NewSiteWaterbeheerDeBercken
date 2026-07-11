/**
 * @jest-environment jsdom
 *
 * laadBezoekers vult de alleen-lezen bezoekersvelden. Ontbrekende waarden tonen
 * een em-dash (—) — net als andere alleen-lezen velden — zodat een lege cel niet
 * als 'gat' oogt; 0 en echte waarden blijven staan.
 */

export {};
const MetingenModule = require('../../../frontend/js/metingen.js');

function maakApp(bezoekers: Record<string, unknown>) {
    return {
        api: { call: jest.fn(async () => ({ json: async () => bezoekers })) },
    };
}

beforeEach(() => {
    document.body.innerHTML = `
        <input id="centraleDatum" value="2026-07-15">
        <input id="bezoekers-vandaag-display" disabled>
        <input id="bezoekers-spoelbeurt-diep-display" disabled>
        <input id="bezoekers-spoelbeurt-ondiep-display" disabled>
    `;
});

describe('laadBezoekers — em-dash bij ontbrekende waarde', () => {
    it('bezoekers_vandaag null → em-dash', async () => {
        const app = maakApp({
            bezoekers_vandaag: null,
            bezoekers_totaal_diep: 0,
            bezoekers_totaal_ondiep: 0,
        });
        await new MetingenModule(app).laadBezoekers();
        expect((document.getElementById('bezoekers-vandaag-display') as HTMLInputElement).value).toBe(
            '—',
        );
    });

    it('0 en echte waarden blijven staan (geen em-dash)', async () => {
        const app = maakApp({
            bezoekers_vandaag: 120,
            bezoekers_totaal_diep: 0,
            bezoekers_totaal_ondiep: 340,
        });
        await new MetingenModule(app).laadBezoekers();
        expect((document.getElementById('bezoekers-vandaag-display') as HTMLInputElement).value).toBe(
            '120',
        );
        expect(
            (document.getElementById('bezoekers-spoelbeurt-diep-display') as HTMLInputElement).value,
        ).toBe('0');
        expect(
            (document.getElementById('bezoekers-spoelbeurt-ondiep-display') as HTMLInputElement).value,
        ).toBe('340');
    });
});
