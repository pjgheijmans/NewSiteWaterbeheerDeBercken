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

describe('VerbruikModule.verbruikOnvolledig (Diep/Ondiep Verbruik-standen)', () => {
    /** Alle negen in te vullen standen hebben een waarde. */
    const volledig = {
        water_diep: 100,
        water_ondiep: 80,
        water_totaal: 180,
        elektriciteit_nacht: 10,
        elektriciteit_dag: 20,
        gas: 5,
        floculant: '3',
        chemicalien_chloor: '8',
        chemicalien_zwavelzuur: '7',
    };

    it('volledig als alle negen standen zijn ingevuld', () => {
        expect(VerbruikModule.verbruikOnvolledig(volledig)).toBe(false);
    });

    it('0 / "0" telt als een ingevulde waarde, niet als leeg', () => {
        expect(
            VerbruikModule.verbruikOnvolledig({
                ...volledig,
                gas: 0,
                water_diep: 0,
                chemicalien_chloor: '0',
            }),
        ).toBe(false);
    });

    it('onvolledig zodra één stand leeg is', () => {
        for (const veld of Object.keys(volledig)) {
            expect(VerbruikModule.verbruikOnvolledig({ ...volledig, [veld]: null })).toBe(true);
        }
    });
});

describe('OpslaanModule.peuterbadOnvolledig', () => {
    it('Verbruik-subtab: volledig als water + beide chemicaliën zijn ingevuld', () => {
        expect(
            OpslaanModule.peuterbadOnvolledig('verbruik', {
                water: 130,
                chemicalien_chloor: 8,
                chemicalien_zwavelzuur: 7,
            }),
        ).toBe(false);
    });

    it('Verbruik-subtab: onvolledig zodra één verbruikveld leeg is', () => {
        expect(
            OpslaanModule.peuterbadOnvolledig('verbruik', {
                water: null,
                chemicalien_chloor: 8,
                chemicalien_zwavelzuur: 7,
            }),
        ).toBe(true);
        expect(
            OpslaanModule.peuterbadOnvolledig('verbruik', {
                water: 130,
                chemicalien_chloor: 8,
                chemicalien_zwavelzuur: null,
            }),
        ).toBe(true);
    });

    it('Verbruik-subtab: lege Meetwaarden-velden geven GÉÉN waarschuwing (kern van fix #2)', () => {
        expect(
            OpslaanModule.peuterbadOnvolledig('verbruik', {
                ph_waarde: null,
                chloor_waarde: null,
                water: 130,
                chemicalien_chloor: 8,
                chemicalien_zwavelzuur: 7,
            }),
        ).toBe(false);
    });

    it('behandelt 0 als een ingevulde waarde, niet als leeg', () => {
        expect(
            OpslaanModule.peuterbadOnvolledig('verbruik', {
                water: 0,
                chemicalien_chloor: 0,
                chemicalien_zwavelzuur: 0,
            }),
        ).toBe(false);
    });

    it('Meetwaarden-subtab: volledig als pH, chloor, flow én filterdruk zijn ingevuld', () => {
        expect(
            OpslaanModule.peuterbadOnvolledig('meetwaarden', {
                ph_waarde: 7.2,
                chloor_waarde: 1.0,
                flow: 50,
                filter_druk: 0.5,
                water: null,
            }),
        ).toBe(false);
    });

    it('Meetwaarden-subtab: onvolledig zodra flow of filterdruk leeg is (kern van fix)', () => {
        expect(
            OpslaanModule.peuterbadOnvolledig('meetwaarden', {
                ph_waarde: 7.2,
                chloor_waarde: 1.0,
                flow: null,
                filter_druk: 0.5,
            }),
        ).toBe(true);
        expect(
            OpslaanModule.peuterbadOnvolledig('meetwaarden', {
                ph_waarde: 7.2,
                chloor_waarde: 1.0,
                flow: 50,
                filter_druk: null,
            }),
        ).toBe(true);
    });

    it('Meetwaarden-subtab: onvolledig als pH of chloor leeg is', () => {
        expect(
            OpslaanModule.peuterbadOnvolledig('meetwaarden', {
                ph_waarde: null,
                chloor_waarde: 1.0,
                flow: 50,
                filter_druk: 0.5,
            }),
        ).toBe(true);
    });

    it('Meetwaarden-subtab: kijkt niet naar verbruikvelden (water mag leeg zijn)', () => {
        expect(
            OpslaanModule.peuterbadOnvolledig('meetwaarden', {
                ph_waarde: 7.2,
                chloor_waarde: 1.0,
                flow: 50,
                filter_druk: 0.5,
                water: null,
                chemicalien_chloor: null,
                chemicalien_zwavelzuur: null,
            }),
        ).toBe(false);
    });
});

describe('OpslaanModule.meetwaardenOnvolledig (Diep/Ondiep)', () => {
    /** Een volledig ingevuld bad: alle zeven meetvelden hebben een waarde. */
    const volledig = {
        ph_waarde: 7.2,
        chloor_waarde: 1.0,
        temperatuur: 28,
        flow: 200,
        filter_druk_in: 0.5,
        filter_druk_uit: 0.4,
        kathodische_bescherming: 0.8,
    };

    it('volledig als alle zeven meetvelden zijn ingevuld', () => {
        expect(OpslaanModule.meetwaardenOnvolledig(volledig)).toBe(false);
    });

    it('0 telt als een ingevulde waarde, niet als leeg', () => {
        expect(
            OpslaanModule.meetwaardenOnvolledig({
                ...volledig,
                filter_druk_in: 0,
                kathodische_bescherming: 0,
            }),
        ).toBe(false);
    });

    it('onvolledig zodra één meetveld leeg is — niet alleen pH/chloor (kern van fix)', () => {
        // De oorspronkelijke bug: pH + chloor ingevuld, rest leeg → toonde géén waarschuwing.
        expect(
            OpslaanModule.meetwaardenOnvolledig({
                ...volledig,
                ph_waarde: 7.2,
                chloor_waarde: 1.0,
                temperatuur: null,
                flow: null,
                filter_druk_in: null,
                filter_druk_uit: null,
                kathodische_bescherming: null,
            }),
        ).toBe(true);

        for (const veld of [
            'temperatuur',
            'flow',
            'filter_druk_in',
            'filter_druk_uit',
            'kathodische_bescherming',
        ]) {
            expect(OpslaanModule.meetwaardenOnvolledig({ ...volledig, [veld]: null })).toBe(true);
        }
    });
});
