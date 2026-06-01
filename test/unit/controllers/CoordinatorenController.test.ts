import request from 'supertest';
import { CoordinatorenController } from '../../../backend/controllers/CoordinatorenController';
import { ICoordinatorenService } from '../../../backend/services/ICoordinatorenService';
import { AppError } from '../../../backend/errors';
import { maakTestApp } from '../../helpers/testApp';

const mockService: jest.Mocked<ICoordinatorenService> = {
    getCoordinatoren: jest.fn(),
    saveMeting:       jest.fn(),
    getChecklist:     jest.fn(),
    saveChecklist:    jest.fn(),
    getDaggegevens:   jest.fn(),
    saveDaggegevens:  jest.fn(),
    deleteBlok:       jest.fn(),
    getLogboek:       jest.fn(),
    saveLogboek:      jest.fn(),
    deleteLogboek:    jest.fn(),
};

function maakApp(taak: string | null = 'coordinator') {
    return maakTestApp(new CoordinatorenController(mockService).router, taak);
}

const DATUM = '2026-05-31';
beforeEach(() => jest.clearAllMocks());

describe('GET /', () => {
    it('delegeert naar de service (coordinator)', async () => {
        mockService.getCoordinatoren.mockResolvedValue([]);
        const res = await request(maakApp('coordinator')).get(`/?datum=${DATUM}`);
        expect(res.status).toBe(200);
        expect(mockService.getCoordinatoren).toHaveBeenCalledWith(DATUM);
    });

    it('staat ook waterbeheerder toe', async () => {
        mockService.getCoordinatoren.mockResolvedValue([]);
        expect((await request(maakApp('waterbeheerder')).get(`/?datum=${DATUM}`)).status).toBe(200);
    });

    it('geeft 403 voor Administrator', async () => {
        const res = await request(maakApp('Administrator')).get(`/?datum=${DATUM}`);
        expect(res.status).toBe(403);
        expect(mockService.getCoordinatoren).not.toHaveBeenCalled();
    });

    it('geeft 401 zonder sessie', async () => {
        expect((await request(maakApp(null)).get(`/?datum=${DATUM}`)).status).toBe(401);
    });
});

describe('POST /', () => {
    const payload = { datum: DATUM, bad_naam: 'Diep', tijdstip: '10:00:00', ph_waarde: 7.2 };

    it('geeft body en ingelogde gebruiker door aan de service', async () => {
        mockService.saveMeting.mockResolvedValue(undefined);
        const res = await request(maakApp()).post('/').send(payload);
        expect(res.status).toBe(200);
        expect(mockService.saveMeting).toHaveBeenCalledWith(
            expect.objectContaining({ bad_naam: 'Diep' }),
            expect.objectContaining({ taak: 'coordinator' }));
    });

    it('propageert AppError 400 als het bad niet bestaat', async () => {
        mockService.saveMeting.mockRejectedValue(new AppError('Bad niet gevonden', 400));
        const res = await request(maakApp()).post('/').send(payload);
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Bad niet gevonden');
    });
});

describe('checklist', () => {
    it('GET delegeert naar de service', async () => {
        mockService.getChecklist.mockResolvedValue({ proef_waterspeel: 1, proef_spraypark: 0, proef_douches: 1, proef_glijbaan: 0 });
        const res = await request(maakApp()).get(`/checklist?datum=${DATUM}`);
        expect(res.status).toBe(200);
        expect(res.body.proef_waterspeel).toBe(1);
    });

    it('POST geeft datum en body door', async () => {
        mockService.saveChecklist.mockResolvedValue(undefined);
        const body = { datum: DATUM, proef_waterspeel: 1, proef_spraypark: 0, proef_douches: 1, proef_glijbaan: 0 };
        const res = await request(maakApp()).post('/checklist').send(body);
        expect(res.status).toBe(200);
        expect(mockService.saveChecklist).toHaveBeenCalledWith(DATUM, body);
    });
});

describe('daggegevens', () => {
    it('GET delegeert naar de service', async () => {
        mockService.getDaggegevens.mockResolvedValue({ bezoekers_vandaag: 80, lucht_temperatuur: 22 });
        const res = await request(maakApp()).get(`/daggegevens?datum=${DATUM}`);
        expect(res.status).toBe(200);
        expect(res.body.bezoekers_vandaag).toBe(80);
    });

    it('POST geeft datum en body door aan de service', async () => {
        mockService.saveDaggegevens.mockResolvedValue(undefined);
        const body = { datum: DATUM, bezoekers_vandaag: 80, lucht_temperatuur: 22 };
        const res = await request(maakApp()).post('/daggegevens').send(body);
        expect(res.status).toBe(200);
        expect(mockService.saveDaggegevens).toHaveBeenCalledWith(DATUM, body);
    });
});

describe('DELETE /', () => {
    it('verwijdert een blok bij geldige parameters', async () => {
        mockService.deleteBlok.mockResolvedValue(undefined);
        const res = await request(maakApp()).delete(`/?datum=${DATUM}&tijdstip=10%3A00%3A00`);
        expect(res.status).toBe(200);
        expect(mockService.deleteBlok).toHaveBeenCalledWith(DATUM, '10:00:00');
    });

    it('geeft 400 als datum of tijdstip ontbreekt', async () => {
        const res = await request(maakApp()).delete(`/?datum=${DATUM}`);
        expect(res.status).toBe(400);
        expect(mockService.deleteBlok).not.toHaveBeenCalled();
    });
});

describe('logboek', () => {
    it('GET delegeert naar de service', async () => {
        mockService.getLogboek.mockResolvedValue([{ id: 1, tijdstip: '10:00:00', auteur: 'X', tekst: 'T' }]);
        const res = await request(maakApp()).get(`/logboek?datum=${DATUM}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
    });

    it('POST geeft het service-resultaat (id + auteur) terug', async () => {
        mockService.saveLogboek.mockResolvedValue({ id: 5, auteur: 'Test User' });
        const res = await request(maakApp()).post('/logboek').send({ datum: DATUM, tijdstip: '10:00:00', tekst: 'Tekst' });
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ status: 'success', id: 5, auteur: 'Test User' });
        expect(mockService.saveLogboek).toHaveBeenCalledWith(DATUM, '10:00:00', 'Tekst',
            expect.objectContaining({ taak: 'coordinator' }));
    });

    it('behandelt ontbrekende tekst als lege string', async () => {
        mockService.saveLogboek.mockResolvedValue({ id: 1, auteur: 'Test User' });
        await request(maakApp()).post('/logboek').send({ datum: DATUM, tijdstip: '10:00:00' });
        expect(mockService.saveLogboek).toHaveBeenCalledWith(DATUM, '10:00:00', '', expect.anything());
    });

    it('DELETE /:id verwijdert op id', async () => {
        mockService.deleteLogboek.mockResolvedValue(undefined);
        const res = await request(maakApp()).delete('/logboek/3');
        expect(res.status).toBe(200);
        expect(mockService.deleteLogboek).toHaveBeenCalledWith('3');
    });
});
