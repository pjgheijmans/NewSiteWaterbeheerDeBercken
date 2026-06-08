import { Router, Request, Response, NextFunction } from 'express';
import { checkAuth, isWaterbeheerderOrCoordinator } from '../middleware/auth';
import { valideerBody } from '../middleware/valideer';
import { coordinatorMetingSchema, checklistSchema, daggegevensSchema, logboekSchema } from '../validation/schemas';
import { ICoordinatorenService } from '../services/ICoordinatorenService';
import { CoordinatorMetingInput, ChecklistInput, DaggegevensInput } from '../types';

export class CoordinatorenController {
    readonly router: Router;

    constructor(private readonly service: ICoordinatorenService) {
        this.router = Router();
        this.router.get('/',                  checkAuth, this.getMetingen.bind(this));
        this.router.post('/',                 checkAuth, valideerBody(coordinatorMetingSchema), this.postMeting.bind(this));
        this.router.get('/checklist',         checkAuth, this.getChecklist.bind(this));
        this.router.post('/checklist',        checkAuth, valideerBody(checklistSchema), this.postChecklist.bind(this));
        this.router.get('/daggegevens',       checkAuth, this.getDaggegevens.bind(this));
        this.router.post('/daggegevens',      checkAuth, valideerBody(daggegevensSchema), this.postDaggegevens.bind(this));
        this.router.delete('/',               checkAuth, this.deleteBlok.bind(this));
        this.router.get('/logboek',           checkAuth, this.getLogboek.bind(this));
        this.router.post('/logboek',          checkAuth, valideerBody(logboekSchema), this.postLogboek.bind(this));
        this.router.delete('/logboek/:id',    checkAuth, this.deleteLogboek.bind(this));
    }

    private vereistToegang(req: Request, res: Response): boolean {
        if (!isWaterbeheerderOrCoordinator(req.session.gebruiker!.taak)) {
            res.status(403).json({ error: 'Geen toegang' });
            return false;
        }
        return true;
    }

    private async getMetingen(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        try {
            res.json(await this.service.getCoordinatoren(req.query.datum as string));
        } catch (err) { next(err); }
    }

    private async postMeting(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        try {
            await this.service.saveMeting(req.body as CoordinatorMetingInput, req.session.gebruiker!);
            res.json({ status: 'success' });
        } catch (err) { next(err); }
    }

    private async getChecklist(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        try {
            res.json(await this.service.getChecklist(req.query.datum as string));
        } catch (err) { next(err); }
    }

    private async postChecklist(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        try {
            const body = req.body as ChecklistInput & { datum: string };
            await this.service.saveChecklist(body.datum, body, req.session.gebruiker!);
            res.json({ status: 'success' });
        } catch (err) { next(err); }
    }

    private async getDaggegevens(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        try {
            res.json(await this.service.getDaggegevens(req.query.datum as string));
        } catch (err) { next(err); }
    }

    private async postDaggegevens(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        try {
            const body = req.body as DaggegevensInput & { datum: string };
            await this.service.saveDaggegevens(body.datum, body, req.session.gebruiker!);
            res.json({ status: 'success' });
        } catch (err) { next(err); }
    }

    private async deleteBlok(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        const datum    = req.query.datum    as string;
        const tijdstip = req.query.tijdstip as string;
        if (!datum || !tijdstip) {
            res.status(400).json({ error: 'datum en tijdstip zijn verplicht' });
            return;
        }
        try {
            await this.service.deleteBlok(datum, tijdstip);
            res.json({ status: 'success' });
        } catch (err) { next(err); }
    }

    private async getLogboek(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        try {
            res.json(await this.service.getLogboek(req.query.datum as string));
        } catch (err) { next(err); }
    }

    private async postLogboek(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        try {
            const { datum, tijdstip, tekst } = req.body as { datum: string; tijdstip: string; tekst?: string };
            const resultaat = await this.service.saveLogboek(datum, tijdstip, tekst ?? '', req.session.gebruiker!);
            res.json({ status: 'success', id: resultaat.id, auteur: resultaat.auteur });
        } catch (err) { next(err); }
    }

    private async deleteLogboek(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        try {
            await this.service.deleteLogboek(String(req.params['id']));
            res.json({ status: 'success' });
        } catch (err) { next(err); }
    }
}
