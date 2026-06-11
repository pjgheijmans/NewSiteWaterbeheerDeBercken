import request from 'supertest';
import express from 'express';
import { maakVersieRouter } from '../../../backend/routes/versie';

/**
 * De versie-route leest package.json (code-versie) en GIT_COMMIT (env).
 * Geen database of sessie nodig — het is een publieke, read-only endpoint.
 */
describe('GET /api/versie', () => {
    function maakApp() {
        const app = express();
        app.use('/api/versie', maakVersieRouter());
        return app;
    }

    it('geeft de versie uit package.json terug', async () => {
        const res = await request(maakApp()).get('/api/versie');
        expect(res.status).toBe(200);
        // Semver-achtig (bijv. "1.0.0"); valt nooit terug op leeg.
        expect(res.body.versie).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('geeft de git-commit uit GIT_COMMIT terug', async () => {
        const oud = process.env.GIT_COMMIT;
        // versie.ts cachet de commit bij het laden van de module; importeer vers.
        jest.resetModules();
        process.env.GIT_COMMIT = 'abc1234';
        const { maakVersieRouter: verseRouter } = require('../../../backend/routes/versie');
        const app = express();
        app.use('/api/versie', verseRouter());

        const res = await request(app).get('/api/versie');
        expect(res.body.commit).toBe('abc1234');

        if (oud === undefined) delete process.env.GIT_COMMIT;
        else process.env.GIT_COMMIT = oud;
    });

    it('valt terug op "onbekend" als GIT_COMMIT ontbreekt', async () => {
        const oud = process.env.GIT_COMMIT;
        jest.resetModules();
        delete process.env.GIT_COMMIT;
        const { maakVersieRouter: verseRouter } = require('../../../backend/routes/versie');
        const app = express();
        app.use('/api/versie', verseRouter());

        const res = await request(app).get('/api/versie');
        expect(res.body.commit).toBe('onbekend');

        if (oud !== undefined) process.env.GIT_COMMIT = oud;
    });
});
