import request from 'supertest';
import { TrendController } from '../../../backend/controllers/TrendController';
import { ITrendService } from '../../../backend/services/ITrendService';
import { maakTestApp } from '../../helpers/testApp';

const mockService: jest.Mocked<ITrendService> = {
    getMetingenTrend: jest.fn(),
    getVerbruikTrend: jest.fn(),
};

function maakApp(taak: string | null = 'waterbeheerder') {
    return maakTestApp(new TrendController(mockService).router, taak);
}

beforeEach(() => jest.clearAllMocks());

describe('GET /metingen', () => {
    it('delegeert naar de service voor waterbeheerder', async () => {
        mockService.getMetingenTrend.mockResolvedValue([
            {
                datum: '2026-05-01',
                bad_naam: 'Diep',
                ph_waarde: 7.2,
                chloor_waarde: 1.0,
                temperatuur: 28,
                flow: 300,
                filter_druk_in: 0.5,
                filter_druk_uit: 0.3,
                kathodische_bescherming: 1.2,
            },
        ]);
        const res = await request(maakApp()).get('/metingen?van=2026-05-01&tot=2026-05-31');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(mockService.getMetingenTrend).toHaveBeenCalledWith('2026-05-01', '2026-05-31');
    });

    it('geeft 403 voor coordinator', async () => {
        expect(
            (await request(maakApp('coordinator')).get('/metingen?van=2026-05-01&tot=2026-05-31'))
                .status,
        ).toBe(403);
        expect(mockService.getMetingenTrend).not.toHaveBeenCalled();
    });

    it('geeft 403 voor Administrator (trend is voorbehouden aan waterbeheerder)', async () => {
        expect(
            (await request(maakApp('Administrator')).get('/metingen?van=2026-05-01&tot=2026-05-31'))
                .status,
        ).toBe(403);
        expect(mockService.getMetingenTrend).not.toHaveBeenCalled();
    });

    it('geeft 401 zonder sessie', async () => {
        expect(
            (await request(maakApp(null)).get('/metingen?van=2026-05-01&tot=2026-05-31')).status,
        ).toBe(401);
    });

    it('geeft 500 bij een fout', async () => {
        mockService.getMetingenTrend.mockRejectedValue(new Error('DB fout'));
        expect(
            (await request(maakApp()).get('/metingen?van=2026-05-01&tot=2026-05-31')).status,
        ).toBe(500);
    });
});

describe('GET /verbruik', () => {
    it('delegeert naar de service', async () => {
        mockService.getVerbruikTrend.mockResolvedValue({ algemeen: [], peuterbad: [] });
        const res = await request(maakApp()).get('/verbruik?van=2026-05-01&tot=2026-05-31');
        expect(res.status).toBe(200);
        expect(mockService.getVerbruikTrend).toHaveBeenCalledWith('2026-05-01', '2026-05-31');
    });

    it('geeft 403 voor coordinator', async () => {
        expect(
            (await request(maakApp('coordinator')).get('/verbruik?van=2026-05-01&tot=2026-05-31'))
                .status,
        ).toBe(403);
    });
});
