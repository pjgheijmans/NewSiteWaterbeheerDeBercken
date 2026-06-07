import { Router, Request, Response, NextFunction } from 'express';
import { checkAuth, isWaterbeheerder } from '../middleware/auth';
import { ITakenService } from '../services/ITakenService';

export class TakenController {
    readonly router: Router;

    constructor(private readonly service: ITakenService) {
        this.router = Router();
        this.router.get('/', checkAuth, this.getTaken.bind(this));
    }

    private vereistWaterbeheerder(req: Request, res: Response): boolean {
        if (!isWaterbeheerder(req.session.gebruiker!.taak)) {
            res.status(403).json({ error: 'Geen toegang' });
            return false;
        }
        return true;
    }

    private async getTaken(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistWaterbeheerder(req, res)) return;
        try {
            const datum = (req.query.datum as string) || new Date().toISOString().split('T')[0];
            res.json(await this.service.getTaken(datum));
        } catch (err) { next(err); }
    }
}
