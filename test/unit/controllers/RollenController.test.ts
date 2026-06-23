import request from 'supertest';
import { RollenController } from '../../../backend/controllers/RollenController';
import { IRollenRepository } from '../../../backend/repositories/IRollenRepository';
import { maakTestApp } from '../../helpers/testApp';

const mockRepo: jest.Mocked<IRollenRepository> = {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
};

function maakApp(taak: string | null = 'Administrator') {
    return maakTestApp(new RollenController(mockRepo).router, taak);
}

beforeEach(() => jest.clearAllMocks());

describe('GET / (beheer-domein)', () => {
    it('geeft de rollen-matrix terug voor het beheer-domein', async () => {
        mockRepo.getAll.mockResolvedValue([
            {
                id: 1,
                naam: 'Beheer',
                mag_historie_bewerken: true,
                rechten: { beheer: 'schrijven', waterbeheer: 'geen', coordinator: 'geen' },
            },
        ]);
        const res = await request(maakApp()).get('/');
        expect(res.status).toBe(200);
        expect(res.body[0].naam).toBe('Beheer');
    });

    it('geeft 403 voor een niet-beheer-rol', async () => {
        expect((await request(maakApp('waterbeheerder')).get('/')).status).toBe(403);
        expect(mockRepo.getAll).not.toHaveBeenCalled();
    });

    it('geeft 401 zonder sessie', async () => {
        expect((await request(maakApp(null)).get('/')).status).toBe(401);
    });
});

describe('POST / (beheer-domein)', () => {
    it('maakt een nieuwe rol aan', async () => {
        mockRepo.create.mockResolvedValue(undefined);
        const res = await request(maakApp()).post('/').send({ naam: 'Inval' });
        expect(res.status).toBe(200);
        expect(mockRepo.create).toHaveBeenCalledWith('Inval');
    });

    it('geeft 400 bij een lege naam', async () => {
        const res = await request(maakApp()).post('/').send({ naam: '' });
        expect(res.status).toBe(400);
        expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('geeft 403 voor een niet-beheer-rol', async () => {
        expect((await request(maakApp('coordinator')).post('/').send({ naam: 'X' })).status).toBe(
            403,
        );
        expect(mockRepo.create).not.toHaveBeenCalled();
    });
});

describe('PUT /:id (beheer-domein)', () => {
    const body = {
        naam: 'Beheer',
        mag_historie_bewerken: true,
        rechten: { beheer: 'schrijven', waterbeheer: 'geen', coordinator: 'geen' },
    };

    it('werkt een rol bij met het id', async () => {
        mockRepo.update.mockResolvedValue(undefined);
        const res = await request(maakApp()).put('/1').send(body);
        expect(res.status).toBe(200);
        expect(mockRepo.update).toHaveBeenCalledWith('1', body);
    });

    it('geeft 400 bij een ongeldig niveau', async () => {
        const res = await request(maakApp())
            .put('/1')
            .send({ ...body, rechten: { beheer: 'baas' } });
        expect(res.status).toBe(400);
        expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('geeft 403 voor een niet-beheer-rol', async () => {
        expect((await request(maakApp('coordinator')).put('/1').send(body)).status).toBe(403);
    });
});

describe('DELETE /:id (beheer-domein)', () => {
    it('verwijdert een rol met het id', async () => {
        mockRepo.remove.mockResolvedValue(undefined);
        const res = await request(maakApp()).delete('/3');
        expect(res.status).toBe(200);
        expect(mockRepo.remove).toHaveBeenCalledWith('3');
    });

    it('geeft 403 voor een niet-beheer-rol', async () => {
        expect((await request(maakApp('coordinator')).delete('/3')).status).toBe(403);
        expect(mockRepo.remove).not.toHaveBeenCalled();
    });
});
