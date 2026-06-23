import { RondetakenService } from '../../../backend/services/RondetakenService';
import { IRondetakenRepository } from '../../../backend/repositories/IRondetakenRepository';
import { IActiesRepository } from '../../../backend/repositories/IActiesRepository';
import { Gebruiker } from '../../../backend/types';

const repo: jest.Mocked<IRondetakenRepository> = {
    getRondetaken: jest.fn(),
    voltooi: jest.fn(),
    heropen: jest.fn(),
};
const actiesRepo: jest.Mocked<IActiesRepository> = {
    getActies: jest.fn(),
    resolve: jest.fn(),
    unresolve: jest.fn(),
    resolveFilterSpoelen: jest.fn(),
    unresolveFilterSpoelen: jest.fn(),
    genereer: jest.fn(),
    genereerVerbruik: jest.fn(),
    genereerBezoekers: jest.fn(),
    genereerSpoelbeurt: jest.fn(),
    genereerCoordinatoren: jest.fn(),
    getGebondenChloorMax: jest.fn(),
};

const service = new RondetakenService(repo, actiesRepo);
const DATUM = '2026-05-31';
const gebruiker: Gebruiker = {
    id: 1,
    gebruikersnaam: 'tu',
    taak: 'waterbeheerder',
    voornaam: 'Test',
    achternaam: 'User',
    inlognaam: 'tu',
};

beforeEach(() => jest.clearAllMocks());

describe('voltooi', () => {
    it('vinkt af én resolved de filter_spoelen-acties bij een filter-rondetaak', async () => {
        await service.voltooi('diep_filter', DATUM, gebruiker);
        expect(repo.voltooi).toHaveBeenCalledWith('diep_filter', DATUM, 'Test User');
        expect(actiesRepo.resolveFilterSpoelen).toHaveBeenCalledWith('Diep', DATUM, 'Test User');
    });

    it('raakt de acties niet bij een niet-filter-rondetaak', async () => {
        await service.voltooi('regelaar_diep', DATUM, gebruiker);
        expect(repo.voltooi).toHaveBeenCalledWith('regelaar_diep', DATUM, 'Test User');
        expect(actiesRepo.resolveFilterSpoelen).not.toHaveBeenCalled();
    });
});

describe('heropen', () => {
    it('heropent de filter_spoelen-acties bij een filter-rondetaak (Peuterbad)', async () => {
        await service.heropen('peuterbad_filter', DATUM);
        expect(repo.heropen).toHaveBeenCalledWith('peuterbad_filter', DATUM);
        expect(actiesRepo.unresolveFilterSpoelen).toHaveBeenCalledWith('Peuterbad', DATUM);
    });

    it('raakt de acties niet bij een niet-filter-rondetaak', async () => {
        await service.heropen('douches_test', DATUM);
        expect(actiesRepo.unresolveFilterSpoelen).not.toHaveBeenCalled();
    });
});
