import { MetingenService } from '../../../backend/services/MetingenService';
import { IMetingenRepository } from '../../../backend/repositories/IMetingenRepository';
import { IActiesRepository } from '../../../backend/repositories/IActiesRepository';
import { IDaggegevensProvider } from '../../../backend/repositories/IDaggegevensProvider';
import { Gebruiker } from '../../../backend/types';

const metingenRepo: jest.Mocked<IMetingenRepository> = {
    getMetingen: jest.fn(),
    getBadId: jest.fn(),
    savePeuterbadMeting: jest.fn(),
    saveGrootBadMeting: jest.fn(),
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
const daggegevensProvider: jest.Mocked<IDaggegevensProvider> = { getDaggegevens: jest.fn() };

const service = new MetingenService(metingenRepo, actiesRepo, daggegevensProvider);
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

const META = { versie: 1, auteur: 'Test User', bijgewerkt_op: null };

describe('saveMeting — keuze bad-tabel', () => {
    it('gebruikt savePeuterbadMeting voor het Peuterbad (met auteur + verwachte versie)', async () => {
        metingenRepo.getBadId.mockResolvedValue(3);
        metingenRepo.savePeuterbadMeting.mockResolvedValue(META);
        await service.saveMeting(
            { datum: DATUM, bad_naam: 'Peuterbad', ph_waarde: 7.0, versie: 2 },
            'Test User',
        );
        expect(metingenRepo.savePeuterbadMeting).toHaveBeenCalledWith(
            3,
            expect.objectContaining({ bad_naam: 'Peuterbad' }),
            'Test User',
            2,
        );
        expect(metingenRepo.saveGrootBadMeting).not.toHaveBeenCalled();
    });

    it('gebruikt saveGrootBadMeting voor Diep/Ondiep (verwachte versie null als die ontbreekt)', async () => {
        metingenRepo.getBadId.mockResolvedValue(1);
        metingenRepo.saveGrootBadMeting.mockResolvedValue(META);
        await service.saveMeting({ datum: DATUM, bad_naam: 'Diep' }, 'Test User');
        expect(metingenRepo.saveGrootBadMeting).toHaveBeenCalledWith(
            1,
            expect.objectContaining({ bad_naam: 'Diep' }),
            'Test User',
            null,
        );
        expect(metingenRepo.savePeuterbadMeting).not.toHaveBeenCalled();
    });

    it('geeft de meta terug en genereert daarna acties', async () => {
        metingenRepo.getBadId.mockResolvedValue(1);
        metingenRepo.saveGrootBadMeting.mockResolvedValue({
            versie: 5,
            auteur: 'Test User',
            bijgewerkt_op: '2026-05-31T10:00:00',
        });
        const meta = await service.saveMeting({ datum: DATUM, bad_naam: 'Diep' }, 'Test User');
        expect(meta).toEqual({
            versie: 5,
            auteur: 'Test User',
            bijgewerkt_op: '2026-05-31T10:00:00',
        });
        expect(actiesRepo.genereer).toHaveBeenCalledWith(
            1,
            DATUM,
            'Diep',
            expect.objectContaining({ bad_naam: 'Diep' }),
        );
    });

    it('genereert geen acties bij een opslag-conflict (409)', async () => {
        metingenRepo.getBadId.mockResolvedValue(1);
        metingenRepo.saveGrootBadMeting.mockRejectedValue(new Error('conflict'));
        await expect(
            service.saveMeting({ datum: DATUM, bad_naam: 'Diep' }, 'Test User'),
        ).rejects.toThrow('conflict');
        expect(actiesRepo.genereer).not.toHaveBeenCalled();
    });

    it('propageert een fout van getBadId zonder op te slaan', async () => {
        metingenRepo.getBadId.mockRejectedValue(new Error('Bad niet gevonden'));
        await expect(
            service.saveMeting({ datum: DATUM, bad_naam: 'X' }, 'Test User'),
        ).rejects.toThrow('Bad niet gevonden');
        expect(metingenRepo.saveGrootBadMeting).not.toHaveBeenCalled();
        expect(actiesRepo.genereer).not.toHaveBeenCalled();
    });
});

describe('resolveActie', () => {
    it('berekent de auteursnaam uit de gebruiker', async () => {
        await service.resolveActie('42', gebruiker);
        expect(actiesRepo.resolve).toHaveBeenCalledWith('42', 'Test User');
    });

    it('valt terug op inlognaam als voor-/achternaam ontbreken', async () => {
        await service.resolveActie('42', {
            id: 1,
            gebruikersnaam: 'gn',
            taak: 'waterbeheerder',
            inlognaam: 'inlog',
        });
        expect(actiesRepo.resolve).toHaveBeenCalledWith('42', 'inlog');
    });
});

describe('getBezoekers', () => {
    it('stelt het resultaat samen uit daggegevens en spoelbeurt-totalen', async () => {
        daggegevensProvider.getDaggegevens.mockResolvedValue({ bezoekers_vandaag: 120 });
        actiesRepo.genereerSpoelbeurt.mockResolvedValue({ diep: 800, ondiep: 600 });
        const result = await service.getBezoekers(DATUM);
        expect(result).toEqual({
            bezoekers_vandaag: 120,
            bezoekers_totaal_diep: 800,
            bezoekers_totaal_ondiep: 600,
        });
        expect(actiesRepo.genereerBezoekers).toHaveBeenCalledWith(DATUM, 120);
        expect(actiesRepo.genereerSpoelbeurt).toHaveBeenCalledWith(DATUM);
    });

    it('gebruikt null als er geen dagtelling is', async () => {
        daggegevensProvider.getDaggegevens.mockResolvedValue({});
        actiesRepo.genereerSpoelbeurt.mockResolvedValue({ diep: 0, ondiep: 0 });
        const result = await service.getBezoekers(DATUM);
        expect(result.bezoekers_vandaag).toBeNull();
        expect(actiesRepo.genereerBezoekers).toHaveBeenCalledWith(DATUM, null);
    });
});

describe('getGebondenChloor', () => {
    it('herleidt de coordinator-acties en geeft het dagmaximum per bad terug', async () => {
        actiesRepo.getGebondenChloorMax.mockResolvedValue({
            diep: 0.85,
            ondiep: 0.4,
            peuterbad: null,
        });
        const result = await service.getGebondenChloor(DATUM);
        expect(result).toEqual({ diep: 0.85, ondiep: 0.4, peuterbad: null });
        expect(actiesRepo.genereerCoordinatoren).toHaveBeenCalledWith(DATUM);
        expect(actiesRepo.getGebondenChloorMax).toHaveBeenCalledWith(DATUM);
    });
});

describe('pass-through methoden', () => {
    it('getMetingen delegeert naar de repository', async () => {
        metingenRepo.getMetingen.mockResolvedValue([]);
        await service.getMetingen(DATUM);
        expect(metingenRepo.getMetingen).toHaveBeenCalledWith(DATUM);
    });

    it('getActies en unresolveActie delegeren', async () => {
        actiesRepo.getActies.mockResolvedValue([]);
        await service.getActies(DATUM);
        await service.unresolveActie('7');
        expect(actiesRepo.getActies).toHaveBeenCalledWith(DATUM);
        expect(actiesRepo.unresolve).toHaveBeenCalledWith('7');
    });
});
