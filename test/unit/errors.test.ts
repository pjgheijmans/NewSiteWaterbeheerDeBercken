import { AppError } from '../../backend/errors';

describe('AppError', () => {
    it('slaat bericht en statuscode op', () => {
        const err = new AppError('Bad niet gevonden', 400);
        expect(err.message).toBe('Bad niet gevonden');
        expect(err.status).toBe(400);
    });

    it('is een instantie van Error', () => {
        const err = new AppError('Fout', 500);
        expect(err).toBeInstanceOf(Error);
    });

    it('heeft naam AppError', () => {
        const err = new AppError('Fout', 500);
        expect(err.name).toBe('AppError');
    });

    it('is vangbaar als Error', () => {
        expect(() => { throw new AppError('Test', 422); }).toThrow('Test');
    });
});
