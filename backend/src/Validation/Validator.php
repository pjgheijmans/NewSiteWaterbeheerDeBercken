<?php

declare(strict_types=1);

namespace Zwembad\Validation;

use Zwembad\Errors\AppError;

/**
 * Invoervalidatie — het PHP-equivalent van de Zod-schema's
 * (backend/validation/schemas.ts) + de valideerBody-middleware.
 *
 * Bij ongeldige invoer gooit elke methode een AppError(400) met een bericht in
 * hetzelfde formaat als de Node-backend ("Ongeldige invoer — veld: reden; ..."),
 * zodat de frontend dezelfde foutmelding toont.
 */
final class Validator
{
    private const NIVEAUS = ['geen', 'lezen', 'schrijven'];
    private const DOMEINEN = ['beheer', 'waterbeheer', 'coordinator'];

    /** Harde limiet op de lengte van een logboekaantekening (= maxlength in logboek.js). */
    public const LOGBOEK_MAX_TEKEN = 500;

    /** loginSchema: username en password verplicht (min. 1 teken). */
    public static function login(array $body): array
    {
        $fouten = [];
        $username = self::tekst($body, 'username');
        $password = self::tekst($body, 'password');
        if ($username === '') {
            $fouten[] = 'username: is verplicht';
        }
        if ($password === '') {
            $fouten[] = 'password: is verplicht';
        }
        self::werp($fouten);

        return ['username' => $username, 'password' => $password];
    }

    /**
     * gebruikerSchema / gebruikerUpdateSchema. inlognaam verplicht; bij $nieuw=true
     * is wachtwoord verplicht, bij update mag het leeg blijven (= ongewijzigd).
     */
    public static function gebruiker(array $body, bool $nieuw): array
    {
        $fouten = [];
        $inlognaam = self::tekst($body, 'inlognaam');
        $wachtwoord = isset($body['wachtwoord']) && is_string($body['wachtwoord']) ? $body['wachtwoord'] : '';
        if ($inlognaam === '') {
            $fouten[] = 'inlognaam: is verplicht';
        }
        if ($nieuw && $wachtwoord === '') {
            $fouten[] = 'wachtwoord: is verplicht';
        }
        $rolIds = self::intArray($body['rol_ids'] ?? null, 'rol_ids', $fouten);
        self::werp($fouten);

        return [
            'voornaam' => self::tekst($body, 'voornaam'),
            'achternaam' => self::tekst($body, 'achternaam'),
            'inlognaam' => $inlognaam,
            'wachtwoord' => $wachtwoord,
            'rol_ids' => $rolIds,
        ];
    }

    /** rolCreateSchema: naam verplicht. */
    public static function rolCreate(array $body): array
    {
        $naam = self::tekst($body, 'naam');
        self::werp($naam === '' ? ['naam: is verplicht'] : []);

        return ['naam' => $naam];
    }

    /** rolUpdateSchema: naam, mag_historie_bewerken (bool) en de rechtenmatrix. */
    public static function rolUpdate(array $body): array
    {
        $fouten = [];
        $naam = self::tekst($body, 'naam');
        if ($naam === '') {
            $fouten[] = 'naam: is verplicht';
        }
        if (!isset($body['mag_historie_bewerken']) || !is_bool($body['mag_historie_bewerken'])) {
            $fouten[] = 'mag_historie_bewerken: is verplicht';
        }
        $rechtenIn = isset($body['rechten']) && is_array($body['rechten']) ? $body['rechten'] : null;
        if ($rechtenIn === null) {
            $fouten[] = 'rechten: is verplicht';
        }

        $rechten = [];
        foreach (self::DOMEINEN as $domein) {
            if ($rechtenIn === null || !isset($rechtenIn[$domein])) {
                continue; // elk domein is optioneel
            }
            if (!in_array($rechtenIn[$domein], self::NIVEAUS, true)) {
                $fouten[] = "rechten.$domein: ongeldig niveau";
                continue;
            }
            $rechten[$domein] = $rechtenIn[$domein];
        }
        self::werp($fouten);

        return [
            'naam' => $naam,
            'mag_historie_bewerken' => (bool) ($body['mag_historie_bewerken'] ?? false),
            'rechten' => $rechten,
        ];
    }

    /** limietSchema: parameter_naam verplicht, min_waarde en max_waarde getallen. */
    public static function limiet(array $body): array
    {
        $fouten = [];
        $naam = self::tekst($body, 'parameter_naam');
        if ($naam === '') {
            $fouten[] = 'parameter_naam: is verplicht';
        }
        $min = self::getal($body, 'min_waarde', $fouten);
        $max = self::getal($body, 'max_waarde', $fouten);
        self::werp($fouten);

        return ['parameter_naam' => $naam, 'min_waarde' => $min, 'max_waarde' => $max];
    }

    /** actieTekstSchema: actie_sleutel en sjabloon verplicht (min. 1 teken). */
    public static function actieTekst(array $body): array
    {
        $fouten = [];
        $sleutel = self::tekst($body, 'actie_sleutel');
        // sjabloon NIET trimmen (kan bewust spaties bevatten); wel non-leeg eisen.
        $sjabloon = isset($body['sjabloon']) && is_string($body['sjabloon']) ? $body['sjabloon'] : '';
        if ($sleutel === '') {
            $fouten[] = 'actie_sleutel: is verplicht';
        }
        if (trim($sjabloon) === '') {
            $fouten[] = 'sjabloon: is verplicht';
        }
        self::werp($fouten);

        return ['actie_sleutel' => $sleutel, 'sjabloon' => $sjabloon];
    }

