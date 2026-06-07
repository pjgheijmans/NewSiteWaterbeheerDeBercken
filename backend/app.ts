import express, { Express } from 'express';
import path from 'path';
import session from 'express-session';
import { Pool } from 'mysql2/promise';

import { LimietenRepository }   from './repositories/LimietenRepository';
import { GebruikersRepository } from './repositories/GebruikersRepository';
import { DatabaseRepository }   from './repositories/DatabaseRepository';

import { maakAuthRouter }          from './routes/auth';
import { maakGebruikersRouter }    from './routes/gebruikers';
import { maakLimietenRouter }      from './routes/limieten';
import { maakMetingenRouter }      from './routes/metingen';
import { maakCoordinatorenRouter } from './routes/coordinatoren';
import { maakVerbruikRouter }      from './routes/verbruik';
import { maakTrendRouter }         from './routes/trend';
import { maakDatabaseRouter }      from './routes/database';
import { maakLogboekRouter }       from './routes/logboek';
import { maakRondetakenRouter }    from './routes/rondetaken';
import { maakTakenRouter }         from './routes/taken';
import { maakFrontendRouter }      from './routes/frontend';
import { errorHandler }           from './middleware/errorHandler';
import { bepaalSessionSecret }    from './config';

/**
 * Stelt de volledige Express-applicatie samen rond een gegeven connection pool.
 * Bevat geen app.listen() en geen DB-opstartlogica, zodat de app ook in tests
 * (Supertest) gemount kan worden. Het opstarten gebeurt in server.ts.
 */
export function maakApp(pool: Pool): Express {
    const app = express();

    app.use(express.json());
    app.use(session({
        secret: bepaalSessionSecret(),
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 2 * 60 * 60 * 1000 },
    }));

    // DatabaseRepository deelt de pool met de limieten- en gebruikers-repository
    // (nodig voor seedAllDefaults via /api/database/initialiseer).
    const limietenRepo   = new LimietenRepository(pool);
    const gebruikersRepo = new GebruikersRepository(pool);
    const databaseRepo   = new DatabaseRepository(pool, limietenRepo, gebruikersRepo);

    // ── Routes ──────────────────────────────────────────────────────────────────
    app.use('/api',               maakAuthRouter(pool));
    app.use('/api/gebruikers',    maakGebruikersRouter(pool));
    app.use('/api/limieten',      maakLimietenRouter(pool));
    app.use('/api',               maakMetingenRouter(pool));
    app.use('/api/coordinatoren', maakCoordinatorenRouter(pool));
    app.use('/api/verbruik',      maakVerbruikRouter(pool));
    app.use('/api/trend',         maakTrendRouter(pool));
    app.use('/api/database',      maakDatabaseRouter(databaseRepo));
    app.use('/api/logboek',       maakLogboekRouter(pool));
    app.use('/api/rondetaken',    maakRondetakenRouter(pool));
    app.use('/api/taken',         maakTakenRouter(pool));

    // Frontend: HTML-partials samenstellen (vóór static zodat / hier wordt afgehandeld)
    app.use('/', maakFrontendRouter());

    // process.cwd() werkt zowel in dev (ts-node) als in prod (node dist/...)
    // Serveert ook frontend/images/ op /images/...
    app.use(express.static(path.join(process.cwd(), 'frontend')));

    // ── Centrale foutafhandeling (na alle routes) ─────────────────────────────────
    app.use(errorHandler);

    return app;
}
