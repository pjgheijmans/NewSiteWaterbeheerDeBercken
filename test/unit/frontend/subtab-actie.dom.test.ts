/**
 * @jest-environment jsdom
 *
 * jsdom-tests voor de ⚠-actiemarkering op de subtab-knop zelf
 * (MetingenModule.laadActies). Naast de veld-indicator en de pagina-/Taken-badge
 * krijgt nu ook de subtab die het getriggerde veld bevat een ⚠, zodat je vanaf
 * die subtab ziet dat er een open actie op staat — ongeacht of de velden volledig
 * zijn ingevuld.
 */
/* eslint-disable @typescript-eslint/no-var-requires */
export {};
const MetingenModule = require('../../../frontend/js/metingen.js');

function maakApp(acties: any[]) {
    return {
        api: { call: jest.fn(async () => ({ json: async () => acties })) },
        state: { huidigeRol: 'waterbeheer', huidigeBadPagina: 'grote-baden' },
    };
}

function zetDom() {
    document.body.innerHTML = `
        <button id="subtab-meetwaarden">Meetwaarden</button>
        <button id="subtab-verbruik">Verbruik</button>
        <div id="subtab-meetwaarden-content"><div class="cel"><input id="flow-diep"></div></div>
        <div id="subtab-verbruik-content"><div class="cel"><input id="chemicalien-chloor"></div></div>`;
}

const heeftActie = (id: string) =>
    !!document.getElementById(id)?.querySelector('.tab-actie-indicator');

describe('Subtab-knop krijgt ⚠ bij een open actie op een veld in die subtab', () => {
    beforeEach(zetDom);

    it('flow-actie (Meetwaarden) → ⚠ op de Meetwaarden-subtab, niet op Verbruik', async () => {
        const app = maakApp([
            {
                actie_type: 'filter_spoelen_flow',
                bad_naam: 'Diep',
                opgelost: false,
                beschrijving: 'Flow te laag',
            },
        ]);
        await new MetingenModule(app).laadActies('2026-07-15');
        expect(heeftActie('subtab-meetwaarden')).toBe(true);
        expect(heeftActie('subtab-verbruik')).toBe(false);
    });

    it('chloor-bestellen-actie (Verbruik) → ⚠ op de Verbruik-subtab', async () => {
        const app = maakApp([
            {
                actie_type: 'chloor_bestellen',
                bad_naam: 'Diep',
                opgelost: false,
                beschrijving: 'Chloor bestellen',
            },
        ]);
        await new MetingenModule(app).laadActies('2026-07-15');
        expect(heeftActie('subtab-verbruik')).toBe(true);
        expect(heeftActie('subtab-meetwaarden')).toBe(false);
    });

    it('geen open acties → geen ⚠ op de subtabs', async () => {
        const app = maakApp([]);
        await new MetingenModule(app).laadActies('2026-07-15');
        expect(heeftActie('subtab-meetwaarden')).toBe(false);
        expect(heeftActie('subtab-verbruik')).toBe(false);
    });

    it('opgeloste actie telt niet mee voor de subtab-⚠', async () => {
        const app = maakApp([
            {
                actie_type: 'filter_spoelen_flow',
                bad_naam: 'Diep',
                opgelost: true,
                opgelost_op: '2026-07-15T10:00',
            },
        ]);
        await new MetingenModule(app).laadActies('2026-07-15');
        expect(heeftActie('subtab-meetwaarden')).toBe(false);
    });

    it('⚠ verdwijnt weer zodra de actie bij een herlaad weg is', async () => {
        const meting = new MetingenModule(
            maakApp([
                {
                    actie_type: 'filter_spoelen_flow',
                    bad_naam: 'Diep',
                    opgelost: false,
                    beschrijving: 'x',
                },
            ]),
        );
        await meting.laadActies('2026-07-15');
        expect(heeftActie('subtab-meetwaarden')).toBe(true);

        // Herlaad zonder open acties (bv. nadat de actie is afgehandeld).
        meting.app.api.call = jest.fn(async () => ({ json: async () => [] }));
        await meting.laadActies('2026-07-15');
        expect(heeftActie('subtab-meetwaarden')).toBe(false);
    });

    it('blijft staan naast de veld-indicator (de cleanup van .actie-indicator raakt de subtab-⚠ niet)', async () => {
        const app = maakApp([
            {
                actie_type: 'filter_spoelen_flow',
                bad_naam: 'Diep',
                opgelost: false,
                beschrijving: 'x',
            },
        ]);
        await new MetingenModule(app).laadActies('2026-07-15');
        // Veld-indicator naast flow-diep én subtab-⚠ bestaan allebei.
        expect(
            document.getElementById('flow-diep')!.parentElement!.querySelector('.actie-indicator'),
        ).not.toBeNull();
        expect(heeftActie('subtab-meetwaarden')).toBe(true);
    });
});
