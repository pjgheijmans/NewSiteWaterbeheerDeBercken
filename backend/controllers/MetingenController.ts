import { Router, Request, Response, NextFunction } from 'express';
import { checkAuth, vereist, vereistHistorieRecht } from '../middleware/auth';
import { valideerBody } from '../middleware/valideer';
import { metingSchema } from '../validation/schemas';
import { IMetingenService } from '../services/IMetingenService';
import { MetingInput } from '../types';
import { bepaalAuteur } from '../auteur';

export class MetingenController {
    readonly router: Router;

    constructor(private readonly service: IMetingenService) {
        this.router = Router();
        this.router.get(
            '/metingen',
            checkAuth,
            vereist('waterbeheer', 'lezen'),
            this.getMetingen.bind(this),
        );
        this.router.post(
            '/metingen',
            checkAuth,
            vereist('waterbeheer', 'schrijven'),
            valideerBody(metingSchema),
            vereistHistorieRecht,
            this.postMeting.bind(this),
        );
        this.router.get(
            '/acties',
            checkAuth,
            vereist('waterbeheer', 'lezen'),
            this.getActies.bind(this),
        );
        this.router.post(
            '/acties/:id/resolve',
            checkAuth,
            vereist('waterbeheer', 'schrijven'),
            this.resolveActie.bind(this),
        );
        this.router.get(
            '/bezoekers',
            checkAuth,
            vereist('waterbeheer', 'lezen'),
            this.getBezoekers.bind(this),
        );
        this.router.get(
            '/gebonden-chloor',
            checkAuth,
            vereist('waterbeheer', 'lezen'),
            this.getGebondenChloor.bind(this),
        );
        this.router.post(
            '/acties/:id/unresolve',
            checkAuth,
            vereist('waterbeheer', 'schrijven'),
            this.unresolveActie.bind(this),
        );
    }

    private async getMetingen(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            res.json(await this.service.getMetingen(req.query.datum as string));
        } catch (err) {
            next(err);
        }
    }

    private async postMeting(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const meta = await this.service.saveMeting(
                req.body as MetingInput,
                bepaalAuteur(req.session.gebruiker!),
            );
            res.json({ status: 'success', ...meta });
        } catch (err) {
            next(err);
        }
    }

    private async getActies(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const datum = (req.query.datum as string) || new Date().toISOString().split('T')[0];
            res.json(await this.service.getActies(datum));
        } catch (err) {
            next(err);
        }
    }

    private async resolveActie(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await this.service.resolveActie(String(req.params['id']), req.session.gebruiker!);
            res.json({ status: 'success' });
        } catch (err) {
            next(err);
        }
    }

    private async getBezoekers(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            res.json(await this.service.getBezoekers(req.query.datum as string));
        } catch (err) {
            next(err);
        }
    }

    private async getGebondenChloor(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            res.json(await this.service.getGebondenChloor(req.query.datum as string));
        } catch (err) {
            next(err);
        }
    }

    private async unresolveActie(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await this.service.unresolveActie(String(req.params['id']));
            res.json({ status: 'success' });
        } catch (err) {
            next(err);
        }
    }
}
