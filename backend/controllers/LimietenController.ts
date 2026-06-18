import { Router, Request, Response, NextFunction } from 'express';
import { checkAuth, vereist } from '../middleware/auth';
import { valideerBody } from '../middleware/valideer';
import { limietSchema } from '../validation/schemas';
import { ILimietenService } from '../services/ILimietenService';
import { LimietInput } from '../types';

export class LimietenController {
    readonly router: Router;

    constructor(private readonly service: ILimietenService) {
        this.router = Router();
        this.router.get('/',         checkAuth, vereist('beheer', 'lezen'),     this.getAll.bind(this));
        this.router.get('/defaults', checkAuth, vereist('beheer', 'lezen'),     this.getDefaults.bind(this));
        this.router.post('/',        checkAuth, vereist('beheer', 'schrijven'), valideerBody(limietSchema), this.save.bind(this));
    }

    private async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try { res.json(await this.service.getAll()); }
        catch (err) { next(err); }
    }

    private getDefaults(_req: Request, res: Response): void {
        res.json(this.service.getDefaults());
    }

    private async save(req: Request, res: Response, next: NextFunction): Promise<void> {
        try { await this.service.save(req.body as LimietInput); res.json({ status: 'success' }); }
        catch (err) { next(err); }
    }
}
