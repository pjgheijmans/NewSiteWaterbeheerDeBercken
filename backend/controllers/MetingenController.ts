import { Router, Request, Response, NextFunction } from 'express';
import { checkAuth, isWaterbeheerder } from '../middleware/auth';
import { valideerBody } from '../middleware/valideer';
import { metingSchema } from '../validation/schemas';
import { IMetingenService } from '../services/IMetingenService';
import { MetingInput } from '../types';
import { bepaalAuteur } from '../auteur';

export class MetingenController {
    readonly router: Router;

    constructor(private readonly service: IMetingenService) {
        this.router = Router();
        this.router.get('/metingen',              checkAuth, this.getMetingen.bind(this));
        this.router.post('/metingen',             checkAuth, valideerBody(metingSchema), this.postMeting.bind(this));
        this.router.get('/acties',                checkAuth, this.getActies.bind(this));
        this.router.post('/acties/:id/resolve',   checkAuth, this.resolveActie.bind(this));
        this.router.get('/bezoekers',             checkAuth, this.getBezoekers.bind(this));
        this.router.get('/gebonden-chloor',       checkAuth, this.getGebondenChloor.bind(this));
        this.router.post('/acties/:id/unresolve', checkAuth, this.unresolveActie.bind(this));
    }

    private vereistWaterbeheerder(req: Request, res: Response): boolean {
        if (!isWaterbeheerder(req.session.gebruiker!.taak)) {
            res.status(403).json({ error: 'Geen toegang' });
            return false;
        }
        return true;
    }

    private async getMetingen(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistWaterbeheerder(req, res)) return;
        try {
            res.json(await this.service.getMetingen(req.query.datum as string));
        } catch (err) { next(err); }
    }

    private async postMeting(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistWaterbeheerder(req, res)) return;
        try {
            const meta = await this.service.saveMeting(req.body as MetingInput, bepaalAuteur(req.session.gebruiker!));
            res.json({ status: 'success', ...meta });
        } catch (err) { next(err); }
    }

    private async getActies(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistWaterbeheerder(req, res)) return;
        try {
            const datum = (req.query.datum as string) || new Date().toISOString().split('T')[0];
            res.json(await this.service.getActies(datum));
        } catch (err) { next(err); }
    }

    private async resolveActie(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistWaterbeheerder(req, res)) return;
        try {
            await this.service.resolveActie(String(req.params['id']), req.session.gebruiker!);
            res.json({ status: 'success' });
        } catch (err) { next(err); }
    }

    private async getBezoekers(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistWaterbeheerder(req, res)) return;
        try {
            res.json(await this.service.getBezoekers(req.query.datum as string));
        } catch (err) { next(err); }
    }

    private async getGebondenChloor(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistWaterbeheerder(req, res)) return;
        try {
            res.json(await this.service.getGebondenChloor(req.query.datum as string));
        } catch (err) { next(err); }
    }

    private async unresolveActie(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistWaterbeheerder(req, res)) return;
        try {
            await this.service.unresolveActie(String(req.params['id']));
            res.json({ status: 'success' });
        } catch (err) { next(err); }
    }
}
