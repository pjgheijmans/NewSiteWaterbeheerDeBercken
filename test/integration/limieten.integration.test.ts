import { Express } from 'express';
import { Pool } from 'mysql2/promise';
import request from 'supertest';
import { maakApp } from '../../backend/app';
import { maakTestPool, initTestSchema, truncateData, ingelogdeAgent } from './helpers/testDb';

let pool: Pool;
let app: Express;

beforeAll(async () => {
    pool = await maakTestPool();
    await initTestSchema(pool);
    app = maakApp(pool);
});

afterAll(async () => { await pool.end(); });
beforeEach(async () => { await truncateData(pool); });

describe('Limieten (integratie)', () => {
    it('geeft de geseede limieten terug zonder authenticatie', async () => {
        const res = await request(app).get('/api/limieten');
        expect(res.status).toBe(200);
        expect(res.body.ph_waarde).toBeDefined();
        expect(Object.keys(res.body).length).toBeGreaterThanOrEqual(30);
    });

    it('slaat een gewijzigde limiet op (Administrator) en leest die terug', async () => {
        const agent = await ingelogdeAgent(app, 'administrator');
        const post = await agent.post('/api/limieten').send({
            parameter_naam: 'ph_waarde', min_waarde: 6.9, max_waarde: 7.5,
        });
        expect(post.status).toBe(200);

        const get = await request(app).get('/api/limieten');
        expect(get.body.ph_waarde).toEqual({ min: 6.9, max: 7.5 });
    });

    it('weigert opslaan zonder admin/waterbeheerder-rol (401 zonder sessie)', async () => {
        const res = await request(app).post('/api/limieten').send({
            parameter_naam: 'ph_waarde', min_waarde: 6.9, max_waarde: 7.5,
        });
        expect(res.status).toBe(401);
    });

    it('valideert een niet-numerieke grenswaarde met 400', async () => {
        const agent = await ingelogdeAgent(app, 'administrator');
        const res = await agent.post('/api/limieten').send({
            parameter_naam: 'ph_waarde', min_waarde: 'laag', max_waarde: 7.5,
        });
        expect(res.status).toBe(400);
    });
});
