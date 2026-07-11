/**
 * @jest-environment jsdom
 *
 * jsdom-test voor VerbruikModule.laadEnBerekenVerbruik (Diep/Ondiep):
 * de negen verbruik-cellen krijgen (huidig − vorige dag).
 */
export {};

const VerbruikModule = require('../../../frontend/js/verbruik.js');

describe('VerbruikModule.laadEnBerekenVerbruik (Diep/Ondiep)', () => {
    it('vult alle verbruik-cellen met het verschil t.o.v. de vorige dag', async () => {
        const velden = [
            'water-diep',
            'water-ondiep',
            'water-totaal',
            'elektriciteit-nacht',
            'elektriciteit-dag',
            'gas',
            'Flocculant',
            'chemicalien-chloor',
            'chemicalien-zwavelzuur',
        ];
        document.body.innerHTML =
            `<input id="centraleDatum" value="2026-07-15">` +
            velden.map((id) => `<input id="${id}-verbruik">`).join('');

        const huidig = {
            water_diep: 1000,
            water_ondiep: 500,
            water_totaal: 1500,
            elektriciteit_nacht: 200,
            elektriciteit_dag: 300,
            gas: 80,
            Flocculant: 12,
            chemicalien_chloor: 40,
            chemicalien_zwavelzuur: 15,
        };
        const vorige = {
            water_diep: 900,
            water_ondiep: 450,
            water_totaal: 1350,
            elektriciteit_nacht: 180,
            elektriciteit_dag: 250,
            gas: 70,
            Flocculant: 10,
            chemicalien_chloor: 50,
            chemicalien_zwavelzuur: 20,
        };

        const app: any = {
            api: {
                call: jest.fn(async (url: string) => ({
                    json: async () => (url.includes('/vorige') ? vorige : huidig),
                })),
            },
        };

        await new VerbruikModule(app).laadEnBerekenVerbruik();

        const val = (id: string) =>
            (document.getElementById(`${id}-verbruik`) as HTMLInputElement).value;
        expect(val('water-diep')).toBe('100'); // 1000 − 900
        expect(val('water-totaal')).toBe('150'); // 1500 − 1350
        expect(val('gas')).toBe('10'); // 80 − 70
        expect(val('chemicalien-chloor')).toBe('-10'); // 40 − 50
        expect(val('chemicalien-zwavelzuur')).toBe('-5'); // 15 − 20
    });

    it("zet '-' wanneer de huidige stand ontbreekt", async () => {
        document.body.innerHTML = `<input id="centraleDatum" value="2026-07-15"><input id="gas-verbruik">`;
        const app: any = {
            api: { call: jest.fn(async () => ({ json: async () => ({}) })) },
        };
        await new VerbruikModule(app).laadEnBerekenVerbruik();
        expect((document.getElementById('gas-verbruik') as HTMLInputElement).value).toBe('-');
    });
});
