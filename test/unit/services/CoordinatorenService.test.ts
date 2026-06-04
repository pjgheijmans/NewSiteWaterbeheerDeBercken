import { CoordinatorenService } from '../../../backend/services/CoordinatorenService';
import { ICoordinatorenRepository } from '../../../backend/repositories/ICoordinatorenRepository';
import { ICoordinatorenLogboekRepository } from '../../../backend/repositories/ICoordinatorenLogboekRepository';
import { IActiesRepository } from '../../../backend/repositories/IActiesRepository';
import { Gebruiker } from '../../../backend/types';

const coordRepo: jest.Mocked<ICoordinatorenRepository> = {
    getCoordinatoren: jest.fn(), getBadId: jest.fn(), saveMeting: jest.fn(),
    deleteBlok: jest.fn(), getChecklist: jest.fn(), saveChecklist: jest.fn(),
    getDaggegevens: jest.fn(), saveDaggegevens: jest.fn(),
};
const logboekRepo: jest.Mocked<ICoordinatorenLogboekRepository> = {
    getByDatum: jest.fn(), save: jest.fn(), deleteById: jest.fn(),
};
const actiesRepo: jest.Mocked<IActiesRepository> = {
    getActies: jest.fn(), resolve: jest.fn(), unresolve: jest.fn(),
    genereer: jest.fn(), genereerVerbruik: jest.fn(),
    genereerBezoekers: jest.fn(), genereerSpoelbeurt: jest.fn(),
    genereerCoordinatoren: jest.fn(), getGebondenChloorMax: jest.fn(),
};

const service = new CoordinatorenService(coordRepo, logboekRepo, actiesRepo);
const DATUM = '2026-05-31';
const gebruiker: Gebruiker = { id: 1, gebruikersnaam: 'tu', taak: 'coordinator', voornaam: 'Co', achternaam: 'Ord', inlognaam: 'co' };

beforeEach(() => jest.clearAllMocks());

describe('saveMeting', () => {
    it('zoekt bad_id op en slaat op met berekende auteur', async () => {
        coordRepo.getBadId.mockResolvedValue(1);
        await service.saveMeting({ datum: DATUM, bad_naam: 'Diep' }, gebruiker);
        expect(coordRepo.getBadId).toHaveBeenCalledWith('Diep');
        expect(coordRepo.saveMeting).toHaveBeenCalledWith(1, expect.objectContaining({ bad_naam: 'Diep' }), 'Co Ord');
    });

    it('triggert fire-and-forget coordinator-actiegeneratie', async () => {
        coordRepo.getBadId.mockResolvedValue(1);
        await service.saveMeting({ datum: DATUM, bad_naam: 'Peuterbad' }, gebruiker);
        expect(actiesRepo.genereerCoordinatoren).toHaveBeenCalledWith(DATUM);
    });
});

describe('deleteBlok', () => {
    it('verwijdert het blok en leidt de coordinator-acties opnieuw af', async () => {
        await service.deleteBlok(DATUM, '10:00:00');
        expect(coordRepo.deleteBlok).toHaveBeenCalledWith(DATUM, '10:00:00');
        expect(actiesRepo.genereerCoordinatoren).toHaveBeenCalledWith(DATUM);
    });
});

describe('saveDaggegevens', () => {
    it('slaat op en triggert fire-and-forget actiegeneratie', async () => {
        const body = { bezoekers_vandaag: 80, lucht_temperatuur: 22 };
        await service.saveDaggegevens(DATUM, body);
        expect(coordRepo.saveDaggegevens).toHaveBeenCalledWith(DATUM, body);
        expect(actiesRepo.genereerBezoekers).toHaveBeenCalledWith(DATUM, 80);
        expect(actiesRepo.genereerSpoelbeurt).toHaveBeenCalledWith(DATUM);
    });

    it('geeft null door als de dagtelling ontbreekt', async () => {
        await service.saveDaggegevens(DATUM, {});
        expect(actiesRepo.genereerBezoekers).toHaveBeenCalledWith(DATUM, null);
    });
});

describe('saveLogboek', () => {
    it('berekent auteur en geeft id + auteur uit de repo-rij terug', async () => {
        logboekRepo.save.mockResolvedValue({ id: 5, auteur: 'Co Ord' });
        const result = await service.saveLogboek(DATUM, '10:00:00', 'Tekst', gebruiker);
        expect(result).toEqual({ id: 5, auteur: 'Co Ord' });
        expect(logboekRepo.save).toHaveBeenCalledWith(DATUM, '10:00:00', 'Tekst', 'Co Ord');
    });

    it('valt terug op de berekende auteur en id null als de repo niets teruggeeft', async () => {
        logboekRepo.save.mockResolvedValue(null);
        const result = await service.saveLogboek(DATUM, '10:00:00', '', gebruiker);
        expect(result).toEqual({ id: null, auteur: 'Co Ord' });
    });
});

describe('pass-through methoden', () => {
    it('delegeren naar de juiste repositories', async () => {
        coordRepo.getCoordinatoren.mockResolvedValue([]);
        coordRepo.getChecklist.mockResolvedValue({ proef_waterspeel: 0, proef_spraypark: 0, proef_douches: 0, proef_glijbaan: 0 });
        coordRepo.getDaggegevens.mockResolvedValue({});
        logboekRepo.getByDatum.mockResolvedValue([]);

        await service.getCoordinatoren(DATUM);
        await service.saveChecklist(DATUM, { proef_waterspeel: true });
        await service.getChecklist(DATUM);
        await service.getDaggegevens(DATUM);
        await service.deleteBlok(DATUM, '10:00:00');
        await service.getLogboek(DATUM);
        await service.deleteLogboek('3');

        expect(coordRepo.getCoordinatoren).toHaveBeenCalledWith(DATUM);
        expect(coordRepo.saveChecklist).toHaveBeenCalledWith(DATUM, { proef_waterspeel: true });
        expect(coordRepo.deleteBlok).toHaveBeenCalledWith(DATUM, '10:00:00');
        expect(logboekRepo.getByDatum).toHaveBeenCalledWith(DATUM);
        expect(logboekRepo.deleteById).toHaveBeenCalledWith('3');
    });
});
