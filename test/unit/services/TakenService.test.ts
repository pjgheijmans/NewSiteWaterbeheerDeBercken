import { TakenService } from '../../../backend/services/TakenService';
import { IRondetakenRepository } from '../../../backend/repositories/IRondetakenRepository';
import { IActiesRepository } from '../../../backend/repositories/IActiesRepository';
import { Rondetaak, RondetaakPrioriteit, TaakPagina, Actie } from '../../../backend/types';

const rondetakenRepo: jest.Mocked<IRondetakenRepository> = {
    getRondetaken: jest.fn(), voltooi: jest.fn(), heropen: jest.fn(),
};
const actiesRepo: jest.Mocked<IActiesRepository> = {
    getActies: jest.fn(), resolve: jest.fn(), unresolve: jest.fn(),
    resolveFilterSpoelen: jest.fn(), unresolveFilterSpoelen: jest.fn(),
    genereer: jest.fn(), genereerVerbruik: jest.fn(),
    genereerBezoekers: jest.fn(), genereerSpoelbeurt: jest.fn(),
    genereerCoordinatoren: jest.fn(), getGebondenChloorMax: jest.fn(),
};

const service = new TakenService(rondetakenRepo, actiesRepo);
const DATUM = '2026-05-31';

function rt(sleutel: string, gebied: string, label: string, prioriteit: RondetaakPrioriteit, pagina: TaakPagina, voltooid = false): Rondetaak {
    return { sleutel, gebied, label, prioriteit, pagina, voltooid, voltooid_op: null, voltooid_door: null };
}
function actie(id: number, bad_naam: string, beschrijving: string, actie_type: string, opgelost = false): Actie {
    return { id, bad_naam, beschrijving, actie_type, opgelost, opgelost_op: null, opgelost_door: null };
}

beforeEach(() => jest.clearAllMocks());

describe('getTaken — samenstelling', () => {
    beforeEach(() => {
        rondetakenRepo.getRondetaken.mockResolvedValue([
            rt('diep_filter',      'Diep',      'Diep filter gereinigd',      'normaal', 'grote-baden'),
            rt('regelaar_diep',    'Diep',      'Regelaar diep gereinigd',    'kritiek', 'grote-baden'),
            rt('diep_haarfilter',  'Diep',      'Diep haarfilter gereinigd',  'normaal', 'grote-baden'),
            rt('peuterbad_filter', 'Peuterbad', 'Peuterbad filter gereinigd', 'normaal', 'peuterbad'),
        ]);
        actiesRepo.getActies.mockResolvedValue([
            actie(1, 'Diep',      'Flow Diep onder 250 m³/h — Filter spoelen',          'filter_spoelen_flow'),
            actie(2, 'Diep',      'Chloorvoorraad onder 200 liter — Chloor bestellen',  'chloor_bestellen'),
            actie(3, 'Peuterbad', 'Peuterbad is vandaag gebruikt — Peuterbad water aftappen', 'peuterbad_aftappen'),
        ]);
    });

    it('vouwt een open filter_spoelen-actie op de filter-rondetaak (alarm + reden)', async () => {
        const items = await service.getTaken(DATUM);
        const diepFilter = items.find(i => i.sleutel === 'diep_filter')!;
        expect(diepFilter.prioriteit).toBe('alarm');
        expect(diepFilter.must).toBe(true);
        expect(diepFilter.reden).toBe('Flow Diep onder 250 m³/h');
        expect(diepFilter.bron).toEqual({ type: 'rondetaak', sleutel: 'diep_filter' });
    });

    it('geeft geen losse rij voor filter_spoelen-acties (alleen samengevouwen)', async () => {
        const items = await service.getTaken(DATUM);
        expect(items.some(i => i.sleutel === 'actie:1')).toBe(false);
    });

    it('markeert kritieke rondetaken als must, normale niet', async () => {
        const items = await service.getTaken(DATUM);
        expect(items.find(i => i.sleutel === 'regelaar_diep')!.must).toBe(true);
        expect(items.find(i => i.sleutel === 'diep_haarfilter')!.must).toBe(false);
    });

    it('laat de filter-rondetaak normaal zonder open alarm', async () => {
        const peuterFilter = (await service.getTaken(DATUM)).find(i => i.sleutel === 'peuterbad_filter')!;
        expect(peuterFilter.prioriteit).toBe('normaal');
        expect(peuterFilter.must).toBe(false);
    });

    it('plaatst chemicaliën-acties in Algemeen op de grote-baden-pagina', async () => {
        const chloor = (await service.getTaken(DATUM)).find(i => i.sleutel === 'actie:2')!;
        expect(chloor.gebied).toBe('Algemeen');
        expect(chloor.pagina).toBe('grote-baden');
        expect(chloor.label).toBe('Chloor bestellen');
        expect(chloor.reden).toBe('Chloorvoorraad onder 200 liter');
        expect(chloor.must).toBe(true);
        expect(chloor.bron).toEqual({ type: 'actie', ids: [2] });
    });

    it('plaatst peuterbad-acties op de peuterbad-pagina', async () => {
        const aftappen = (await service.getTaken(DATUM)).find(i => i.sleutel === 'actie:3')!;
        expect(aftappen.pagina).toBe('peuterbad');
        expect(aftappen.gebied).toBe('Peuterbad');
        expect(aftappen.must).toBe(true);
    });
});

describe('getTaken — opgeloste acties', () => {
    it('toont een opgeloste actie als voltooid (valt zo uit het overzicht)', async () => {
        rondetakenRepo.getRondetaken.mockResolvedValue([]);
        actiesRepo.getActies.mockResolvedValue([
            actie(9, 'Diep', 'Chloorvoorraad onder 200 liter — Chloor bestellen', 'chloor_bestellen', true),
        ]);
        const chloor = (await service.getTaken(DATUM)).find(i => i.sleutel === 'actie:9')!;
        expect(chloor.voltooid).toBe(true);
        expect(chloor.must && !chloor.voltooid).toBe(false);
    });
});
