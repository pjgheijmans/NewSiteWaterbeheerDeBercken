import { Router, Request, Response, NextFunction } from 'express';
import { checkAuth, vereist, vereistHistorieRecht } from '../middleware/auth';
import { valideerBody } from '../middleware/valideer';
import { logboekSchema } from '../validation/schemas';
import { ILogboekService } from '../services/ILogboekService';

export class LogboekController {
    readonly router: Router;

    constructor(private readonly service: ILogboekService) {
        this.router = Router();
        this.router.get(
            '/',
            checkAuth,
            vereist('waterbeheer', 'lezen'),
            this.getByDatum.bind(this),
        );
        this.router.post(
            '/',
            checkAuth,
            vereist('waterbeheer', 'schrijven'),
            valideerBody(logboekSchema),
            vereistHistorieRecht,
            this.save.bind(this),
        );
        this.router.delete(
            '/:id',
            checkAuth,
            vereist('waterbeheer', 'schrijven'),
            this.deleteById.bind(this),
        );
    }

    private async getByDatum(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            res.json(await this.service.getByDatum(req.query.datum as string));
        } catch (err) {
            next(err);
        }
    }

    private async save(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { datum, tijdstip, tekst } = req.body as {
                datum: string;
                tijdstip: string;
                tekst?: string;
            };
            const resultaat = await this.service.save(
                datum,
                tijdstip,
                tekst ?? '',
                req.session.gebruiker!,
            );
            res.json({ status: 'success', id: resultaat.id, auteur: resultaat.auteur });
        } catch (err) {
            next(err);
        }
    }

    private async deleteById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await this.service.deleteById(String(req.params['id']), req.session.gebruiker!);
            res.json({ status: 'success' });
        } catch (err) {
            next(err);
        }
    }
}
