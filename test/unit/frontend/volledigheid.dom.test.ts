/**
 * @jest-environment jsdom
 *
 * jsdom-tests voor de passieve "nog niet alle velden ingevuld"-markering op de
 * subtabs (MetingenModule.werkVolledigheidBij). Vervangt de oude waarschuwing-
 * na-elke-opslag: een gedempt bolletje op Meetwaarden/Verbruik zolang die subtab
 * onvolledig is, live meelopend met de invoer.
 */
/* eslint-disable @typescript-eslint/no-var-requires */
export {}; // markeer als module zodat top-level consts niet botsen met andere testbestanden
const ApiClient = require('../../../frontend/js/api.js');
const OpslaanModule = require('../../../frontend/js/opslaan.js');
const VerbruikModule = require('../../../frontend/js/verbruik.js');
// In de browser zijn dit globale klassen (classic scripts); metingen.js verwijst
// er bij runtime naar. In Node moeten we ze als global beschikbaar maken.
(global as any).OpslaanModule = OpslaanModule;
(global as any).VerbruikModule = VerbruikModule;
const MetingenModule = require('../../../frontend/js/metingen.js');

function maakApp(huidigeBadPagina: string) {
    return { api: new ApiClient(), state: { huidigeRol: 'waterbeheer', huidigeBadPagina } };
}

function heeftMarker(buttonId: string): boolean {
    return !!document.getElementById(buttonId)?.querySelector('.tab-onvolledig-indicator');
}

const MEET_VELDEN = ['ph', 'chloor', 'temp', 'flow', 'filter-in', 'filter-uit', 'kath'];
const VERBRUIK_IDS = ['water-diep', 'water-ondiep', 'water-totaal', 'elektriciteit-nacht',
    'elektriciteit-dag', 'gas', 'floculant', 'chemicalien-chloor', 'chemicalien-zwavelzuur'];
const PEUTER_IDS = ['peuterbad-ph', 'peuterbad-chloor', 'peuterbad-flow', 'peuterbad-filterdruk',
    'peuterbad-water', 'peuterbad-chemicalien-chloor', 'peuterbad-chemicalien-zwavelzuur'];

function vul(velden: Record<string, string>) {
    for (const [id, val] of Object.entries(velden)) {
        (document.getElementById(id) as HTMLInputElement).value = val;
    }
}

