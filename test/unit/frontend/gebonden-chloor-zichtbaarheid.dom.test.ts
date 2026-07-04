/**
 * @jest-environment jsdom
 *
 * De gebonden-chloorvelden op de meetwaarden-pagina's dienen enkel om de bijbehorende
 * filter_spoelen_gebonden-actie te tonen. Zonder zo'n actie worden ze verborgen; met
 * een actie (open óf afgehandeld) verschijnen ze — Diep/Ondiep als één blok, Peuterbad
 * als losse rij. Zie MetingenModule._toonGebondenChloorVelden.
 */
export {};

const MetingenModule = require('../../../frontend/js/metingen.js');

function zetDom() {
    document.body.innerHTML = `
        <div class="meet-gebonden" style="display:none"></div>
        <table><tbody>
            <tr id="peuterbad-gebonden-rij" style="display:none">
                <td><input id="gebonden-chloor-peuterbad"></td>
            </tr>
        </tbody></table>`;
}

const blok = () => document.querySelector('.meet-gebonden') as HTMLElement;
const rij = () => document.getElementById('peuterbad-gebonden-rij') as HTMLElement;
const maak = () => new MetingenModule({});

beforeEach(zetDom);

describe('MetingenModule._toonGebondenChloorVelden', () => {
    it('verbergt beide zonder gebonden-chloor-actie', () => {
        maak()._toonGebondenChloorVelden([{ actie_type: 'filter_spoelen_flow', bad_naam: 'Diep' }]);
        expect(blok().style.display).toBe('none');
        expect(rij().style.display).toBe('none');
    });

    it('toont het Diep/Ondiep-blok bij een actie op Diep óf Ondiep (beide waarden)', () => {
        maak()._toonGebondenChloorVelden([
            { actie_type: 'filter_spoelen_gebonden', bad_naam: 'Ondiep' },
        ]);
        expect(blok().style.display).toBe('');
        expect(rij().style.display).toBe('none');
    });

    it('toont de Peuterbad-rij bij een gebonden-actie op Peuterbad, ook als die is afgehandeld', () => {
        maak()._toonGebondenChloorVelden([
            { actie_type: 'filter_spoelen_gebonden', bad_naam: 'Peuterbad', opgelost: true },
        ]);
        expect(rij().style.display).toBe('');
        expect(blok().style.display).toBe('none');
    });

    it('gaat veilig om met niet-array input (laat verborgen)', () => {
        expect(() => maak()._toonGebondenChloorVelden(null)).not.toThrow();
        expect(blok().style.display).toBe('none');
        expect(rij().style.display).toBe('none');
    });
});
