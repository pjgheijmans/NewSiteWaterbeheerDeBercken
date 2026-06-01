import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodType } from 'zod';
import { AppError } from '../errors';

/**
 * Maakt middleware die req.body valideert tegen een Zod-schema.
 * Bij succes wordt req.body vervangen door de geparste waarde; bij falen
 * wordt een AppError(400) met een leesbaar bericht doorgegeven aan next().
 */
export function valideerBody(schema: ZodType): RequestHandler {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const resultaat = schema.safeParse(req.body);
        if (!resultaat.success) {
            const bericht = resultaat.error.issues
                .map(i => {
                    const pad = i.path.join('.');
                    return pad ? `${pad}: ${i.message}` : i.message;
                })
                .join('; ');
            next(new AppError(`Ongeldige invoer — ${bericht}`, 400));
            return;
        }
        req.body = resultaat.data;
        next();
    };
}
