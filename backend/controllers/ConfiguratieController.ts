import { Router, Request, Response, NextFunction } from 'express';
import { checkAuth, isAdmin } from '../middleware/auth';
import { valideerBody } from '../middleware/valideer';
import { configuratieUpdateSchema } from '../validation/schemas';
import { IConfiguratieService } from '../services/IConfiguratieService';

/** Beheer van de generieke configuratie. Lezen mag elke ingelogde gebruiker; wijzigen alleen Administrator. */
export class ConfiguratieController {
    readonly router: Router;

    constructor(private readonly service: IConfiguratieService) {
        this.router = Router();
        this.router.get('/', checkAuth, this.getAll.bind(this));
        this.router.put('/:sleutel', checkAuth, valideerBody(configuratieUpdateSchema), this.update.bind(this));
    }

    private async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try { res.json(await this.service.getAll()); }
        catch (err) { next(err); }
    }

    private async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!isAdmin(req.session.gebruiker!.taak)) {
            res.status(403).json({ error: 'Geen toegang' }); return;
        }
        try {
            await this.service.update(String(req.params.sleutel), (req.body as { waarde: string }).waarde);
            res.json({ status: 'success' });
        } catch (err) { next(err); }
    }
}
