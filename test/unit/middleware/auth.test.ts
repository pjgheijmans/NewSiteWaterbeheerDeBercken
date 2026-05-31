import { Request, Response, NextFunction } from 'express';
import {
    checkAuth,
    isAdminOrWaterbeheerder,
    isWaterbeheerder,
    isWaterbeheerderOrCoordinator,
} from '../../../backend/middleware/auth';

function maakMocks(gebruiker: any = null) {
    const req = { session: { gebruiker } } as unknown as Request;
    const res = {
        status: jest.fn().mockReturnThis(),
        json:   jest.fn().mockReturnThis(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;
    return { req, res, next };
}

describe('checkAuth', () => {
    it('roept next() aan als gebruiker in sessie zit', () => {
        const { req, res, next } = maakMocks({ id: 1, taak: 'waterbeheerder' });
        checkAuth(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('geeft 401 terug als er geen sessie-gebruiker is', () => {
        const { req, res, next } = maakMocks(null);
        checkAuth(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Niet ingelogd' });
        expect(next).not.toHaveBeenCalled();
    });

    it('geeft 401 terug bij ontbrekende sessie', () => {
        const req = {} as unknown as Request;
        const res = {
            status: jest.fn().mockReturnThis(),
            json:   jest.fn().mockReturnThis(),
        } as unknown as Response;
        const next = jest.fn() as NextFunction;
        checkAuth(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
    });
});

describe('isAdminOrWaterbeheerder', () => {
    it.each([
        ['waterbeheerder', true],
        ['Administrator',  true],
        ['coordinator',    false],
        ['',               false],
    ])('geeft %s → %s', (taak, verwacht) => {
        expect(isAdminOrWaterbeheerder(taak)).toBe(verwacht);
    });
});

describe('isWaterbeheerder', () => {
    it.each([
        ['waterbeheerder', true],
        ['Administrator',  false],
        ['coordinator',    false],
    ])('geeft %s → %s', (taak, verwacht) => {
        expect(isWaterbeheerder(taak)).toBe(verwacht);
    });
});

describe('isWaterbeheerderOrCoordinator', () => {
    it.each([
        ['waterbeheerder', true],
        ['coordinator',    true],
        ['Administrator',  false],
    ])('geeft %s → %s', (taak, verwacht) => {
        expect(isWaterbeheerderOrCoordinator(taak)).toBe(verwacht);
    });
});
