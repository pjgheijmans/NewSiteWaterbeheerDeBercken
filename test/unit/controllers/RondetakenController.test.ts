import request from 'supertest';
import { RondetakenController } from '../../../backend/controllers/RondetakenController';
import { IRondetakenService } from '../../../backend/services/IRondetakenService';
import { maakTestApp } from '../../helpers/testApp';

const mockService: jest.Mocked<IRondetakenService> = {
    getRondetaken: jest.fn(),
    voltooi: jest.fn(),
    heropen: jest.fn(),
};

function maakApp(taak: string | null = 'waterbeheerder') {
    return maakTestApp(new RondetakenController(mockService).router, taak);
}

const DATUM = '2026-05-31';
beforeEach(() => jest.clearAllMocks());

describe('GET /', () => {
    it('delegeert naar de service voor een waterbeheerder', async () => {
        mockService.getRondetaken.mockResolvedValue([]);
        const res = await request(maakApp()).get(`/?datum=${DATUM}`);
        expect(res.status).toBe(200);
        expect(mockService.getRondetaken).toHaveBeenCalledWith(DATUM);
    });

    it('geeft 403 voor een coordinator', async () => {
        const res = await request(maakApp('coordinator')).get(`/?datum=${DATUM}`);
        expect(res.status).toBe(403);
        expect(mockService.getRondetaken).not.toHaveBeenCalled();
    });

    it('geeft 401 zonder sessie', async () => {
        expect((await request(maakApp(null)).get(`/?datum=${DATUM}`)).status).toBe(401);
    });
});

describe('POST /:sleutel/voltooi', () => {
    it('geeft sleutel, datum en gebruiker door aan de service', async () => {
        mockService.voltooi.mockResolvedValue(undefined);
        const res = await request(maakApp()).post('/regelaar_diep/voltooi').send({ datum: DATUM });
        expect(res.status).toBe(200);
        expect(mockService.voltooi).toHaveBeenCalledWith(
            'regelaar_diep',
            DATUM,
            expect.objectContaining({ taak: 'waterbeheerder' }),
        );
    });

    it('valideert de body (datum verplicht)', async () => {
        const res = await request(maakApp()).post('/regelaar_diep/voltooi').send({});
        expect(res.status).toBe(400);
        expect(mockService.voltooi).not.toHaveBeenCalled();
    });
});

describe('POST /:sleutel/heropen', () => {
    it('delegeert naar de service', async () => {
        mockService.heropen.mockResolvedValue(undefined);
        const res = await request(maakApp()).post('/regelaar_diep/heropen').send({ datum: DATUM });
        expect(res.status).toBe(200);
        expect(mockService.heropen).toHaveBeenCalledWith('regelaar_diep', DATUM);
    });
});
