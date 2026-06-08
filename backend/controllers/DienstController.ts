import { Router, Request, Response, NextFunction } from 'express';
import { checkAuth, isAdminOrWaterbeheerder } from '../middleware/auth';
import { valideerBody } from '../middleware/valideer';
import { dienstSchema } from '../validation/schemas';
import { IDienstService } from '../services/IDienstService';
import { WaterbeheerDienstInput } from '../types';

export class DienstController {
    readonly router: Router;

    constructor(private readonly service: IDienstService) {
        this.router = Router();
        this.router.get('/',                checkAuth, this.getDienst.bind(this));
        this.router.get('/waterbeheerders', checkAuth, this.getWaterbeheerders.bind(this));
        this.router.post('/', checkAuth, valideerBody(dienstSchema), this.save.bind(this));
    }

    private async getDienst(req: Request, res: Response, next: NextFunction): Promise<void> {
        try { res.json(await this.service.getDienst(req.query.datum as string)); }
        catch (err) { next(err); }
    }

    private async getWaterbeheerders(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try { res.json(await this.service.getWaterbeheerders()); }
        catch (err) { next(err); }
    }

    private async save(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!isAdminOrWaterbeheerder(req.session.gebruiker!.taak)) {
            res.status(403).json({ error: 'Geen toegang' }); return;
        }
        try { await this.service.saveDienst(req.body as WaterbeheerDienstInput); res.json({ status: 'success' }); }
        catch (err) { next(err); }
    }
}
