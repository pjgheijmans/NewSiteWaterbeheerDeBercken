import { Express } from 'express';
import { Pool } from 'mysql2/promise';
import request from 'supertest';
import { maakApp } from '../../backend/app';
import { maakTestPool, initTestSchema, truncateData, ingelogdeAgent } from './helpers/testDb';

let pool: Pool;
let app: Express;
let agent: ReturnType<typeof request.agent>;

const DATUM = '2026-06-01';

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

describe('Metingen (integratie)', () => {
    it('slaat een grootbad-meting op en leest die terug', async () => {
        const post = await agent.post('/api/metingen').send({
            datum: DATUM, bad_naam: 'Diep',
            ph_waarde: 7.2, chloor_waarde: 1.0, temperatuur: 28,
            flow: 300, filter_druk_in: 0.5, filter_druk_uit: 0.3,
        });
        expect(post.status).toBe(200);

        const get = await agent.get(`/api/metingen?datum=${DATUM}`);
        expect(get.status).toBe(200);
        const diep = get.body.find((m: { bad_naam: string }) => m.bad_naam === 'Diep');
        expect(diep).toBeDefined();
        expect(parseFloat(diep.ph_waarde)).toBe(7.2);
        expect(parseFloat(diep.flow)).toBe(300);
    });

    it('weigert een meting zonder datum met 400', async () => {
        const res = await agent.post('/api/metingen').send({ bad_naam: 'Diep', flow: 300 });
        expect(res.status).toBe(400);
    });

    it('geeft 403 zonder waterbeheerder-rol', async () => {
        const adminAgent = await ingelogdeAgent(app, 'administrator');
        const res = await adminAgent.get(`/api/metingen?datum=${DATUM}`);
        expect(res.status).toBe(403);
    });

    it('genereert een filter-spoelen-actie bij te lage flow en lost die op', async () => {
        // flow 100 < drempel 250 (Diep) → filter_spoelen_flow actie
        const post = await agent.post('/api/metingen').send({ datum: DATUM, bad_naam: 'Diep', flow: 100 });
        expect(post.status).toBe(200);

        const acties = await agent.get(`/api/acties?datum=${DATUM}`);
        const actie = acties.body.find(
            (a: { actie_type: string; bad_naam: string }) => a.actie_type === 'filter_spoelen_flow' && a.bad_naam === 'Diep',
        );
        expect(actie).toBeDefined();
        expect(actie.opgelost).toBeFalsy();

        const resolve = await agent.post(`/api/acties/${actie.id}/resolve`);
        expect(resolve.status).toBe(200);

        const naResolve = await agent.get(`/api/acties?datum=${DATUM}`);
        const opgelost = naResolve.body.find((a: { id: number }) => a.id === actie.id);
        expect(opgelost.opgelost).toBeTruthy();
        expect(opgelost.opgelost_door).toMatch(/Paul|Heijmans|pheijmans/);
    });

    it('verwijdert geen actie zolang flow boven de drempel blijft', async () => {
        await agent.post('/api/metingen').send({ datum: DATUM, bad_naam: 'Diep', flow: 300 });
        const acties = await agent.get(`/api/acties?datum=${DATUM}`);
        const flowActie = acties.body.find((a: { actie_type: string }) => a.actie_type === 'filter_spoelen_flow');
        expect(flowActie).toBeUndefined();
    });
});
