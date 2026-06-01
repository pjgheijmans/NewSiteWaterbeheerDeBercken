import { Router, Request, Response, NextFunction } from 'express';
import { checkAuth, isAdminOrWaterbeheerder } from '../middleware/auth';
import { valideerBody } from '../middleware/valideer';
import { gebruikerSchema } from '../validation/schemas';
import { IGebruikersService } from '../services/IGebruikersService';
import { GebruikerInput } from '../types';

export class GebruikersController {
    readonly router: Router;

    constructor(private readonly service: IGebruikersService) {
        this.router = Router();
        this.router.get('/',       checkAuth, this.getAll.bind(this));
        this.router.post('/',      checkAuth, valideerBody(gebruikerSchema), this.create.bind(this));
        this.router.put('/:id',    checkAuth, valideerBody(gebruikerSchema), this.update.bind(this));
        this.router.delete('/:id', checkAuth, this.remove.bind(this));
    }

    private vereistToegang(req: Request, res: Response): boolean {
        if (!isAdminOrWaterbeheerder(req.session.gebruiker!.taak)) {
            res.status(403).json({ error: 'Geen toegang' });
            return false;
        }
        return true;
    }

    private async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        try { res.json(await this.service.getAll()); }
        catch (err) { next(err); }
    }

    private async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        try { await this.service.create(req.body as GebruikerInput); res.json({ status: 'success' }); }
        catch (err) { next(err); }
    }

    private async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        try { await this.service.update(String(req.params['id']), req.body as GebruikerInput); res.json({ status: 'success' }); }
        catch (err) { next(err); }
    }

    private async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        try { await this.service.remove(String(req.params['id'])); res.json({ status: 'success' }); }
        catch (err) { next(err); }
    }
}
