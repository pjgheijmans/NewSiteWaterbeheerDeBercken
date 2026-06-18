import { Router, Request, Response, NextFunction } from 'express';
import { checkAuth, vereist, vereistHistorieRecht } from '../middleware/auth';
import { valideerBody } from '../middleware/valideer';
import { rondetaakToggleSchema } from '../validation/schemas';
import { IRondetakenService } from '../services/IRondetakenService';

export class RondetakenController {
    readonly router: Router;

    constructor(private readonly service: IRondetakenService) {
        this.router = Router();
        this.router.get('/',                  checkAuth, vereist('waterbeheer', 'lezen'),     this.getRondetaken.bind(this));
        this.router.post('/:sleutel/voltooi', checkAuth, vereist('waterbeheer', 'schrijven'), valideerBody(rondetaakToggleSchema), vereistHistorieRecht, this.voltooi.bind(this));
        this.router.post('/:sleutel/heropen', checkAuth, vereist('waterbeheer', 'schrijven'), valideerBody(rondetaakToggleSchema), vereistHistorieRecht, this.heropen.bind(this));
    }

    private async getRondetaken(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const datum = (req.query.datum as string) || new Date().toISOString().split('T')[0];
            res.json(await this.service.getRondetaken(datum));
        } catch (err) { next(err); }
    }

    private async voltooi(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { datum } = req.body as { datum: string };
            await this.service.voltooi(String(req.params['sleutel']), datum, req.session.gebruiker!);
            res.json({ status: 'success' });
        } catch (err) { next(err); }
    }

    private async heropen(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { datum } = req.body as { datum: string };
            await this.service.heropen(String(req.params['sleutel']), datum);
            res.json({ status: 'success' });
        } catch (err) { next(err); }
    }
}
