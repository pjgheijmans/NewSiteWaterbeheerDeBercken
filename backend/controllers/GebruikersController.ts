import { Router, Request, Response } from 'express';
import { checkAuth, isAdminOrWaterbeheerder } from '../middleware/auth';
import { IGebruikersRepository } from '../repositories/IGebruikersRepository';
import { GebruikerInput } from '../types';

export class GebruikersController {
    readonly router: Router;

    constructor(private readonly repo: IGebruikersRepository) {
        this.router = Router();
        this.router.get('/',     checkAuth, this.getAll.bind(this));
        this.router.post('/',    checkAuth, this.create.bind(this));
        this.router.put('/:id',  checkAuth, this.update.bind(this));
        this.router.delete('/:id', checkAuth, this.remove.bind(this));
    }

    private vereistToegang(req: Request, res: Response): boolean {
        if (!isAdminOrWaterbeheerder(req.session.gebruiker!.taak)) {
            res.status(403).json({ error: 'Geen toegang' });
            return false;
        }
        return true;
    }

    private async getAll(req: Request, res: Response): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        try { res.json(await this.repo.getAll()); }
        catch (err) { res.status(500).json({ error: (err as Error).message }); }
    }

    private async create(req: Request, res: Response): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        try { await this.repo.create(req.body as GebruikerInput); res.json({ status: 'success' }); }
        catch (err) { res.status(500).json({ error: (err as Error).message }); }
    }

    private async update(req: Request, res: Response): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        try { await this.repo.update(String(req.params['id']), req.body as GebruikerInput); res.json({ status: 'success' }); }
        catch (err) { res.status(500).json({ error: (err as Error).message }); }
    }

    private async remove(req: Request, res: Response): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        try { await this.repo.remove(String(req.params['id'])); res.json({ status: 'success' }); }
        catch (err) { res.status(500).json({ error: (err as Error).message }); }
    }
}
