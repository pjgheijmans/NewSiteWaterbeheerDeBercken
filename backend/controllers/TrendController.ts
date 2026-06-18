import { Router, Request, Response, NextFunction } from 'express';
import { checkAuth, vereist } from '../middleware/auth';
import { ITrendService } from '../services/ITrendService';

export class TrendController {
    readonly router: Router;

    constructor(private readonly service: ITrendService) {
        this.router = Router();
        this.router.get('/metingen', checkAuth, vereist('waterbeheer', 'lezen'), this.getMetingen.bind(this));
        this.router.get('/verbruik', checkAuth, vereist('waterbeheer', 'lezen'), this.getVerbruik.bind(this));
    }

    private async getMetingen(req: Request, res: Response, next: NextFunction): Promise<void> {
        try { res.json(await this.service.getMetingenTrend(req.query.van as string, req.query.tot as string)); }
        catch (err) { next(err); }
    }

    private async getVerbruik(req: Request, res: Response, next: NextFunction): Promise<void> {
        try { res.json(await this.service.getVerbruikTrend(req.query.van as string, req.query.tot as string)); }
        catch (err) { next(err); }
    }
}
