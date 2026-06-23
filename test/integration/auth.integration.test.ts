import { Express } from 'express';
import { Pool } from 'mysql2/promise';
import request from 'supertest';
import { maakApp } from '../../backend/app';
import { maakTestPool, initTestSchema, truncateData, TEST_USERS } from './helpers/testDb';

let pool: Pool;
let app: Express;

beforeAll(async () => {
    pool = await maakTestPool();
    await initTestSchema(pool);
    app = maakApp(pool);
});

afterAll(async () => {
    await pool.end();
});
beforeEach(async () => {
    await truncateData(pool);
});

describe('Auth (integratie)', () => {
    it('weigert onjuiste inloggegevens met 401', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({ username: 'pheijmans', password: 'fout' });
        expect(res.status).toBe(401);
    });

    it('logt een geseede gebruiker in en geeft het gebruikersobject terug', async () => {
        const res = await request(app).post('/api/login').send(TEST_USERS.waterbeheerder);
        expect(res.status).toBe(200);
        expect(res.body.gebruiker).toMatchObject({
            inlognaam: 'pheijmans',
            taak: 'waterbeheerder',
        });
    });

    it('houdt de sessie vast over requests heen (agent)', async () => {
        const agent = request.agent(app);
        await agent.post('/api/login').send(TEST_USERS.waterbeheerder);
        const res = await agent.get('/api/ingelogd');
        expect(res.body.ingelogd).toBe(true);
        expect(res.body.gebruiker.taak).toBe('waterbeheerder');
    });

    it('geeft ingelogd:false zonder sessie', async () => {
        const res = await request(app).get('/api/ingelogd');
        expect(res.body.ingelogd).toBe(false);
    });

    it('valideert ontbrekende inloggegevens met 400', async () => {
        const res = await request(app).post('/api/login').send({ username: 'x' });
        expect(res.status).toBe(400);
    });
});
