import { Router, Request, Response, NextFunction } from 'express';
import { checkAuth, vereist, vereistHistorieRecht } from '../middleware/auth';
import { valideerBody } from '../middleware/valideer';
import { verbruikSchema, verwarmingSchema } from '../validation/schemas';
import { IVerbruikService } from '../services/IVerbruikService';
import { VerbruikInput, VerwarmingInput } from '../types';
import { bepaalAuteur } from '../auteur';

export class VerbruikController {
    readonly router: Router;

    constructor(private readonly service: IVerbruikService) {
        this.router = Router();
        this.router.get(
            '/diep-ondiep',
            checkAuth,
            vereist('waterbeheer', 'lezen'),
            this.getVerbruik.bind(this),
        );
        this.router.get(
            '/diep-ondiep/vorige',
            checkAuth,
            vereist('waterbeheer', 'lezen'),
            this.getVorigeVerbruik.bind(this),
        );
        this.router.post(
            '/diep-ondiep',
            checkAuth,
            vereist('waterbeheer', 'schrijven'),
            valideerBody(verbruikSchema),
            vereistHistorieRecht,
            this.postVerbruik.bind(this),
        );
        this.router.get(
            '/verwarmingssysteem',
            checkAuth,
            vereist('waterbeheer', 'lezen'),
            this.getVerwarming.bind(this),
        );
        this.router.post(
            '/verwarmingssysteem',
            checkAuth,
            vereist('waterbeheer', 'schrijven'),
            valideerBody(verwarmingSchema),
            vereistHistorieRecht,
            this.postVerwarming.bind(this),
        );
    }

    private async getVerbruik(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            res.json(await this.service.getVerbruik(req.query.datum as string));
        } catch (err) {
            next(err);
        }
    }

    private async getVorigeVerbruik(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            res.json(await this.service.getVorigeVerbruik(req.query.datum as string));
        } catch (err) {
            next(err);
        }
    }

    private async postVerbruik(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const meta = await this.service.saveVerbruik(
                req.body as VerbruikInput,
                bepaalAuteur(req.session.gebruiker!),
            );
            res.json({ status: 'success', ...meta });
        } catch (err) {
            next(err);
        }
    }

    private async getVerwarming(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            res.json(await this.service.getVerwarming(req.query.datum as string));
        } catch (err) {
            next(err);
        }
    }

    private async postVerwarming(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const meta = await this.service.saveVerwarming(
                req.body as VerwarmingInput,
                bepaalAuteur(req.session.gebruiker!),
            );
            res.json({ status: 'success', ...meta });
        } catch (err) {
            next(err);
        }
    }
}
