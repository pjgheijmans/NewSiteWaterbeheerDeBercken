/**
 * Pure-functie unittests voor de geëxtraheerde frontend-helpers.
 * Geen DOM nodig: VerbruikModule.berekenVerbruik en
 * OpslaanModule.peuterbadOnvolledig zijn zuivere functies.
 */
export {}; // markeer als module zodat top-level consts niet botsen met andere testbestanden
// eslint-disable-next-line @typescript-eslint/no-var-requires
const VerbruikModule = require('../../../frontend/js/verbruik.js');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const OpslaanModule = require('../../../frontend/js/opslaan.js');

describe('VerbruikModule.berekenVerbruik', () => {
    it('berekent het verschil van twee meterstanden', () => {
        expect(VerbruikModule.berekenVerbruik(130, 100)).toBe('30');
    });

    it('kan negatief verbruik teruggeven (vat geleegd/bijgevuld)', () => {
        expect(VerbruikModule.berekenVerbruik(8, 20)).toBe('-12');
    });

    it('behandelt een ontbrekende vorige stand als 0', () => {
        expect(VerbruikModule.berekenVerbruik(50, null)).toBe('50');
        expect(VerbruikModule.berekenVerbruik(50, '')).toBe('50');
    });

    it('rondt beide standen af voor het verschil', () => {
        expect(VerbruikModule.berekenVerbruik(10.4, 0)).toBe('10');
        expect(VerbruikModule.berekenVerbruik(10.6, 0)).toBe('11');
    });

    it("geeft '-' als de huidige stand ontbreekt of niet-numeriek is", () => {
        expect(VerbruikModule.berekenVerbruik(null, 100)).toBe('-');
        expect(VerbruikModule.berekenVerbruik('', 5)).toBe('-');
        expect(VerbruikModule.berekenVerbruik(undefined, 5)).toBe('-');
    });
});

describe('OpslaanModule.peuterbadOnvolledig', () => {
    it('Verbruik-subtab: volledig als water + beide chemicaliën zijn ingevuld', () => {
        expect(OpslaanModule.peuterbadOnvolledig('verbruik',
            { water: 130, chemicalien_chloor: 8, chemicalien_zwavelzuur: 7 })).toBe(false);
    });

    it('Verbruik-subtab: onvolledig zodra één verbruikveld leeg is', () => {
        expect(OpslaanModule.peuterbadOnvolledig('verbruik',
            { water: null, chemicalien_chloor: 8, chemicalien_zwavelzuur: 7 })).toBe(true);
        expect(OpslaanModule.peuterbadOnvolledig('verbruik',
            { water: 130, chemicalien_chloor: 8, chemicalien_zwavelzuur: null })).toBe(true);
    });

    it('Verbruik-subtab: lege Meetwaarden-velden geven GÉÉN waarschuwing (kern van fix #2)', () => {
        expect(OpslaanModule.peuterbadOnvolledig('verbruik',
            { ph_waarde: null, chloor_waarde: null, water: 130, chemicalien_chloor: 8, chemicalien_zwavelzuur: 7 }))
            .toBe(false);
    });

    it('behandelt 0 als een ingevulde waarde, niet als leeg', () => {
        expect(OpslaanModule.peuterbadOnvolledig('verbruik',
            { water: 0, chemicalien_chloor: 0, chemicalien_zwavelzuur: 0 })).toBe(false);
    });

    it('Meetwaarden-subtab: kijkt naar pH + chloor, niet naar verbruikvelden', () => {
        expect(OpslaanModule.peuterbadOnvolledig('meetwaarden',
            { ph_waarde: 7.2, chloor_waarde: 1.0, water: null })).toBe(false);
        expect(OpslaanModule.peuterbadOnvolledig('meetwaarden',
            { ph_waarde: null, chloor_waarde: 1.0 })).toBe(true);
    });
});
