import { Router, Request, Response } from 'express';
import { checkAuth, isWaterbeheerder } from '../middleware/auth';
import { ITrendRepository } from '../repositories/ITrendRepository';

export class TrendController {
    readonly router: Router;

    constructor(private readonly repo: ITrendRepository) {
        this.router = Router();
        this.router.get('/metingen', checkAuth, this.getMetingen.bind(this));
        this.router.get('/verbruik', checkAuth, this.getVerbruik.bind(this));
    }

    private vereistWaterbeheerder(req: Request, res: Response): boolean {
        if (!isWaterbeheerder(req.session.gebruiker!.taak)) {
            res.status(403).json({ error: 'Geen toegang' });
            return false;
        }
        return true;
    }

    private async getMetingen(req: Request, res: Response): Promise<void> {
        if (!this.vereistWaterbeheerder(req, res)) return;
        try { res.json(await this.repo.getMetingenTrend(req.query.van as string, req.query.tot as string)); }
        catch (err) { res.status(500).json({ error: (err as Error).message }); }
    }

    private async getVerbruik(req: Request, res: Response): Promise<void> {
        if (!this.vereistWaterbeheerder(req, res)) return;
        try { res.json(await this.repo.getVerbruikTrend(req.query.van as string, req.query.tot as string)); }
        catch (err) { res.status(500).json({ error: (err as Error).message }); }
    }
}
