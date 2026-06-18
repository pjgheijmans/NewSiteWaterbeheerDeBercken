import { Router, Request, Response, NextFunction } from 'express';
import { checkAuth, vereist } from '../middleware/auth';
import { ITakenService } from '../services/ITakenService';

export class TakenController {
    readonly router: Router;

    constructor(private readonly service: ITakenService) {
        this.router = Router();
        this.router.get('/', checkAuth, vereist('waterbeheer', 'lezen'), this.getTaken.bind(this));
    }

    private async getTaken(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const datum = (req.query.datum as string) || new Date().toISOString().split('T')[0];
            res.json(await this.service.getTaken(datum));
        } catch (err) { next(err); }
    }
}
