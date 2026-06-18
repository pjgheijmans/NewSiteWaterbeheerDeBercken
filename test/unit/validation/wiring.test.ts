import request from 'supertest';
import { MetingenController } from '../../../backend/controllers/MetingenController';
import { GebruikersController } from '../../../backend/controllers/GebruikersController';
import { LimietenController } from '../../../backend/controllers/LimietenController';
import { LogboekController } from '../../../backend/controllers/LogboekController';
import { AuthController } from '../../../backend/controllers/AuthController';
import { maakTestApp } from '../../helpers/testApp';

/**
 * Bewijst dat valideerBody daadwerkelijk in de routes is ingehaakt:
 * ongeldige bodies leveren 400 op en de service wordt niet aangeroepen.
 */
describe('validatie-bedrading in de routes', () => {
    it('POST /metingen zonder datum → 400, service niet aangeroepen', async () => {
        const service = { saveMeting: jest.fn() } as any;
        const app = maakTestApp(new MetingenController(service).router, 'waterbeheerder');
        const res = await request(app).post('/metingen').send({ bad_naam: 'Diep' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Ongeldige invoer/i);
        expect(service.saveMeting).not.toHaveBeenCalled();
    });

    it('POST /gebruikers zonder rol_ids → 400', async () => {
        const service = { create: jest.fn() } as any;
        const app = maakTestApp(new GebruikersController(service).router, 'Administrator');
        const res = await request(app).post('/').send({
            voornaam: 'Jan', achternaam: 'J', inlognaam: 'jj', wachtwoord: 'x',
        });
        expect(res.status).toBe(400);
        expect(service.create).not.toHaveBeenCalled();
    });

    it('POST /limieten met niet-numerieke grenswaarde → 400', async () => {
        const service = { save: jest.fn() } as any;
        const app = maakTestApp(new LimietenController(service).router, 'Administrator');
        const res = await request(app).post('/').send({ parameter_naam: 'ph_waarde', min_waarde: 'x', max_waarde: 7.6 });
        expect(res.status).toBe(400);
        expect(service.save).not.toHaveBeenCalled();
    });

    it('POST /logboek zonder tijdstip → 400', async () => {
        const service = { save: jest.fn() } as any;
        const app = maakTestApp(new LogboekController(service).router, 'waterbeheerder');
        const res = await request(app).post('/').send({ datum: '2026-05-31', tekst: 'x' });
        expect(res.status).toBe(400);
        expect(service.save).not.toHaveBeenCalled();
    });

    it('POST /login zonder wachtwoord → 400', async () => {
        const service = { login: jest.fn() } as any;
        const app = maakTestApp(new AuthController(service).router, null);
        const res = await request(app).post('/login').send({ username: 'u' });
        expect(res.status).toBe(400);
        expect(service.login).not.toHaveBeenCalled();
    });

    it('laat een geldige body wél door naar de service', async () => {
        const service = { saveMeting: jest.fn().mockResolvedValue(undefined) } as any;
        const app = maakTestApp(new MetingenController(service).router, 'waterbeheerder');
        const res = await request(app).post('/metingen').send({ datum: '2026-05-31', bad_naam: 'Diep', ph_waarde: 7.2 });
        expect(res.status).toBe(200);
        expect(service.saveMeting).toHaveBeenCalled();
    });
});
