import { Router, Request, Response } from 'express';
import { checkAuth, isWaterbeheerder } from '../middleware/auth';
import { ILogboekRepository } from '../repositories/ILogboekRepository';
import { Gebruiker } from '../types';

export class LogboekController {
    readonly router: Router;

    constructor(private readonly repo: ILogboekRepository) {
        this.router = Router();
        this.router.get('/',      checkAuth, this.getByDatum.bind(this));
        this.router.post('/',     checkAuth, this.save.bind(this));
        this.router.delete('/:id', checkAuth, this.deleteById.bind(this));
    }

    private vereistWaterbeheerder(req: Request, res: Response): boolean {
        if (!isWaterbeheerder(req.session.gebruiker!.taak)) {
            res.status(403).json({ error: 'Geen toegang' });
            return false;
        }
        return true;
    }

    private berekenAuteur(g: Gebruiker): string {
        return [g.voornaam, g.achternaam].filter((n): n is string => !!n).join(' ').trim()
            || g.inlognaam
            || g.gebruikersnaam;
    }

    private async getByDatum(req: Request, res: Response): Promise<void> {
        if (!this.vereistWaterbeheerder(req, res)) return;
        try { res.json(await this.repo.getByDatum(req.query.datum as string)); }
        catch (err) { res.status(500).json({ error: (err as Error).message }); }
    }

    private async save(req: Request, res: Response): Promise<void> {
        if (!this.vereistWaterbeheerder(req, res)) return;
        try {
            const { datum, tijdstip, tekst } = req.body as { datum: string; tijdstip: string; tekst?: string };
            const auteur = this.berekenAuteur(req.session.gebruiker!);
            const row = await this.repo.save(datum, tijdstip, tekst ?? '', auteur);
            res.json({ status: 'success', id: row?.id ?? null, auteur: row?.auteur ?? auteur });
        } catch (err) { res.status(500).json({ error: (err as Error).message }); }
    }

    private async deleteById(req: Request, res: Response): Promise<void> {
        if (!this.vereistWaterbeheerder(req, res)) return;
        try { await this.repo.deleteById(String(req.params['id'])); res.json({ status: 'success' }); }
        catch (err) { res.status(500).json({ error: (err as Error).message }); }
    }
}
