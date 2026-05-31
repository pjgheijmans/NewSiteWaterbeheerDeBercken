import fs from 'fs';
import path from 'path';
import { Router, Request, Response } from 'express';

const ORDER = [
    'head', 'login', 'dashboard-open', 'nav',
    'dagstaat', 'limieten', 'gebruikers', 'database', 'trendanalyse', 'footer',
];

const JS_FILES = [
    'state', 'api', 'ui', 'limieten', 'auth',
    'metingen', 'verbruik', 'opslaan', 'logboek',
    'gebruikers', 'database', 'nav', 'trend', 'app',
];

export class FrontendController {
    readonly router: Router;
    private readonly partialsDir: string;

    constructor() {
        // process.cwd() werkt zowel in dev (ts-node) als in prod (node dist/...)
        this.partialsDir = path.join(process.cwd(), 'frontend', 'partials');
        this.router = Router();
        this.router.get('/', this.servePage.bind(this));
    }

    private readPartial(name: string): string {
        return fs.readFileSync(path.join(this.partialsDir, name + '.html'), 'utf8');
    }

    private servePage(_req: Request, res: Response): void {
        const scripts = JS_FILES.map(f => `<script src="/js/${f}.js"></script>`).join('\n    ');
        const body    = ORDER.map(n => this.readPartial(n)).join('\n');
        const page    = `${body}\n    ${scripts}\n</body>\n</html>`;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(page);
    }
}
