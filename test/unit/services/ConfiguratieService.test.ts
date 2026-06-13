import { ConfiguratieService } from '../../../backend/services/ConfiguratieService';
import { IConfiguratieRepository } from '../../../backend/repositories/IConfiguratieRepository';
import { AppError } from '../../../backend/errors';

function maakService(repoOverrides: Partial<jest.Mocked<IConfiguratieRepository>> = {}) {
    const repo: jest.Mocked<IConfiguratieRepository> = {
        getAll: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue(undefined),
        ...repoOverrides,
    };
    return { service: new ConfiguratieService(repo), repo };
}

describe('getSessieTimeoutMs', () => {
    it('valt terug op 5 minuten (300000 ms) zonder geladen cache', () => {
        const { service } = maakService();
        expect(service.getSessieTimeoutMs()).toBe(5 * 60 * 1000);
    });

    it('gebruikt de waarde uit de cache na laadCache', async () => {
        const { service } = maakService({
            getAll: jest.fn().mockResolvedValue([
                { sleutel: 'sessie_timeout_minuten', waarde: '10', omschrijving: null, type: 'getal' },
            ]),
        });
        await service.laadCache();
        expect(service.getSessieTimeoutMs()).toBe(10 * 60 * 1000);
    });

    it('faalt zacht als laadCache de DB niet kan bereiken (defaults blijven)', async () => {
        const { service } = maakService({ getAll: jest.fn().mockRejectedValue(new Error('geen DB')) });
        await expect(service.laadCache()).resolves.toBeUndefined();
        expect(service.getSessieTimeoutMs()).toBe(5 * 60 * 1000);
    });
});

describe('update', () => {
    it('bewaart een geldige waarde en ververst de cache (direct effect)', async () => {
        const { service, repo } = maakService();
        await service.update('sessie_timeout_minuten', '15');
        expect(repo.upsert).toHaveBeenCalledWith('sessie_timeout_minuten', '15');
        expect(service.getSessieTimeoutMs()).toBe(15 * 60 * 1000);
    });

    it.each(['0', '1441', 'abc', '5.5', '-3'])('weigert ongeldige minuten (%s) met 400', async (waarde) => {
        const { service, repo } = maakService();
        await expect(service.update('sessie_timeout_minuten', waarde))
            .rejects.toMatchObject({ status: 400 });
        expect(repo.upsert).not.toHaveBeenCalled();
    });

    it.each(['1', '1440'])('accepteert de grenswaarden (%s)', async (waarde) => {
        const { service, repo } = maakService();
        await expect(service.update('sessie_timeout_minuten', waarde)).resolves.toBeUndefined();
        expect(repo.upsert).toHaveBeenCalledWith('sessie_timeout_minuten', waarde);
    });

    it('weigert een onbekende sleutel met 404', async () => {
        const { service, repo } = maakService();
        await expect(service.update('bestaat_niet', '1'))
            .rejects.toEqual(expect.objectContaining({ status: 404 }));
        expect(repo.upsert).not.toHaveBeenCalled();
    });

    it('gooit een AppError (geen kale Error)', async () => {
        const { service } = maakService();
        await expect(service.update('sessie_timeout_minuten', 'x')).rejects.toBeInstanceOf(AppError);
    });
});
