/**
 * Pure-functie tests voor ActieTekstenModule: het invullen van plaatshouders
 * spiegelt ActieTekstenRepository.render in de backend.
 */
export {};

const ActieTekstenModule = require('../../../frontend/js/actieteksten.js');

const mod = new ActieTekstenModule({}); // vulPlaatshouders gebruikt this.app niet

describe('ActieTekstenModule.vulPlaatshouders', () => {
    it('vult bekende plaatshouders in', () => {
        expect(
            mod.vulPlaatshouders('Flow {bad} onder {drempel} m³/h', {
                bad: 'Diep',
                drempel: '250',
            }),
        ).toBe('Flow Diep onder 250 m³/h');
    });

    it('laat onbekende plaatshouders leeg', () => {
        expect(mod.vulPlaatshouders('Hoi {onbekend}!', {})).toBe('Hoi !');
    });

    it('laat tekst zonder plaatshouders ongewijzigd', () => {
        expect(mod.vulPlaatshouders('Peuterbad leeglaten', {})).toBe('Peuterbad leeglaten');
    });

    it('rendert het voorbeeld met de standaard voorbeeldwaarden', () => {
        const v = ActieTekstenModule.VOORBEELD;
        expect(mod.vulPlaatshouders('Gebonden chloor {bad} {waarde} > {drempel} mg/l', v)).toBe(
            'Gebonden chloor Diep 1.25 > 0.4 mg/l',
        );
    });
});
