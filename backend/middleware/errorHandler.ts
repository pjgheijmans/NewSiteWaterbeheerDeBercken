import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';

/**
 * Centrale Express-foutafhandeling — na alle routes mounten.
 * Vangt alle fouten op die via next(err) worden doorgegeven.
 * Logt server-fouten (5xx); stille client-fouten (4xx).
 */
export function errorHandler(
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void {
    const status  = err instanceof AppError ? err.status : 500;
    const message = err instanceof Error   ? err.message : 'Onbekende fout';
    if (status >= 500) console.error(err);
    res.status(status).json({ error: message });
}
