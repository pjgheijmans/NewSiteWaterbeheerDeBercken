import { Router, Request, Response, NextFunction } from 'express';
import { checkAuth, isWaterbeheerder } from '../middleware/auth';
import { IVerbruikRepository } from '../repositories/IVerbruikRepository';
import { IActiesRepository } from '../repositories/IActiesRepository';
import { VerbruikInput, VerwarmingInput } from '../types';

export class VerbruikController {
    readonly router: Router;

    constructor(
        private readonly verbruikRepo: IVerbruikRepository,
        private readonly actiesRepo: IActiesRepository,
    ) {
        this.router = Router();
        this.router.get('/diep-ondiep',        checkAuth, this.getVerbruik.bind(this));
        this.router.get('/diep-ondiep/vorige', checkAuth, this.getVorigeVerbruik.bind(this));
        this.router.post('/diep-ondiep',       checkAuth, this.postVerbruik.bind(this));
        this.router.get('/verwarmingssysteem',  checkAuth, this.getVerwarming.bind(this));
        this.router.post('/verwarmingssysteem', checkAuth, this.postVerwarming.bind(this));
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
            res.json(await this.verbruikRepo.getVerbruik(req.query.datum as string));
        } catch (err) { next(err); }
    }

    private async getVorigeVerbruik(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistWaterbeheerder(req, res)) return;
        try {
            res.json(await this.verbruikRepo.getVorigeVerbruik(req.query.datum as string));
        } catch (err) { next(err); }
    }

    private async postVerbruik(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistWaterbeheerder(req, res)) return;
        try {
            const body = req.body as VerbruikInput;
            await this.verbruikRepo.saveVerbruik(body);
            await this.actiesRepo.genereerVerbruik(body.datum, body);
            res.json({ status: 'success' });
        } catch (err) { next(err); }
    }

    private async getVerwarming(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistWaterbeheerder(req, res)) return;
        try {
            res.json(await this.verbruikRepo.getVerwarming(req.query.datum as string));
        } catch (err) { next(err); }
    }

    private async postVerwarming(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistWaterbeheerder(req, res)) return;
        try {
            await this.verbruikRepo.saveVerwarming(req.body as VerwarmingInput);
            res.json({ status: 'success' });
        } catch (err) { next(err); }
    }
}
