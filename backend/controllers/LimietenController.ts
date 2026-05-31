import { Router, Request, Response } from 'express';
import { checkAuth, isAdminOrWaterbeheerder } from '../middleware/auth';
import { ILimietenRepository } from '../repositories/ILimietenRepository';
import { LimietInput } from '../types';

export class LimietenController {
    readonly router: Router;

    constructor(private readonly repo: ILimietenRepository) {
        this.router = Router();
        this.router.get('/',         this.getAll.bind(this));
        this.router.get('/defaults', this.getDefaults.bind(this));
        this.router.post('/', checkAuth, this.save.bind(this));
    }

    private async getAll(_req: Request, res: Response): Promise<void> {
        try { res.json(await this.repo.getAll()); }
        catch (err) { res.status(500).json({ error: (err as Error).message }); }
    }

    private getDefaults(_req: Request, res: Response): void {
        res.json(this.repo.getDefaults());
    }

    private async save(req: Request, res: Response): Promise<void> {
        if (!isAdminOrWaterbeheerder(req.session.gebruiker!.taak)) {
            res.status(403).json({ error: 'Geen toegang' }); return;
        }
        try { await this.repo.save(req.body as LimietInput); res.json({ status: 'success' }); }
        catch (err) { res.status(500).json({ error: (err as Error).message }); }
    }
}
