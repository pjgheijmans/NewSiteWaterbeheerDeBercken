import { Router, Request, Response, NextFunction } from 'express';
import { checkAuth, isWaterbeheerder } from '../middleware/auth';
import { valideerBody } from '../middleware/valideer';
import { verbruikSchema, verwarmingSchema } from '../validation/schemas';
import { IVerbruikService } from '../services/IVerbruikService';
import { VerbruikInput, VerwarmingInput } from '../types';

export class VerbruikController {
    readonly router: Router;

    constructor(private readonly service: IVerbruikService) {
        this.router = Router();
        this.router.get('/diep-ondiep',        checkAuth, this.getVerbruik.bind(this));
        this.router.get('/diep-ondiep/vorige', checkAuth, this.getVorigeVerbruik.bind(this));
        this.router.post('/diep-ondiep',       checkAuth, valideerBody(verbruikSchema), this.postVerbruik.bind(this));
        this.router.get('/verwarmingssysteem',  checkAuth, this.getVerwarming.bind(this));
        this.router.post('/verwarmingssysteem', checkAuth, valideerBody(verwarmingSchema), this.postVerwarming.bind(this));
    }

    private vereistWaterbeheerder(req: Request, res: Response): boolean {
        if (!isWaterbeheerder(req.session.gebruiker!.taak)) {
            res.status(403).json({ error: 'Geen toegang' });
            return false;
        }
        return true;
    }

    private async getVerbruik(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistWaterbeheerder(req, res)) return;
        try {
            res.json(await this.service.getVerbruik(req.query.datum as string));
        } catch (err) { next(err); }
    }

    private async getVorigeVerbruik(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistWaterbeheerder(req, res)) return;
        try {
            res.json(await this.service.getVorigeVerbruik(req.query.datum as string));
        } catch (err) { next(err); }
    }

    private async postVerbruik(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistWaterbeheerder(req, res)) return;
        try {
            await this.service.saveVerbruik(req.body as VerbruikInput);
            res.json({ status: 'success' });
        } catch (err) { next(err); }
    }

    private async getVerwarming(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistWaterbeheerder(req, res)) return;
        try {
            res.json(await this.service.getVerwarming(req.query.datum as string));
        } catch (err) { next(err); }
    }

    private async postVerwarming(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistWaterbeheerder(req, res)) return;
        try {
            await this.service.saveVerwarming(req.body as VerwarmingInput);
            res.json({ status: 'success' });
        } catch (err) { next(err); }
    }
}
