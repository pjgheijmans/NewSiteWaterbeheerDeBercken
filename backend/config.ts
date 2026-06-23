/**
 * Bepaal de session-secret voor express-session.
 *
 * - Als `SESSION_SECRET` is gezet, wordt die gebruikt.
 * - In productie (`NODE_ENV=production`) is `SESSION_SECRET` VERPLICHT; ontbreekt
 *   die, dan faalt het opstarten direct (fail fast) i.p.v. stilletjes een onveilige
 *   default te gebruiken.
 * - In dev/test valt het terug op een duidelijk gemarkeerde, onveilige waarde
 *   (met een waarschuwing, behalve onder de testrunner).
 */
export function bepaalSessionSecret(): string {
    const secret = process.env.SESSION_SECRET;
    if (secret && secret.length > 0) return secret;

    if (process.env.NODE_ENV === 'production') {
        throw new Error(
            'SESSION_SECRET ontbreekt: stel de SESSION_SECRET-omgevingsvariabele in ' +
                'voordat de applicatie in productie wordt gestart.',
        );
    }

    if (process.env.NODE_ENV !== 'test') {
        console.warn(
            'WAARSCHUWING: SESSION_SECRET is niet gezet — er wordt een onveilige ' +
                'dev-fallback gebruikt. Zet SESSION_SECRET in productie.',
        );
    }
    return 'dev-onveilig-zwembad-secret';
}
