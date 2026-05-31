import { Router, Request, Response } from 'express';
import { IGebruikersRepository } from '../repositories/IGebruikersRepository';

export class AuthController {
    readonly router: Router;

    constructor(private readonly gebruikersRepo: IGebruikersRepository) {
        this.router = Router();
        this.router.post('/login',    this.login.bind(this));
        this.router.post('/logout',   this.logout.bind(this));
        this.router.get('/ingelogd',  this.ingelogd.bind(this));
    }

    private async login(req: Request, res: Response): Promise<void> {
        try {
            const gebruiker = await this.gebruikersRepo.findByLogin(req.body.username, req.body.password);
            if (!gebruiker) { res.status(401).json({ error: 'Onjuiste inlognaam of wachtwoord' }); return; }
            req.session.gebruiker = gebruiker;
            res.json({ status: 'success', gebruiker });
        } catch (err) { console.error(err); res.status(500).json({ error: (err as Error).message }); }
    }

    private logout(req: Request, res: Response): void {
        req.session.destroy(() => {});
        res.json({ status: 'success' });
    }

    private ingelogd(req: Request, res: Response): void {
        if (req.session?.gebruiker)
            res.json({ ingelogd: true, gebruiker: req.session.gebruiker });
        else
            res.json({ ingelogd: false });
    }
}
