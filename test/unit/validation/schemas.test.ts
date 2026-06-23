import {
    metingSchema,
    verbruikSchema,
    coordinatorMetingSchema,
    logboekSchema,
    gebruikerSchema,
    gebruikerUpdateSchema,
    limietSchema,
    loginSchema,
} from '../../../backend/validation/schemas';

const DATUM = '2026-05-31';

describe('metingSchema', () => {
    it('accepteert datum + bad_naam en behoudt extra meetwaardevelden', () => {
        const r = metingSchema.safeParse({
            datum: DATUM,
            bad_naam: 'Diep',
            ph_waarde: 7.2,
            water: '12',
        });
        expect(r.success).toBe(true);
        expect(r.data).toMatchObject({ bad_naam: 'Diep', ph_waarde: 7.2, water: '12' });
    });

    it('weigert een ontbrekende datum', () => {
        expect(metingSchema.safeParse({ bad_naam: 'Diep' }).success).toBe(false);
    });

    it('weigert een verkeerd datumformaat', () => {
        expect(metingSchema.safeParse({ datum: '31-05-2026', bad_naam: 'Diep' }).success).toBe(
            false,
        );
    });

    it('weigert een leeg bad_naam', () => {
        expect(metingSchema.safeParse({ datum: DATUM, bad_naam: '' }).success).toBe(false);
    });

    it('laat een onbekend bad_naam toe (de service bepaalt geldigheid)', () => {
        expect(metingSchema.safeParse({ datum: DATUM, bad_naam: 'Onbekend' }).success).toBe(true);
    });
});

describe('verbruik- en coordinatormeting-schema', () => {
    it('verbruikSchema vereist alleen een geldige datum', () => {
        expect(verbruikSchema.safeParse({ datum: DATUM, water_diep: 1000 }).success).toBe(true);
        expect(verbruikSchema.safeParse({}).success).toBe(false);
    });

    it('coordinatorMetingSchema vereist datum en bad_naam', () => {
        expect(coordinatorMetingSchema.safeParse({ datum: DATUM, bad_naam: 'Diep' }).success).toBe(
            true,
        );
        expect(coordinatorMetingSchema.safeParse({ datum: DATUM }).success).toBe(false);
    });
});

describe('logboekSchema', () => {
    it('vereist datum en tijdstip; tekst is optioneel', () => {
        expect(logboekSchema.safeParse({ datum: DATUM, tijdstip: '10:00:00' }).success).toBe(true);
        expect(logboekSchema.safeParse({ datum: DATUM }).success).toBe(false);
    });
});

describe('gebruikerSchema', () => {
    const geldig = {
        voornaam: 'Jan',
        achternaam: 'J',
        inlognaam: 'jj',
        wachtwoord: 'x',
        rol_ids: [3],
    };

    it('accepteert een geldige gebruiker', () => {
        expect(gebruikerSchema.safeParse(geldig).success).toBe(true);
    });

    it('accepteert een lege rollenlijst', () => {
        expect(gebruikerSchema.safeParse({ ...geldig, rol_ids: [] }).success).toBe(true);
    });

    it('weigert niet-numerieke rol_ids', () => {
        expect(gebruikerSchema.safeParse({ ...geldig, rol_ids: ['x'] }).success).toBe(false);
    });

    it('weigert ontbrekende rol_ids', () => {
        const { rol_ids: _weg, ...zonder } = geldig;
        expect(gebruikerSchema.safeParse(zonder).success).toBe(false);
    });

    it('weigert een leeg inlognaam of wachtwoord', () => {
        expect(gebruikerSchema.safeParse({ ...geldig, inlognaam: '' }).success).toBe(false);
        expect(gebruikerSchema.safeParse({ ...geldig, wachtwoord: '' }).success).toBe(false);
    });
});

describe('gebruikerUpdateSchema', () => {
    const basis = { voornaam: 'Jan', achternaam: 'J', inlognaam: 'jj', rol_ids: [3] };

    it('staat een ontbrekend wachtwoord toe (ongewijzigd laten)', () => {
        expect(gebruikerUpdateSchema.safeParse(basis).success).toBe(true);
    });

    it('accepteert ook een meegegeven wachtwoord', () => {
        expect(gebruikerUpdateSchema.safeParse({ ...basis, wachtwoord: 'nieuw' }).success).toBe(
            true,
        );
    });
});

describe('limietSchema', () => {
    it('accepteert numerieke grenswaarden', () => {
        expect(
            limietSchema.safeParse({
                parameter_naam: 'ph_waarde',
                min_waarde: 6.8,
                max_waarde: 7.6,
            }).success,
        ).toBe(true);
    });

    it('weigert niet-numerieke grenswaarden', () => {
        expect(
            limietSchema.safeParse({
                parameter_naam: 'ph_waarde',
                min_waarde: '6.8',
                max_waarde: 7.6,
            }).success,
        ).toBe(false);
    });
});

describe('loginSchema', () => {
    it('vereist een niet-leeg username en password', () => {
        expect(loginSchema.safeParse({ username: 'u', password: 'p' }).success).toBe(true);
        expect(loginSchema.safeParse({ username: '', password: 'p' }).success).toBe(false);
    });
});
