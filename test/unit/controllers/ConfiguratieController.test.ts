import request from 'supertest';
import { ConfiguratieController } from '../../../backend/controllers/ConfiguratieController';
import { IConfiguratieService } from '../../../backend/services/IConfiguratieService';
import { AppError } from '../../../backend/errors';
import { maakTestApp } from '../../helpers/testApp';

const mockService: jest.Mocked<IConfiguratieService> = {
    laadCache: jest.fn(),
    getAll: jest.fn(),
    getSessieTimeoutMs: jest.fn(),
    update: jest.fn(),
};

function maakApp(taak: string | null = 'Administrator') {
    return maakTestApp(new ConfiguratieController(mockService).router, taak);
}

beforeEach(() => jest.clearAllMocks());

describe('GET / (beheer-domein)', () => {
    it('geeft de configuratie-instellingen terug', async () => {
        mockService.getAll.mockResolvedValue([
            {
                sleutel: 'sessie_timeout_minuten',
                waarde: '5',
                omschrijving: 'Sessie',
                type: 'getal',
            },
        ]);
        const res = await request(maakApp('Administrator')).get('/');
        expect(res.status).toBe(200);
        expect(res.body[0].sleutel).toBe('sessie_timeout_minuten');
    });

    it('geeft 403 voor een niet-beheer-rol', async () => {
        expect((await request(maakApp('coordinator')).get('/')).status).toBe(403);
    });

    it('geeft 401 zonder sessie', async () => {
        expect((await request(maakApp(null)).get('/')).status).toBe(401);
    });

    it('geeft 500 bij een fout in de service', async () => {
        mockService.getAll.mockRejectedValue(new Error('DB fout'));
        expect((await request(maakApp('Administrator')).get('/')).status).toBe(500);
    });
});

describe('PUT /:sleutel (alleen Administrator)', () => {
    it('werkt bij voor Administrator en roept de service correct aan', async () => {
        mockService.update.mockResolvedValue(undefined);
        const res = await request(maakApp('Administrator'))
            .put('/sessie_timeout_minuten')
            .send({ waarde: '10' });
        expect(res.status).toBe(200);
        expect(mockService.update).toHaveBeenCalledWith('sessie_timeout_minuten', '10');
    });

    it('geeft 403 voor waterbeheerder', async () => {
        const res = await request(maakApp('waterbeheerder'))
            .put('/sessie_timeout_minuten')
            .send({ waarde: '10' });
        expect(res.status).toBe(403);
        expect(mockService.update).not.toHaveBeenCalled();
    });

    it('geeft 403 voor coordinator', async () => {
        expect(
            (
                await request(maakApp('coordinator'))
                    .put('/sessie_timeout_minuten')
                    .send({ waarde: '10' })
            ).status,
        ).toBe(403);
    });

    it('geeft 401 zonder sessie', async () => {
        expect(
            (await request(maakApp(null)).put('/sessie_timeout_minuten').send({ waarde: '10' }))
                .status,
        ).toBe(401);
    });

    it('geeft 400 bij een lege waarde (Zod-validatie)', async () => {
        const res = await request(maakApp('Administrator'))
            .put('/sessie_timeout_minuten')
            .send({ waarde: '' });
        expect(res.status).toBe(400);
        expect(mockService.update).not.toHaveBeenCalled();
    });

    it('propageert de service-AppError-status (400 bij ongeldig bereik)', async () => {
        mockService.update.mockRejectedValue(new AppError('te groot', 400));
        const res = await request(maakApp('Administrator'))
            .put('/sessie_timeout_minuten')
            .send({ waarde: '99999' });
        expect(res.status).toBe(400);
    });

    it('propageert 404 voor een onbekende sleutel', async () => {
        mockService.update.mockRejectedValue(new AppError('onbekend', 404));
        const res = await request(maakApp('Administrator')).put('/onbekend').send({ waarde: '1' });
        expect(res.status).toBe(404);
    });
});
