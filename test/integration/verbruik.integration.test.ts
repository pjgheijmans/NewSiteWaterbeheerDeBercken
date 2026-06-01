import { Express } from 'express';
import { Pool } from 'mysql2/promise';
import request from 'supertest';
import { maakApp } from '../../backend/app';
import { maakTestPool, initTestSchema, truncateData, ingelogdeAgent } from './helpers/testDb';

let pool: Pool;
let app: Express;
let agent: ReturnType<typeof request.agent>;

beforeAll(async () => {
    pool = await maakTestPool();
    await initTestSchema(pool);
    app = maakApp(pool);
});

afterAll(async () => { await pool.end(); });
beforeEach(async () => {
    await truncateData(pool);
    agent = await ingelogdeAgent(app, 'waterbeheerder');
});

describe('Verbruik (integratie)', () => {
    it('slaat verbruik op en leest het terug', async () => {
        const post = await agent.post('/api/verbruik/diep-ondiep').send({
            datum: '2026-06-01', water_diep: 1000, water_ondiep: 500, gas: 50,
        });
        expect(post.status).toBe(200);

        const get = await agent.get('/api/verbruik/diep-ondiep?datum=2026-06-01');
        expect(get.status).toBe(200);
        expect(parseFloat(get.body.water_diep)).toBe(1000);
        expect(parseFloat(get.body.gas)).toBe(50);
    });

    it('haalt de meterstand van de vorige dag op', async () => {
        await agent.post('/api/verbruik/diep-ondiep').send({ datum: '2026-05-31', water_diep: 900 });
        const vorige = await agent.get('/api/verbruik/diep-ondiep/vorige?datum=2026-06-01');
        expect(vorige.status).toBe(200);
        expect(parseFloat(vorige.body.water_diep)).toBe(900);
    });

    it('slaat en leest de verwarmingsstatus', async () => {
        await agent.post('/api/verbruik/verwarmingssysteem').send({
            datum: '2026-06-01', verwarming_status_1: true, verwarming_druk_ok: true,
        });
        const get = await agent.get('/api/verbruik/verwarmingssysteem?datum=2026-06-01');
        expect(get.status).toBe(200);
        expect(get.body.verwarming_status_1).toBeTruthy();
    });
});
