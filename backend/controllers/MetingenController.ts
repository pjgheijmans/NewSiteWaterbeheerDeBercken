import { Router, Request, Response } from 'express';
import { checkAuth, isWaterbeheerder } from '../middleware/auth';
import { IMetingenRepository } from '../repositories/IMetingenRepository';
import { IActiesRepository } from '../repositories/IActiesRepository';
import { IDaggegevensProvider } from '../repositories/IDaggegevensProvider';
import { AppError } from '../errors';
import { MetingInput } from '../types';

export class MetingenController {
    readonly router: Router;

    constructor(
        private readonly metingenRepo: IMetingenRepository,
        private readonly actiesRepo: IActiesRepository,
        private readonly daggegevensProvider: IDaggegevensProvider,
    ) {
        this.router = Router();
        this.router.get('/metingen',              checkAuth, this.getMetingen.bind(this));
        this.router.post('/metingen',             checkAuth, this.postMeting.bind(this));
        this.router.get('/acties',                checkAuth, this.getActies.bind(this));
        this.router.post('/acties/:id/resolve',   checkAuth, this.resolveActie.bind(this));
        this.router.get('/bezoekers',             checkAuth, this.getBezoekers.bind(this));
        this.router.post('/acties/:id/unresolve', checkAuth, this.unresolveActie.bind(this));
    }

    private vereistWaterbeheerder(req: Request, res: Response): boolean {
        if (!isWaterbeheerder(req.session.gebruiker!.taak)) {
            res.status(403).json({ error: 'Geen toegang' });
            return false;
        }
        return true;
    }

    private stuurFout(res: Response, err: unknown): void {
        const status = err instanceof AppError ? err.status : 500;
        res.status(status).json({ error: (err as Error).message });
    }

    private async getMetingen(req: Request, res: Response): Promise<void> {
        if (!this.vereistWaterbeheerder(req, res)) return;
        try {
            res.json(await this.metingenRepo.getMetingen(req.query.datum as string));
        } catch (err) { this.stuurFout(res, err); }
    }

    private async postMeting(req: Request, res: Response): Promise<void> {
        if (!this.vereistWaterbeheerder(req, res)) return;
        try {
            const body = req.body as MetingInput;
            const bad_id = await this.metingenRepo.getBadId(body.bad_naam);

            if (body.bad_naam === 'Peuterbad') {
                await this.metingenRepo.savePeuterbadMeting(bad_id, body);
            } else {
                await this.metingenRepo.saveGrootBadMeting(bad_id, body);
            }
            await this.actiesRepo.genereer(bad_id, body.datum, body.bad_naam, body);
            res.json({ status: 'success' });
        } catch (err) { this.stuurFout(res, err); }
    }

    private async getActies(req: Request, res: Response): Promise<void> {
        if (!this.vereistWaterbeheerder(req, res)) return;
        try {
            const datum = (req.query.datum as string) || new Date().toISOString().split('T')[0];
            res.json(await this.actiesRepo.getActies(datum));
        } catch (err) { this.stuurFout(res, err); }
    }

    private async resolveActie(req: Request, res: Response): Promise<void> {
        if (!this.vereistWaterbeheerder(req, res)) return;
        try {
            const g = req.session.gebruiker!;
            const naam: string =
                [g.voornaam, g.achternaam].filter((n): n is string => !!n).join(' ').trim()
                || g.inlognaam
                || g.gebruikersnaam;
            await this.actiesRepo.resolve(String(req.params['id']), naam);
            res.json({ status: 'success' });
        } catch (err) { this.stuurFout(res, err); }
    }

    private async getBezoekers(req: Request, res: Response): Promise<void> {
        if (!this.vereistWaterbeheerder(req, res)) return;
        try {
            const datum = req.query.datum as string;
            const dag = await this.daggegevensProvider.getDaggegevens(datum);
            // Fire-and-forget: geen transactionele garantie vereist
            void this.actiesRepo.genereerBezoekers(datum, dag.bezoekers_vandaag ?? null);
            const totalen = await this.actiesRepo.genereerSpoelbeurt(datum);
            res.json({
                bezoekers_vandaag:       dag.bezoekers_vandaag  ?? null,
                bezoekers_totaal_diep:   totalen.diep           ?? null,
                bezoekers_totaal_ondiep: totalen.ondiep         ?? null,
            });
        } catch (err) { this.stuurFout(res, err); }
    }

    private async unresolveActie(req: Request, res: Response): Promise<void> {
        if (!this.vereistWaterbeheerder(req, res)) return;
        try {
            await this.actiesRepo.unresolve(String(req.params['id']));
            res.json({ status: 'success' });
        } catch (err) { this.stuurFout(res, err); }
    }
}