describe('Grote baden — volledigheids-markering op subtabs', () => {
    function zetDom() {
        const meet = ['diep', 'ondiep'].flatMap(b => MEET_VELDEN.map(v => `<input id="${v}-${b}">`)).join('');
        const verbruik = VERBRUIK_IDS.map(id => `<input id="${id}">`).join('');
        document.body.innerHTML = `
            <button id="tab-grote-baden">Diep / Ondiep</button>
            <button id="subtab-meetwaarden">Meetwaarden</button>
            <button id="subtab-verbruik">Verbruik</button>
            ${meet}${verbruik}`;
    }
    const alleMeet = () => Object.fromEntries(
        ['diep', 'ondiep'].flatMap(b => MEET_VELDEN.map(v => [`${v}-${b}`, '1'])));
    const alleVerbruik = () => Object.fromEntries(VERBRUIK_IDS.map(id => [id, '1']));

    beforeEach(zetDom);

    it('alles leeg → markering op Meetwaarden, Verbruik én de Diep/Ondiep-pagina-tab', () => {
        new MetingenModule(maakApp('grote-baden')).werkVolledigheidBij();
        expect(heeftMarker('subtab-meetwaarden')).toBe(true);
        expect(heeftMarker('subtab-verbruik')).toBe(true);
        expect(heeftMarker('tab-grote-baden')).toBe(true);
    });

    it('alles volledig → ook de pagina-tab is schoon', () => {
        vul({ ...alleMeet(), ...alleVerbruik() });
        new MetingenModule(maakApp('grote-baden')).werkVolledigheidBij();
        expect(heeftMarker('tab-grote-baden')).toBe(false);
    });

    it('alleen Verbruik onvolledig → pagina-tab houdt de markering', () => {
        vul(alleMeet());
        new MetingenModule(maakApp('grote-baden')).werkVolledigheidBij();
        expect(heeftMarker('subtab-meetwaarden')).toBe(false);
        expect(heeftMarker('tab-grote-baden')).toBe(true);
    });

    it('alleen Meetwaarden volledig → markering verdwijnt daar, blijft op Verbruik', () => {
        vul(alleMeet());
        new MetingenModule(maakApp('grote-baden')).werkVolledigheidBij();
        expect(heeftMarker('subtab-meetwaarden')).toBe(false);
        expect(heeftMarker('subtab-verbruik')).toBe(true);
    });

    it('alles volledig → geen markeringen', () => {
        vul({ ...alleMeet(), ...alleVerbruik() });
        new MetingenModule(maakApp('grote-baden')).werkVolledigheidBij();
        expect(heeftMarker('subtab-meetwaarden')).toBe(false);
        expect(heeftMarker('subtab-verbruik')).toBe(false);
    });

    it('één bad onvolledig (kath-ondiep leeg) → Meetwaarden houdt de markering', () => {
        const velden = alleMeet();
        delete velden['kath-ondiep'];
        vul(velden);
        new MetingenModule(maakApp('grote-baden')).werkVolledigheidBij();
        expect(heeftMarker('subtab-meetwaarden')).toBe(true);
    });

    it('0 telt als ingevuld (geen markering)', () => {
        vul({ ...Object.fromEntries(['diep', 'ondiep'].flatMap(b => MEET_VELDEN.map(v => [`${v}-${b}`, '0']))),
              ...Object.fromEntries(VERBRUIK_IDS.map(id => [id, '0'])) });
        new MetingenModule(maakApp('grote-baden')).werkVolledigheidBij();
        expect(heeftMarker('subtab-meetwaarden')).toBe(false);
        expect(heeftMarker('subtab-verbruik')).toBe(false);
    });

    it('is idempotent — tweemaal aanroepen levert geen dubbele markering', () => {
        const m = new MetingenModule(maakApp('grote-baden'));
        m.werkVolledigheidBij();
        m.werkVolledigheidBij();
        expect(document.getElementById('subtab-meetwaarden')!
            .querySelectorAll('.tab-onvolledig-indicator').length).toBe(1);
    });

    it('markering verschijnt en verdwijnt weer als de velden worden aangevuld', () => {
        const m = new MetingenModule(maakApp('grote-baden'));
        m.werkVolledigheidBij();
        expect(heeftMarker('subtab-meetwaarden')).toBe(true);
        vul(alleMeet());
        m.werkVolledigheidBij();
        expect(heeftMarker('subtab-meetwaarden')).toBe(false);
    });
});

describe('Peuterbad — volledigheids-markering op subtabs', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <button id="tab-peuterbad">Peuterbad</button>
            <button id="subtab-peuterbad-meetwaarden">Meetwaarden</button>
            <button id="subtab-peuterbad-verbruik">Verbruik</button>
            ${PEUTER_IDS.map(id => `<input id="${id}">`).join('')}`;
    });

    it('alles leeg → markering op beide peuterbad-subtabs én de Peuterbad-pagina-tab', () => {
        new MetingenModule(maakApp('peuterbad')).werkVolledigheidBij();
        expect(heeftMarker('subtab-peuterbad-meetwaarden')).toBe(true);
        expect(heeftMarker('subtab-peuterbad-verbruik')).toBe(true);
        expect(heeftMarker('tab-peuterbad')).toBe(true);
    });

    it('alleen Meetwaarden-velden (pH/chloor/flow/filterdruk) → Meetwaarden schoon, Verbruik gemarkeerd', () => {
        vul({ 'peuterbad-ph': '7.2', 'peuterbad-chloor': '1.0', 'peuterbad-flow': '5', 'peuterbad-filterdruk': '0.3' });
        new MetingenModule(maakApp('peuterbad')).werkVolledigheidBij();
        expect(heeftMarker('subtab-peuterbad-meetwaarden')).toBe(false);
        expect(heeftMarker('subtab-peuterbad-verbruik')).toBe(true);
    });

    it('alle peuterbad-velden ingevuld → geen markeringen (ook niet op de pagina-tab)', () => {
        vul(Object.fromEntries(PEUTER_IDS.map(id => [id, '1'])));
        new MetingenModule(maakApp('peuterbad')).werkVolledigheidBij();
        expect(heeftMarker('subtab-peuterbad-meetwaarden')).toBe(false);
        expect(heeftMarker('subtab-peuterbad-verbruik')).toBe(false);
        expect(heeftMarker('tab-peuterbad')).toBe(false);
    });
});
