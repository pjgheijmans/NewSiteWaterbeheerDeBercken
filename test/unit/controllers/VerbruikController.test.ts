import request from 'supertest';
import { VerbruikController } from '../../../backend/controllers/VerbruikController';
import { IVerbruikService } from '../../../backend/services/IVerbruikService';
import { maakTestApp } from '../../helpers/testApp';

const mockService: jest.Mocked<IVerbruikService> = {
    getVerbruik:       jest.fn(),
    getVorigeVerbruik: jest.fn(),
    saveVerbruik:      jest.fn(),
    getVerwarming:     jest.fn(),
    saveVerwarming:    jest.fn(),
};

function maakApp(taak: string | null = 'waterbeheerder') {
    return maakTestApp(new VerbruikController(mockService).router, taak);
}

beforeEach(() => jest.clearAllMocks());

describe('GET /diep-ondiep', () => {
    it('delegeert naar de service', async () => {
        mockService.getVerbruik.mockResolvedValue({ datum: '2026-05-31', water_diep: 1000 });
        const res = await request(maakApp()).get('/diep-ondiep?datum=2026-05-31');
        expect(res.status).toBe(200);
        expect(res.body.water_diep).toBe(1000);
        expect(mockService.getVerbruik).toHaveBeenCalledWith('2026-05-31');
    });

    it('geeft 403 bij verkeerde rol', async () => {
        const res = await request(maakApp('coordinator')).get('/diep-ondiep?datum=2026-05-31');
        expect(res.status).toBe(403);
        expect(mockService.getVerbruik).not.toHaveBeenCalled();
    });

    it('geeft 401 zonder sessie', async () => {
        const res = await request(maakApp(null)).get('/diep-ondiep?datum=2026-05-31');
        expect(res.status).toBe(401);
    });
});

describe('GET /diep-ondiep/vorige', () => {
    it('delegeert naar getVorigeVerbruik', async () => {
        mockService.getVorigeVerbruik.mockResolvedValue({ water_diep: 900 });
        const res = await request(maakApp()).get('/diep-ondiep/vorige?datum=2026-05-31');
        expect(res.status).toBe(200);
        expect(mockService.getVorigeVerbruik).toHaveBeenCalledWith('2026-05-31');
    });
});

describe('POST /diep-ondiep', () => {
    const payload = { datum: '2026-05-31', water_diep: 1000, gas: 50 };

    it('delegeert het opslaan naar de service', async () => {
        mockService.saveVerbruik.mockResolvedValue(undefined);
        const res = await request(maakApp()).post('/diep-ondiep').send(payload);
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(mockService.saveVerbruik).toHaveBeenCalledWith(payload);
    });

    it('geeft 403 bij verkeerde rol', async () => {
        const res = await request(maakApp('Administrator')).post('/diep-ondiep').send(payload);
        expect(res.status).toBe(403);
        expect(mockService.saveVerbruik).not.toHaveBeenCalled();
    });
});

describe('GET /verwarmingssysteem', () => {
    it('delegeert naar de service', async () => {
        mockService.getVerwarming.mockResolvedValue({ datum: '2026-05-31', verwarming_status_1: 1 });
        const res = await request(maakApp()).get('/verwarmingssysteem?datum=2026-05-31');
        expect(res.status).toBe(200);
        expect(res.body.verwarming_status_1).toBe(1);
    });

    it('geeft 500 als de service een fout gooit', async () => {
        mockService.getVerwarming.mockRejectedValue(new Error('Verbinding verbroken'));
        const res = await request(maakApp()).get('/verwarmingssysteem?datum=2026-05-31');
        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Verbinding verbroken');
    });
});

describe('POST /verwarmingssysteem', () => {
    it('delegeert het opslaan naar de service', async () => {
        mockService.saveVerwarming.mockResolvedValue(undefined);
        const payload = { datum: '2026-05-31', verwarming_status_1: true };
        const res = await request(maakApp()).post('/verwarmingssysteem').send(payload);
        expect(res.status).toBe(200);
        expect(mockService.saveVerwarming).toHaveBeenCalledWith(payload);
    });
});
