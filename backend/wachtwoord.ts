import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

/**
 * Wachtwoord-hashing met de ingebouwde Node-crypto scrypt-KDF (geen externe
 * dependency, werkt overal incl. Alpine). Opslagformaat:
 *   scrypt$<N>$<salt-base64>$<hash-base64>
 *
 * `verifieerWachtwoord` accepteert ook legacy plaintext-wachtwoorden (van vóór
 * het hashen) zodat bestaande accounts blijven werken; de repository hasht ze
 * bij de eerstvolgende login en via een opstartmigratie.
 */
const PREFIX = 'scrypt';
const SCRYPT_N = 16384; // CPU/geheugen-kostenfactor (2^14)
const KEYLEN = 64;

/** Hash een platte-tekst wachtwoord met een willekeurige salt. */
export function hashWachtwoord(plain: string): string {
    const salt = randomBytes(16);
    const hash = scryptSync(plain, salt, KEYLEN, { N: SCRYPT_N });
    return `${PREFIX}$${SCRYPT_N}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

/** True als de opgeslagen waarde al een scrypt-hash is (en dus geen plaintext). */
export function isGehasht(stored: string | null | undefined): boolean {
    return typeof stored === 'string' && stored.startsWith(`${PREFIX}$`);
}

/**
 * Verifieer een platte-tekst wachtwoord tegen de opgeslagen waarde.
 * Voor gehashte waarden via scrypt + timing-safe vergelijking; voor legacy
 * plaintext via directe vergelijking.
 */
export function verifieerWachtwoord(plain: string, stored: string | null | undefined): boolean {
    if (!stored) return false;
    if (!isGehasht(stored)) {
        return plain === stored; // legacy plaintext
    }
    const delen = stored.split('$');
    if (delen.length !== 4) return false;
    const N = parseInt(delen[1], 10) || SCRYPT_N;
    const salt = Buffer.from(delen[2], 'base64');
    const verwacht = Buffer.from(delen[3], 'base64');
    const berekend = scryptSync(plain, salt, verwacht.length, { N });
    return verwacht.length === berekend.length && timingSafeEqual(verwacht, berekend);
}
