import fs from 'fs';
import path from 'path';

/**
 * Versie-informatie van de applicatie.
 *
 * - `versie` is de single source of truth uit package.json (de code-versie,
 *   niet de data — die hoort niet in de database).
 * - `commit` is de git-commit waarmee deze build is gemaakt; wordt via de
 *   build-arg/omgevingsvariabele `GIT_COMMIT` ingespoten (zie Dockerfile).
 *   Ontbreekt die, dan valt het terug op 'onbekend'.
 *
 * Beide waarden worden één keer bij het opstarten bepaald en daarna gecachet.
 */
export interface VersieInfo {
    versie: string;
    commit: string;
}

function leesPackageVersie(): string {
    try {
        // process.cwd() werkt zowel in dev (ts-node) als in prod (node dist/...).
        const pkgPad = path.join(process.cwd(), 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPad, 'utf8')) as { version?: string };
        return pkg.version || 'onbekend';
    } catch {
        return 'onbekend';
    }
}

const versieInfo: VersieInfo = {
    versie: leesPackageVersie(),
    commit: process.env.GIT_COMMIT || 'onbekend',
};

/** Geeft de (gecachete) versie-informatie van de applicatie terug. */
export function bepaalVersie(): VersieInfo {
    return versieInfo;
}
