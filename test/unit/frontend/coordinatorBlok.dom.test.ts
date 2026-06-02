/**
 * @jest-environment jsdom
 *
 * jsdom-test voor OpslaanModule._slaCoordinatorenBlokOp: de coordinator-meting
 * die de bron is voor de gebonden-chloor- en peuterbad-aftap-acties. Borgt dat
 * het payload per bad klopt, met name het peuterbad-specifieke gedrag
 * (bad_gebruikt 1/0, helderheid null) versus de grote baden.
 */
export {};
/* eslint-disable @typescript-eslint/no-var-requires */
const OpslaanModule = require('../../../frontend/js/opslaan.js');

function bouwBlok() {
    document.body.innerHTML = `
        <input id="centraleDatum" value="2026-07-15">
        <div data-blok-tijdstip="10:00:00">
            <table><tbody>
                <tr data-bad="Diep">
                    <td><input class="c-ph" value="7.2"></td>
                    <td><input class="c-chloor-vrij" value="0.8"></td>
                    <td><input class="c-chloor-totaal" value="1.5"></td>
                    <td><input class="c-temp" value="26"></td>
                    <td><select class="c-helder"><option value="Troebel" selected>Troebel</option></select></td>
                </tr>
                <tr data-bad="Peuterbad">
                    <td><input class="c-ph" value="7.0"></td>
                    <td><input class="c-chloor-vrij" value="0.6"></td>
                    <td><input class="c-chloor-totaal" value="2.0"></td>
                    <td><input class="c-temp" value="28"></td>
                    <td><input class="c-gebruikt" type="checkbox" checked></td>
                </tr>
            </tbody></table>
        </div>`;
}

describe('OpslaanModule._slaCoordinatorenBlokOp', () => {
    it('bouwt per bad het juiste payload en post naar /api/coordinatoren', async () => {
        bouwBlok();
        const verzonden: any[] = [];
        const app: any = {
            state: {},
            ui: { setAutoSaveStatus: jest.fn(), toonBericht: jest.fn() },
            api: {
                call: jest.fn(async (_url: string, opts: any) => {
                    verzonden.push(JSON.parse(opts.body));
                    return { ok: true, json: async () => ({}) };
                }),
            },
        };

        const ok = await new OpslaanModule(app)._slaCoordinatorenBlokOp('10:00:00');
        expect(ok).toBe(true);
        expect(app.api.call).toHaveBeenCalledTimes(2);

        const diep = verzonden.find(p => p.bad_naam === 'Diep');
        const peuter = verzonden.find(p => p.bad_naam === 'Peuterbad');

        // Grote baden: helderheid uit de select, bad_gebruikt null
        expect(diep).toMatchObject({
            datum: '2026-07-15', tijdstip: '10:00:00',
            chloor_vrij: 0.8, chloor_totaal: 1.5, watertemperatuur: 26,
            helderheid: 'Troebel', bad_gebruikt: null,
        });

        // Peuterbad: bad_gebruikt 1 (aangevinkt), helderheid null
        // chloor_vrij/totaal voeden de gebonden-chloor-actie (totaal-vrij = 1.4)
        expect(peuter).toMatchObject({
            chloor_vrij: 0.6, chloor_totaal: 2.0,
            helderheid: null, bad_gebruikt: 1,
        });
    });

    it('zet bad_gebruikt op 0 als het peuterbad-vinkje uit staat', async () => {
        bouwBlok();
        (document.querySelector('.c-gebruikt') as HTMLInputElement).checked = false;
        const verzonden: any[] = [];
        const app: any = {
            state: {}, ui: { setAutoSaveStatus: jest.fn(), toonBericht: jest.fn() },
            api: { call: jest.fn(async (_u: string, o: any) => { verzonden.push(JSON.parse(o.body)); return { ok: true, json: async () => ({}) }; }) },
        };
        await new OpslaanModule(app)._slaCoordinatorenBlokOp('10:00:00');
        expect(verzonden.find(p => p.bad_naam === 'Peuterbad').bad_gebruikt).toBe(0);
    });

    it('geeft false terug als het blok niet bestaat', async () => {
        document.body.innerHTML = `<input id="centraleDatum" value="2026-07-15">`;
        const app: any = { state: {}, ui: {}, api: { call: jest.fn() } };
        const ok = await new OpslaanModule(app)._slaCoordinatorenBlokOp('99:99:99');
        expect(ok).toBe(false);
        expect(app.api.call).not.toHaveBeenCalled();
    });
});
