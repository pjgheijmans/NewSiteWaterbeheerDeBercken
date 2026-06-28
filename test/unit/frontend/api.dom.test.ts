/**
 * @jest-environment jsdom
 *
 * Tests voor ApiClient.parseNumberValue — de invoernormalisatie achter o.a.
 * de peuterbad-opslag (lege velden -> null, komma -> punt).
 */
export {};

const ApiClient = require('../../../frontend/js/api.js');

function zetVeld(id: string, value: string) {
    document.body.innerHTML = `<input id="${id}" value="${value}">`;
}

describe('ApiClient.parseNumberValue', () => {
    const api = new ApiClient();

    it('geeft null bij een onbekend veld', () => {
        document.body.innerHTML = '';
        expect(api.parseNumberValue('bestaat-niet')).toBeNull();
    });

    it('geeft null bij een leeg veld (kern van de peuterbad-opslagfix)', () => {
        zetVeld('x', '');
        expect(api.parseNumberValue('x')).toBeNull();
    });

    it('parseert een geheel getal', () => {
        zetVeld('x', '8');
        expect(api.parseNumberValue('x')).toBe(8);
    });

    it('normaliseert komma naar punt', () => {
        zetVeld('x', '7,5');
        expect(api.parseNumberValue('x')).toBe(7.5);
    });

    it('parseert 0 als 0, niet als null', () => {
        zetVeld('x', '0');
        expect(api.parseNumberValue('x')).toBe(0);
    });

    it('geeft null bij niet-numerieke invoer', () => {
        zetVeld('x', 'abc');
        expect(api.parseNumberValue('x')).toBeNull();
    });

    it('parseert negatieve waarden', () => {
        zetVeld('x', '-3,2');
        expect(api.parseNumberValue('x')).toBe(-3.2);
    });
});
