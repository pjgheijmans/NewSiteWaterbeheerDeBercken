/**
 * Pure-functie tests voor LimietenModule: datumconversies, normalisatie
 * (achterwaartse compatibiliteit van hernoemde parameters) en een
 * consistentie-invariant tussen GROEPEN en LABELS.
 */
export {};
/* eslint-disable @typescript-eslint/no-var-requires */
const LimietenModule = require('../../../frontend/js/limieten.js');

const mod = new LimietenModule({}); // _-helpers gebruiken this.app niet

describe('LimietenModule datumconversies', () => {
    it('_yyyymmddNaarIso zet een YYYYMMDD-getal om naar ISO', () => {
        expect(mod._yyyymmddNaarIso(20260715)).toBe('2026-07-15');
    });

    it('_yyyymmddNaarIso geeft leeg terug bij 0/leeg', () => {
        expect(mod._yyyymmddNaarIso(0)).toBe('');
    });

    it('_isoNaarYyyymmdd zet ISO om naar een YYYYMMDD-getal', () => {
        expect(mod._isoNaarYyyymmdd('2026-07-15')).toBe(20260715);
    });

    it('_isoNaarYyyymmdd geeft 0 terug bij lege invoer', () => {
        expect(mod._isoNaarYyyymmdd('')).toBe(0);
    });

    it('conversies zijn elkaars inverse', () => {
        expect(mod._yyyymmddNaarIso(mod._isoNaarYyyymmdd('2026-04-25'))).toBe('2026-04-25');
    });
});

describe('LimietenModule._normaliseer', () => {
    it('mapt hernoemde parameters naar hun nieuwe namen en verwijdert de oude', () => {
        const g = mod._normaliseer({
            temperatuur: { min: 20, max: 30 },
            flow: { min: 3, max: 4 },
            filter_druk: { min: 0.2, max: 1.5 },
        });
        expect(g.watertemperatuur).toEqual({ min: 20, max: 30 });
        expect(g.flow_diep).toEqual({ min: 3, max: 4 });
        expect(g.flow_ondiep).toEqual({ min: 3, max: 4 });
        expect(g.flow_peuterbad).toEqual({ min: 3, max: 4 });
        expect(g.filter_druk_in).toEqual({ min: 0.2, max: 1.5 });
        expect(g.filter_druk_peuterbad).toEqual({ min: 0.2, max: 1.5 });
        // Oude sleutels zijn opgeruimd
        expect(g.temperatuur).toBeUndefined();
        expect(g.flow).toBeUndefined();
        expect(g.filter_druk).toBeUndefined();
    });

    it('overschrijft bestaande specifieke waarden niet', () => {
        const g = mod._normaliseer({
            flow: { min: 3, max: 4 },
            flow_diep: { min: 9, max: 9 },
        });
        expect(g.flow_diep).toEqual({ min: 9, max: 9 }); // blijft staan
        expect(g.flow_ondiep).toEqual({ min: 3, max: 4 }); // afgeleid van flow
    });
});

describe('LimietenModule GROEPEN/LABELS consistentie', () => {
    it('elke parameter in een groep heeft een label', () => {
        const labels = LimietenModule.LABELS;
        const ontbrekend: string[] = [];
        LimietenModule.GROEPEN.forEach((groep: any) => {
            groep.params.forEach((p: string) => {
                if (!labels[p]) ontbrekend.push(p);
            });
        });
        expect(ontbrekend).toEqual([]);
    });

    it('bevat de nieuwe actie-drempels', () => {
        const alleParams = LimietenModule.GROEPEN.flatMap((g: any) => g.params);
        expect(alleParams).toEqual(
            expect.arrayContaining([
                'actie_gebonden_chloor_max',
                'actie_chloor_peuterbad_min',
                'actie_zwavelzuur_peuterbad_min',
            ]),
        );
    });
});
