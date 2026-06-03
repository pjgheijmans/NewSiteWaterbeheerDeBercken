import { Router, Request, Response, NextFunction } from 'express';
import { checkAuth, isAdmin } from '../middleware/auth';
import { valideerBody } from '../middleware/valideer';
import { limietSchema } from '../validation/schemas';
import { ILimietenService } from '../services/ILimietenService';
import { LimietInput } from '../types';

export class LimietenController {
    readonly router: Router;

    constructor(private readonly service: ILimietenService) {
        this.router = Router();
        this.router.get('/',         checkAuth, this.getAll.bind(this));
        this.router.get('/defaults', checkAuth, this.getDefaults.bind(this));
        this.router.post('/', checkAuth, valideerBody(limietSchema), this.save.bind(this));
    }

    private async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try { res.json(await this.service.getAll()); }
        catch (err) { next(err); }
    }

    private getDefaults(_req: Request, res: Response): void {
        res.json(this.service.getDefaults());
    }

    private async save(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!isAdmin(req.session.gebruiker!.taak)) {
            res.status(403).json({ error: 'Geen toegang' }); return;
        }
        try { await this.service.save(req.body as LimietInput); res.json({ status: 'success' }); }
        catch (err) { next(err); }
    }
}
