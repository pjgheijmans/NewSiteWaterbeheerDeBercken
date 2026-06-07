/**
 * Pure-functie tests voor TakenModule: de categorie-indeling
 * (Verplicht/Belangrijk/Overig) bepaalt de achtergrondtint van een rij.
 */
export {};
/* eslint-disable @typescript-eslint/no-var-requires */
const TakenModule = require('../../../frontend/js/taken.js');

describe('TakenModule._categorieTint', () => {
    it('geeft een rode tint voor verplicht', () => {
        expect(TakenModule._categorieTint('verplicht')).toBe('#fff5f5');
    });

    it('geeft een amber tint voor belangrijk', () => {
        expect(TakenModule._categorieTint('belangrijk')).toBe('#fff9e6');
    });

    it('geeft geen tint voor overig', () => {
        expect(TakenModule._categorieTint('overig')).toBe('');
    });
});
