import { Router, Request, Response } from 'express';
import { checkAuth, isWaterbeheerderOrCoordinator } from '../middleware/auth';
import { ICoordinatorenRepository } from '../repositories/ICoordinatorenRepository';
import { ICoordinatorenLogboekRepository } from '../repositories/ICoordinatorenLogboekRepository';
import { IActiesRepository } from '../repositories/IActiesRepository';
import { AppError } from '../errors';
import { CoordinatorMetingInput, ChecklistInput, DaggegevensInput, Gebruiker } from '../types';

export class CoordinatorenController {
    readonly router: Router;

    constructor(
        private readonly coordRepo: ICoordinatorenRepository,
        private readonly logboekRepo: ICoordinatorenLogboekRepository,
        private readonly actiesRepo: IActiesRepository,
    ) {
        this.router = Router();
        this.router.get('/',                  checkAuth, this.getMetingen.bind(this));
        this.router.post('/',                 checkAuth, this.postMeting.bind(this));
        this.router.get('/checklist',         checkAuth, this.getChecklist.bind(this));
        this.router.post('/checklist',        checkAuth, this.postChecklist.bind(this));
        this.router.get('/daggegevens',       checkAuth, this.getDaggegevens.bind(this));
        this.router.post('/daggegevens',      checkAuth, this.postDaggegevens.bind(this));
        this.router.delete('/',               checkAuth, this.deleteBlok.bind(this));
        this.router.get('/logboek',           checkAuth, this.getLogboek.bind(this));
        this.router.post('/logboek',          checkAuth, this.postLogboek.bind(this));
        this.router.delete('/logboek/:id',    checkAuth, this.deleteLogboek.bind(this));
    }

    private vereistToegang(req: Request, res: Response): boolean {
        if (!isWaterbeheerderOrCoordinator(req.session.gebruiker!.taak)) {
            res.status(403).json({ error: 'Geen toegang' });
            return false;
        }
        return true;
    }

    private stuurFout(res: Response, err: unknown): void {
        const status = err instanceof AppError ? err.status : 500;
        res.status(status).json({ error: (err as Error).message });
    }

    private berekenAuteur(g: Gebruiker): string {
        return [g.voornaam, g.achternaam].filter((n): n is string => !!n).join(' ').trim()
            || g.inlognaam
            || g.gebruikersnaam;
    }

    private async getMetingen(req: Request, res: Response): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        try {
            res.json(await this.coordRepo.getCoordinatoren(req.query.datum as string));
        } catch (err) { this.stuurFout(res, err); }
    }

    private async postMeting(req: Request, res: Response): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        try {
            const body = req.body as CoordinatorMetingInput;
            const bad_id = await this.coordRepo.getBadId(body.bad_naam);
            const auteur = this.berekenAuteur(req.session.gebruiker!);
            await this.coordRepo.saveMeting(bad_id, body, auteur);
            res.json({ status: 'success' });
        } catch (err) { this.stuurFout(res, err); }
    }

    private async getChecklist(req: Request, res: Response): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        try {
            res.json(await this.coordRepo.getChecklist(req.query.datum as string));
        } catch (err) { this.stuurFout(res, err); }
    }

    private async postChecklist(req: Request, res: Response): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        try {
            const body = req.body as ChecklistInput & { datum: string };
            await this.coordRepo.saveChecklist(body.datum, body);
            res.json({ status: 'success' });
        } catch (err) { this.stuurFout(res, err); }
    }

    private async getDaggegevens(req: Request, res: Response): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        try {
            res.json(await this.coordRepo.getDaggegevens(req.query.datum as string));
        } catch (err) { this.stuurFout(res, err); }
    }

    private async postDaggegevens(req: Request, res: Response): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        try {
            const body = req.body as DaggegevensInput & { datum: string };
            await this.coordRepo.saveDaggegevens(body.datum, body);
            // Fire-and-forget: geen transactionele garantie vereist
            void this.actiesRepo.genereerBezoekers(body.datum, body.bezoekers_vandaag ?? null);
            void this.actiesRepo.genereerSpoelbeurt(body.datum);
            res.json({ status: 'success' });
        } catch (err) { this.stuurFout(res, err); }
    }

    private async deleteBlok(req: Request, res: Response): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        const datum    = req.query.datum    as string;
        const tijdstip = req.query.tijdstip as string;
        if (!datum || !tijdstip) {
            res.status(400).json({ error: 'datum en tijdstip zijn verplicht' });
            return;
        }
        try {
            await this.coordRepo.deleteBlok(datum, tijdstip);
            res.json({ status: 'success' });
        } catch (err) { this.stuurFout(res, err); }
    }

    private async getLogboek(req: Request, res: Response): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        try {
            res.json(await this.logboekRepo.getByDatum(req.query.datum as string));
        } catch (err) { this.stuurFout(res, err); }
    }

    private async postLogboek(req: Request, res: Response): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        try {
            const { datum, tijdstip, tekst } = req.body as { datum: string; tijdstip: string; tekst?: string };
            const auteur = this.berekenAuteur(req.session.gebruiker!);
            const row = await this.logboekRepo.save(datum, tijdstip, tekst ?? '', auteur);
            res.json({ status: 'success', id: row?.id ?? null, auteur: row?.auteur ?? auteur });
        } catch (err) { this.stuurFout(res, err); }
    }

    private async deleteLogboek(req: Request, res: Response): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        try {
            await this.logboekRepo.deleteById(String(req.params['id']));
            res.json({ status: 'success' });
        } catch (err) { this.stuurFout(res, err); }
    }
}
