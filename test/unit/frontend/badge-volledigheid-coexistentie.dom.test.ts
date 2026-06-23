/**
 * @jest-environment jsdom
 *
 * Reproductie: tonen de actie-badge (⚠ op pagina-/Taken-tab) en de
 * volledigheids-markering (• op Meetwaarden/Verbruik) tegelijk correct?
 */
/* eslint-disable @typescript-eslint/no-var-requires */
export {};
const ApiClient = require('../../../frontend/js/api.js');
const OpslaanModule = require('../../../frontend/js/opslaan.js');
const VerbruikModule = require('../../../frontend/js/verbruik.js');
(global as any).OpslaanModule = OpslaanModule;
(global as any).VerbruikModule = VerbruikModule;
const MetingenModule = require('../../../frontend/js/metingen.js');
const TakenModule = require('../../../frontend/js/taken.js');

function zetDom() {
    document.body.innerHTML = `
        <button id="tab-grote-baden">Diep / Ondiep</button>
        <button id="tab-peuterbad">Peuterbad</button>
        <button id="subtab-meetwaarden">Meetwaarden</button>
        <button id="subtab-verbruik">Verbruik</button>
        <button id="subtab-taken">Taken</button>`;
}

function maakApp() {
    return {
        api: new ApiClient(),
        state: { huidigeRol: 'waterbeheer', huidigeBadPagina: 'grote-baden' },
    };
}

const actieItem = {
    sleutel: 'a1',
    pagina: 'grote-baden',
    categorie: 'verplicht',
    voltooid: false,
    gebied: 'Diep',
    label: 'Filter spoelen',
};

const heeftActie = (id: string) =>
    !!document.getElementById(id)?.querySelector('.tab-actie-indicator');
const heeftDot = (id: string) =>
    !!document.getElementById(id)?.querySelector('.tab-onvolledig-indicator');

describe('Actie-badge en volledigheids-markering naast elkaar', () => {
    beforeEach(zetDom);

    it('badge eerst, dan volledigheid → beide blijven staan (ook samen op de pagina-tab)', async () => {
        const taken = new TakenModule(maakApp());
        taken._haalOp = jest.fn(async () => [actieItem]);
        await taken.werkBadgeBij('2026-07-15');
        new MetingenModule(maakApp()).werkVolledigheidBij();

        expect(heeftActie('tab-grote-baden')).toBe(true);
        expect(heeftActie('subtab-taken')).toBe(true);
        expect(heeftDot('subtab-meetwaarden')).toBe(true);
        // Op de pagina-tab staan nu zowel de ⚠-actie als het volledigheids-bolletje.
        expect(heeftActie('tab-grote-baden')).toBe(true);
        expect(heeftDot('tab-grote-baden')).toBe(true);
        expect(document.getElementById('tab-grote-baden')!.textContent).toContain('Diep / Ondiep');
    });

    it('volledigheid eerst, dan badge → het bolletje overleeft de label-update van _zetMarker', async () => {
        new MetingenModule(maakApp()).werkVolledigheidBij();
        expect(heeftDot('tab-grote-baden')).toBe(true);

        const taken = new TakenModule(maakApp());
        taken._haalOp = jest.fn(async () => [actieItem]);
        await taken.werkBadgeBij('2026-07-15');

        expect(heeftActie('tab-grote-baden')).toBe(true);
        expect(heeftActie('subtab-taken')).toBe(true);
        expect(heeftDot('subtab-meetwaarden')).toBe(true);
        // Regressie: _zetMarker zette voorheen btn.textContent en wiste daarmee het bolletje.
        expect(heeftDot('tab-grote-baden')).toBe(true);
        expect(document.getElementById('tab-grote-baden')!.textContent).toContain('Diep / Ondiep');
    });

    it('actie verdwijnt (heeft=false) → ⚠ weg, bolletje en label blijven', async () => {
        new MetingenModule(maakApp()).werkVolledigheidBij(); // bolletje op pagina-tab
        const taken = new TakenModule(maakApp());
        taken._haalOp = jest.fn(async () => [actieItem]);
        await taken.werkBadgeBij('2026-07-15'); // ⚠ erbij
        taken._haalOp = jest.fn(async () => []); // geen open acties meer
        await taken.werkBadgeBij('2026-07-15');

        expect(heeftActie('tab-grote-baden')).toBe(false);
        expect(heeftDot('tab-grote-baden')).toBe(true);
        expect(document.getElementById('tab-grote-baden')!.textContent).toContain('Diep / Ondiep');
    });
});
