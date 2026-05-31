import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../../backend/middleware/errorHandler';
import { AppError } from '../../../backend/errors';

function maakMocks() {
    const req = {} as Request;
    const res = {
        status: jest.fn().mockReturnThis(),
        json:   jest.fn().mockReturnThis(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;
    return { req, res, next };
}

describe('errorHandler', () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        // Onderdruk console.error zodat 5xx-logging de testuitvoer niet vervuilt
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it('gebruikt de statuscode van een AppError', () => {
        const { req, res, next } = maakMocks();
        errorHandler(new AppError('Bad niet gevonden', 400), req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Bad niet gevonden' });
    });

    it('valt terug op 500 voor een gewone Error', () => {
        const { req, res, next } = maakMocks();
        errorHandler(new Error('Onverwachte DB-fout'), req, res, next);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Onverwachte DB-fout' });
    });

    it('gebruikt een generiek bericht voor een non-Error worp', () => {
        const { req, res, next } = maakMocks();
        errorHandler('zomaar een string', req, res, next);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Onbekende fout' });
    });

    it('logt server-fouten (5xx) naar console.error', () => {
        const { req, res, next } = maakMocks();
        const err = new Error('Kapot');
        errorHandler(err, req, res, next);
        expect(consoleErrorSpy).toHaveBeenCalledWith(err);
    });

    it('logt client-fouten (4xx) NIET', () => {
        const { req, res, next } = maakMocks();
        errorHandler(new AppError('Ongeldige invoer', 422), req, res, next);
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('behandelt een AppError met 5xx-status als server-fout (logt wel)', () => {
        const { req, res, next } = maakMocks();
        const err = new AppError('Interne fout', 503);
        errorHandler(err, req, res, next);
        expect(res.status).toHaveBeenCalledWith(503);
        expect(consoleErrorSpy).toHaveBeenCalledWith(err);
    });
});
