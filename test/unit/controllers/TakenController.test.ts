import request from 'supertest';
import { TakenController } from '../../../backend/controllers/TakenController';
import { ITakenService } from '../../../backend/services/ITakenService';
import { maakTestApp } from '../../helpers/testApp';

const mockService: jest.Mocked<ITakenService> = {
    getTaken: jest.fn(),
};

function maakApp(taak: string | null = 'waterbeheerder') {
    return maakTestApp(new TakenController(mockService).router, taak);
}

const DATUM = '2026-05-31';
beforeEach(() => jest.clearAllMocks());

describe('GET /', () => {
    it('delegeert naar de service voor een waterbeheerder', async () => {
        mockService.getTaken.mockResolvedValue([]);
        const res = await request(maakApp()).get(`/?datum=${DATUM}`);
        expect(res.status).toBe(200);
        expect(mockService.getTaken).toHaveBeenCalledWith(DATUM);
    });

    it('geeft 403 voor een coordinator', async () => {
        const res = await request(maakApp('coordinator')).get(`/?datum=${DATUM}`);
        expect(res.status).toBe(403);
        expect(mockService.getTaken).not.toHaveBeenCalled();
    });

    it('geeft 401 zonder sessie', async () => {
        expect((await request(maakApp(null)).get(`/?datum=${DATUM}`)).status).toBe(401);
    });
});
