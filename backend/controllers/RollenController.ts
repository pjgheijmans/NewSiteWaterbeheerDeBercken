import { Router, Request, Response, NextFunction } from 'express';
import { checkAuth, vereist } from '../middleware/auth';
import { valideerBody } from '../middleware/valideer';
import { rolCreateSchema, rolUpdateSchema } from '../validation/schemas';
import { IRollenRepository, RolInput } from '../repositories/IRollenRepository';

/** Beheer van rollen en hun rechtenmatrix. Voorbehouden aan het beheer-domein. */
export class RollenController {
    readonly router: Router;

    constructor(private readonly repo: IRollenRepository) {
        this.router = Router();
        this.router.get('/', checkAuth, vereist('beheer', 'lezen'), this.getAll.bind(this));
        this.router.post(
            '/',
            checkAuth,
            vereist('beheer', 'schrijven'),
            valideerBody(rolCreateSchema),
            this.create.bind(this),
        );
        this.router.put(
            '/:id',
            checkAuth,
            vereist('beheer', 'schrijven'),
            valideerBody(rolUpdateSchema),
            this.update.bind(this),
        );
        this.router.delete(
            '/:id',
            checkAuth,
            vereist('beheer', 'schrijven'),
            this.remove.bind(this),
        );
    }

    private async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            res.json(await this.repo.getAll());
        } catch (err) {
            next(err);
        }
    }

    private async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await this.repo.create(req.body.naam as string);
            res.json({ status: 'success' });
        } catch (err) {
            next(err);
        }
    }

    private async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await this.repo.update(String(req.params['id']), req.body as RolInput);
            res.json({ status: 'success' });
        } catch (err) {
            next(err);
        }
    }

    private async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await this.repo.remove(String(req.params['id']));
            res.json({ status: 'success' });
        } catch (err) {
            next(err);
        }
    }
}
