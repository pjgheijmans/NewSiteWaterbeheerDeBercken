import { Router, Request, Response, NextFunction } from 'express';
import { checkAuth, vereist } from '../middleware/auth';
import { valideerBody } from '../middleware/valideer';
import { configuratieUpdateSchema } from '../validation/schemas';
import { IConfiguratieService } from '../services/IConfiguratieService';

/** Beheer van de generieke configuratie. Voorbehouden aan het beheer-domein. */
export class ConfiguratieController {
    readonly router: Router;

    constructor(private readonly service: IConfiguratieService) {
        this.router = Router();
        this.router.get('/', checkAuth, vereist('beheer', 'lezen'), this.getAll.bind(this));
        this.router.put(
            '/:sleutel',
            checkAuth,
            vereist('beheer', 'schrijven'),
            valideerBody(configuratieUpdateSchema),
            this.update.bind(this),
        );
    }

    private async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            res.json(await this.service.getAll());
        } catch (err) {
            next(err);
        }
    }

    private async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await this.service.update(
                String(req.params.sleutel),
                (req.body as { waarde: string }).waarde,
            );
            res.json({ status: 'success' });
        } catch (err) {
            next(err);
        }
    }
}
