import { Router, Request, Response, NextFunction } from 'express';
import { checkAuth, vereist } from '../middleware/auth';
import { valideerBody } from '../middleware/valideer';
import { gebruikerSchema, gebruikerUpdateSchema } from '../validation/schemas';
import { IGebruikersService } from '../services/IGebruikersService';
import { GebruikerInput } from '../types';

export class GebruikersController {
    readonly router: Router;

    constructor(private readonly service: IGebruikersService) {
        this.router = Router();
        this.router.get('/', checkAuth, vereist('beheer', 'lezen'), this.getAll.bind(this));
        this.router.post(
            '/',
            checkAuth,
            vereist('beheer', 'schrijven'),
            valideerBody(gebruikerSchema),
            this.create.bind(this),
        );
        this.router.put(
            '/:id',
            checkAuth,
            vereist('beheer', 'schrijven'),
            valideerBody(gebruikerUpdateSchema),
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
            res.json(await this.service.getAll());
        } catch (err) {
            next(err);
        }
    }

    private async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await this.service.create(req.body as GebruikerInput);
            res.json({ status: 'success' });
        } catch (err) {
            next(err);
        }
    }

    private async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await this.service.update(String(req.params['id']), req.body as GebruikerInput);
            res.json({ status: 'success' });
        } catch (err) {
            next(err);
        }
    }

    private async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await this.service.remove(String(req.params['id']));
            res.json({ status: 'success' });
        } catch (err) {
            next(err);
        }
    }
}
