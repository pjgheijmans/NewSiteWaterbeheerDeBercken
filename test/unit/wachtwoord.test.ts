import { hashWachtwoord, verifieerWachtwoord, isGehasht } from '../../backend/wachtwoord';

describe('wachtwoord hashing', () => {
    it('hasht en verifieert een wachtwoord', () => {
        const h = hashWachtwoord('geheim');
        expect(isGehasht(h)).toBe(true);
        expect(h).toMatch(/^scrypt\$/);
        expect(verifieerWachtwoord('geheim', h)).toBe(true);
        expect(verifieerWachtwoord('fout', h)).toBe(false);
    });

    it('gebruikt een willekeurige salt (twee hashes van hetzelfde wachtwoord verschillen)', () => {
        expect(hashWachtwoord('zelfde')).not.toBe(hashWachtwoord('zelfde'));
    });

    it('accepteert legacy plaintext via verifieerWachtwoord', () => {
        expect(isGehasht('Paul')).toBe(false);
        expect(verifieerWachtwoord('Paul', 'Paul')).toBe(true);
        expect(verifieerWachtwoord('fout', 'Paul')).toBe(false);
    });

    it('geeft false bij een lege of ontbrekende opgeslagen waarde', () => {
        expect(verifieerWachtwoord('x', '')).toBe(false);
        expect(verifieerWachtwoord('x', null)).toBe(false);
        expect(verifieerWachtwoord('x', undefined)).toBe(false);
    });

    it('geeft false bij een misvormde hash', () => {
        expect(verifieerWachtwoord('x', 'scrypt$kapot')).toBe(false);
    });
});