    /** configuratieUpdateSchema: waarde verplicht (min. 1 teken). */
    public static function configuratie(array $body): array
    {
        // Niet trimmen (de semantische check zit in de ConfiguratieService).
        $waarde = isset($body['waarde']) && is_string($body['waarde']) ? $body['waarde'] : '';
        self::werp(trim($waarde) === '' ? ['waarde: is verplicht'] : []);

        return ['waarde' => $waarde];
    }

    /**
     * verbruikSchema / verwarmingSchema (looseObject): alleen datum verplicht; de
     * overige velden lopen ongewijzigd mee. Geeft de hele body terug.
     */
    public static function metDatum(array $body): array
    {
        $fouten = [];
        self::datum($body, 'datum', $fouten);
        self::werp($fouten);

        return $body;
    }

    /**
     * logboekSchema: datum en tijdstip verplicht; tekst optioneel, hard gecapt op
     * LOGBOEK_MAX_TEKEN tekens (zelfde limiet als de Node-backend en logboek.js).
     */
    public static function logboek(array $body): array
    {
        $fouten = [];
        self::datum($body, 'datum', $fouten);
        $tijdstip = self::tekst($body, 'tijdstip');
        if ($tijdstip === '') {
            $fouten[] = 'tijdstip: is verplicht';
        }
        $tekst = isset($body['tekst']) && is_string($body['tekst']) ? $body['tekst'] : '';
        if (mb_strlen($tekst) > self::LOGBOEK_MAX_TEKEN) {
            $fouten[] = 'tekst: mag maximaal ' . self::LOGBOEK_MAX_TEKEN . ' tekens bevatten';
        }
        self::werp($fouten);

        return ['datum' => $body['datum'], 'tijdstip' => $tijdstip, 'tekst' => $tekst];
    }

    /** dienstSchema: datum verplicht; dienst_1/dienst_2 optionele namen (of null). */
    public static function dienst(array $body): array
    {
        $fouten = [];
        self::datum($body, 'datum', $fouten);
        self::werp($fouten);

        return [
            'datum' => $body['datum'],
            'dienst_1' => isset($body['dienst_1']) && is_string($body['dienst_1']) ? $body['dienst_1'] : null,
            'dienst_2' => isset($body['dienst_2']) && is_string($body['dienst_2']) ? $body['dienst_2'] : null,
        ];
    }

    /**
     * metingSchema (looseObject): datum (YYYY-MM-DD) en bad_naam verplicht; de
     * overige meetvelden lopen ongewijzigd mee. Geeft de hele body terug.
     */
    public static function meting(array $body): array
    {
        $fouten = [];
        self::datum($body, 'datum', $fouten);
        if (self::tekst($body, 'bad_naam') === '') {
            $fouten[] = 'bad_naam: is verplicht';
        }
        self::werp($fouten);

        return $body;
    }

    private static function tekst(array $body, string $sleutel): string
    {
        return isset($body[$sleutel]) && is_string($body[$sleutel]) ? trim($body[$sleutel]) : '';
    }

    /**
     * Valideer een getal. Accepteert JSON-getallen en numerieke strings
     * (met `,` of `.` als decimaalteken, zoals de frontend normaliseert).
     * @param string[] $fouten
     */
    private static function getal(array $body, string $sleutel, array &$fouten): float
    {
        $v = $body[$sleutel] ?? null;
        if (is_int($v) || is_float($v)) {
            return (float) $v;
        }
        if (is_string($v)) {
            $genormaliseerd = str_replace(',', '.', $v);
            if (is_numeric($genormaliseerd)) {
                return (float) $genormaliseerd;
            }
        }
        $fouten[] = "$sleutel: moet een getal zijn";
        return 0.0;
    }

    /**
     * Valideer een ISO-datum YYYY-MM-DD (zoals een <input type="date"> levert).
     * Datums in de toekomst worden geweigerd: een dagstaat kan alleen over vandaag
     * of eerder gaan (spiegelt de `max`-begrenzing van het datumveld in de frontend).
     * @param string[] $fouten
     */
    private static function datum(array $body, string $sleutel, array &$fouten): void
    {
        $v = isset($body[$sleutel]) && is_string($body[$sleutel]) ? $body[$sleutel] : '';
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $v) !== 1) {
            $fouten[] = "$sleutel: moet formaat YYYY-MM-DD hebben";
            return;
        }
        if ($v > date('Y-m-d')) {
            $fouten[] = "$sleutel: mag niet in de toekomst liggen";
        }
    }

    /**
     * Valideer een lijst gehele getallen (rol_ids). JSON-getallen komen als int binnen.
     * @param string[] $fouten
     * @return int[]
     */
    private static function intArray(mixed $waarde, string $sleutel, array &$fouten): array
    {
        if (!is_array($waarde)) {
            $fouten[] = "$sleutel: moet een lijst zijn";
            return [];
        }
        $result = [];
        foreach ($waarde as $v) {
            if (!is_int($v) && !(is_string($v) && ctype_digit($v))) {
                $fouten[] = "$sleutel: moet gehele getallen bevatten";
                return [];
            }
            $result[] = (int) $v;
        }
        return $result;
    }

    /** @param string[] $fouten */
    private static function werp(array $fouten): void
    {
        if ($fouten !== []) {
            throw new AppError('Ongeldige invoer — ' . implode('; ', $fouten), 400);
        }
    }
}
