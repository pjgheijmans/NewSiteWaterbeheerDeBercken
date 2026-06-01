import { Router, Request, Response, NextFunction } from 'express';
import { valideerBody } from '../middleware/valideer';
import { loginSchema } from '../validation/schemas';
import { IAuthService } from '../services/IAuthService';

export class AuthController {
    readonly router: Router;

    constructor(private readonly service: IAuthService) {
        this.router = Router();
        this.router.post('/login',    valideerBody(loginSchema), this.login.bind(this));
        this.router.post('/logout',   this.logout.bind(this));
        this.router.get('/ingelogd',  this.ingelogd.bind(this));
    }

    private async login(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const gebruiker = await this.service.login(req.body.username, req.body.password);
            if (!gebruiker) { res.status(401).json({ error: 'Onjuiste inlognaam of wachtwoord' }); return; }
            req.session.gebruiker = gebruiker;
            res.json({ status: 'success', gebruiker });
        } catch (err) { next(err); }
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
