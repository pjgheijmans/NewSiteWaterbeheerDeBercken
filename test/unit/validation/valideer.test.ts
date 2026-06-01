import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { valideerBody } from '../../../backend/middleware/valideer';
import { AppError } from '../../../backend/errors';

const schema = z.object({ datum: z.string(), n: z.number() });

function mocks(body: unknown) {
    const req = { body } as Request;
    const next = jest.fn() as NextFunction;
    return { req, next };
}

describe('valideerBody', () => {
    it('roept next() zonder fout aan bij geldige invoer', () => {
        const { req, next } = mocks({ datum: '2026-05-31', n: 5 });
        valideerBody(schema)(req, {} as Response, next);
        expect(next).toHaveBeenCalledWith();
    });

    it('vervangt req.body door de geparste waarde (strikt object strip extra velden)', () => {
        const { req, next } = mocks({ datum: '2026-05-31', n: 5, extra: 'weg' });
        valideerBody(schema)(req, {} as Response, next);
        expect(req.body).toEqual({ datum: '2026-05-31', n: 5 });
    });

    it('geeft een AppError met status 400 door bij een ontbrekend veld', () => {
        const { req, next } = mocks({ datum: '2026-05-31' });
        valideerBody(schema)(req, {} as Response, next);
        const err = (next as jest.Mock).mock.calls[0][0];
        expect(err).toBeInstanceOf(AppError);
        expect(err.status).toBe(400);
        expect(err.message).toMatch(/n/);
    });

    it('neemt het veldpad op in de foutmelding', () => {
        const { req, next } = mocks({ datum: 123, n: 5 });
        valideerBody(schema)(req, {} as Response, next);
        expect((next as jest.Mock).mock.calls[0][0].message).toMatch(/datum/);
    });
});
