import request from 'supertest';
import { TrendController } from '../../../backend/controllers/TrendController';
import { ITrendRepository } from '../../../backend/repositories/ITrendRepository';
import { maakTestApp } from '../../helpers/testApp';

const mockRepo: jest.Mocked<ITrendRepository> = {
    getMetingenTrend: jest.fn(),
    getVerbruikTrend: jest.fn(),
};

function maakApp(taak: string | null = 'waterbeheerder') {
    const controller = new TrendController(mockRepo);
    return maakTestApp(controller.router, taak);
}

beforeEach(() => jest.clearAllMocks());

// ── GET /metingen ─────────────────────────────────────────────────────────────

describe('GET /metingen', () => {
    it('geeft trenddata terug voor waterbeheerder', async () => {
        mockRepo.getMetingenTrend.mockResolvedValue([
            { datum: '2026-05-01', bad_naam: 'Diep', ph_waarde: 7.2, chloor_waarde: 1.0,
              temperatuur: 28, flow: 300, filter_druk_in: 0.5, filter_druk_uit: 0.3 },
        ]);

        const res = await request(maakApp()).get('/metingen?van=2026-05-01&tot=2026-05-31');

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].bad_naam).toBe('Diep');
        expect(mockRepo.getMetingenTrend).toHaveBeenCalledWith('2026-05-01', '2026-05-31');
    });

    it('geeft 403 terug voor coordinator', async () => {
        const res = await request(maakApp('coordinator')).get('/metingen?van=2026-05-01&tot=2026-05-31');
        expect(res.status).toBe(403);
        expect(mockRepo.getMetingenTrend).not.toHaveBeenCalled();
    });

    it('geeft 403 terug voor Administrator', async () => {
        const res = await request(maakApp('Administrator')).get('/metingen?van=2026-05-01&tot=2026-05-31');
        expect(res.status).toBe(403);
    });

    it('geeft 401 terug zonder sessie', async () => {
        const res = await request(maakApp(null)).get('/metingen?van=2026-05-01&tot=2026-05-31');
        expect(res.status).toBe(401);
    });

    it('geeft 500 terug bij databasefout', async () => {
        mockRepo.getMetingenTrend.mockRejectedValue(new Error('DB fout'));
        const res = await request(maakApp()).get('/metingen?van=2026-05-01&tot=2026-05-31');
        expect(res.status).toBe(500);
        expect(res.body.error).toBe('DB fout');
    });
});

// ── GET /verbruik ─────────────────────────────────────────────────────────────

describe('GET /verbruik', () => {
    it('geeft verbruik-trenddata terug', async () => {
        mockRepo.getVerbruikTrend.mockResolvedValue({
            algemeen:  [{ datum: '2026-05-01', water_diep: 1000, water_ondiep: 500,
                          water_totaal: 1500, elektriciteit_nacht: 200, elektriciteit_dag: 300,
                          gas: 50, chemicalien_chloor: 250, chemicalien_zwavelzuur: 80 }],
            peuterbad: [],
        });

        const res = await request(maakApp()).get('/verbruik?van=2026-05-01&tot=2026-05-31');

        expect(res.status).toBe(200);
        expect(res.body.algemeen).toHaveLength(1);
        expect(res.body.peuterbad).toHaveLength(0);
        expect(mockRepo.getVerbruikTrend).toHaveBeenCalledWith('2026-05-01', '2026-05-31');
    });

    it('geeft 403 terug voor coordinator', async () => {
        const res = await request(maakApp('coordinator')).get('/verbruik?van=2026-05-01&tot=2026-05-31');
        expect(res.status).toBe(403);
    });
});
