/**
 * Frontend-unittest voor de groeperingslogica van MetingenModule.
 * Borgt het gedrag "één Filter spoelen-actie per bad met meerdere redenen":
 * alle filter_spoelen_* redenen van eenzelfde bad vallen samen tot één groep,
 * terwijl andere actietypes en andere baden gescheiden blijven.
 */

// metingen.js is plain frontend-JS (geen DOM op top-level); de module.exports-
// guard onderaan het bestand maakt de klasse importeerbaar in Node/Jest.
// eslint-disable-next-line @typescript-eslint/no-var-requires
export {}; // markeer als module zodat top-level consts niet botsen met andere testbestanden
const MetingenModule = require('../../../frontend/js/metingen.js');

interface Actie { id: number; bad_naam: string; actie_type: string; opgelost: boolean; }
const groepeer = (acties: Actie[] | undefined): any[] => MetingenModule.groepeerActies(acties);

describe('MetingenModule.groepeerActies', () => {
    it('voegt alle filter_spoelen_* redenen van één bad samen tot precies één groep', () => {
        const acties: Actie[] = [
            { id: 1, bad_naam: 'Diep', actie_type: 'filter_spoelen_druk',       opgelost: false },
            { id: 2, bad_naam: 'Diep', actie_type: 'filter_spoelen_flow',       opgelost: false },
            { id: 3, bad_naam: 'Diep', actie_type: 'filter_spoelen_bezoekers',  opgelost: false },
            { id: 4, bad_naam: 'Diep', actie_type: 'filter_spoelen_spoelbeurt', opgelost: false },
            { id: 5, bad_naam: 'Diep', actie_type: 'filter_spoelen_gebonden',   opgelost: false },
        ];
        const groepen = groepeer(acties);
        expect(groepen).toHaveLength(1);
        expect(groepen[0].bad_naam).toBe('Diep');
        expect(groepen[0].sleutel).toBe('Diep|filter_spoelen');
        // Alle redenen zitten in dezelfde groep
        expect(groepen[0].items.map((a: Actie) => a.id)).toEqual([1, 2, 3, 4, 5]);
    });

    it('houdt de baden gescheiden: één filter-groep per bad', () => {
        const acties: Actie[] = [
            { id: 1, bad_naam: 'Diep',      actie_type: 'filter_spoelen_druk',     opgelost: false },
            { id: 2, bad_naam: 'Diep',      actie_type: 'filter_spoelen_flow',     opgelost: false },
            { id: 3, bad_naam: 'Ondiep',    actie_type: 'filter_spoelen_flow',     opgelost: false },
            { id: 4, bad_naam: 'Peuterbad', actie_type: 'filter_spoelen_gebonden', opgelost: false },
        ];
        const groepen = groepeer(acties);
        expect(groepen).toHaveLength(3);
        expect(new Set(groepen.map(g => g.bad_naam))).toEqual(new Set(['Diep', 'Ondiep', 'Peuterbad']));
        expect(groepen.find(g => g.bad_naam === 'Diep').items.map((a: Actie) => a.id)).toEqual([1, 2]);
        expect(groepen.find(g => g.bad_naam === 'Ondiep').items).toHaveLength(1);
        expect(groepen.find(g => g.bad_naam === 'Peuterbad').items).toHaveLength(1);
    });

    it('groepeert niet-filter-acties apart, ook binnen hetzelfde bad', () => {
        const acties: Actie[] = [
            { id: 1, bad_naam: 'Peuterbad', actie_type: 'filter_spoelen_flow',          opgelost: false },
            { id: 2, bad_naam: 'Peuterbad', actie_type: 'filter_spoelen_gebonden',      opgelost: false },
            { id: 3, bad_naam: 'Peuterbad', actie_type: 'peuterbad_aftappen',           opgelost: false },
            { id: 4, bad_naam: 'Peuterbad', actie_type: 'chloor_peuterbad_bijvullen',   opgelost: false },
        ];
        const groepen = groepeer(acties);
        // filter_spoelen_* → 1 groep; aftappen → eigen groep; chloor bijvullen → eigen groep
        expect(groepen).toHaveLength(3);
        expect(groepen.find(g => g.sleutel === 'Peuterbad|filter_spoelen').items.map((a: Actie) => a.id)).toEqual([1, 2]);
        expect(groepen.find(g => g.sleutel === 'Peuterbad|peuterbad_aftappen').items).toHaveLength(1);
        expect(groepen.find(g => g.sleutel === 'Peuterbad|chloor_peuterbad_bijvullen').items).toHaveLength(1);
    });

    it('verzamelt alle ids van de groep (open én opgelost) zodat één checkbox de hele groep afhandelt', () => {
        const acties: Actie[] = [
            { id: 11, bad_naam: 'Ondiep', actie_type: 'filter_spoelen_druk', opgelost: false },
            { id: 22, bad_naam: 'Ondiep', actie_type: 'filter_spoelen_flow', opgelost: true  },
        ];
        const groepen = groepeer(acties);
        expect(groepen).toHaveLength(1);
        expect(groepen[0].items.map((a: Actie) => a.id)).toEqual([11, 22]);
    });

    it('geeft een lege array terug bij lege of ongeldige invoer', () => {
        expect(groepeer([])).toEqual([]);
        expect(groepeer(undefined)).toEqual([]);
    });
});
