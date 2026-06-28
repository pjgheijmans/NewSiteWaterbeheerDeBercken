<?php

declare(strict_types=1);

namespace Zwembad\Services;

use Zwembad\Repositories\IGebruikersRepository;

/**
 * Authenticatielogica — port van backend/services/AuthService.ts.
 */
class AuthService implements IAuthService
{
    public function __construct(private IGebruikersRepository $gebruikersRepo)
    {
    }

    public function login(string $gebruikersnaam, string $wachtwoord): ?array
    {
        $gebruiker = $this->gebruikersRepo->findByLogin($gebruikersnaam, $wachtwoord);
        if ($gebruiker === null) {
            return null;
        }
        $gebruiker['weergavenaam'] = $this->weergavenaam($gebruiker);

        return $gebruiker;
    }

    /**
     * Weergavenaam voor de kop: de voornaam, en — als meerdere gebruikers dezelfde
     * voornaam hebben — aangevuld met de eerste letter van de achternaam ("Paul H").
     * Botst die initiaal óók met een naamgenoot, dan de volledige achternaam.
     * Port van AuthService._weergavenaam().
     *
     * @param array<string,mixed> $g
     */
    private function weergavenaam(array $g): string
    {
        $voornaam = trim((string) ($g['voornaam'] ?? ''));
        if ($voornaam === '') {
            $inlog = trim((string) ($g['inlognaam'] ?? ''));
            return $inlog !== '' ? $inlog : (string) $g['gebruikersnaam'];
        }

        $alle = $this->gebruikersRepo->getAll();
        $zelfdeVoornaam = array_values(array_filter(
            $alle,
            static fn (array $u): bool =>
                mb_strtolower(trim((string) ($u['voornaam'] ?? ''))) === mb_strtolower($voornaam),
        ));
        if (count($zelfdeVoornaam) <= 1) {
            return $voornaam;
        }

        $achternaam = trim((string) ($g['achternaam'] ?? ''));
        if ($achternaam === '') {
            return $voornaam;
        }

        $initiaal = mb_strtoupper(mb_substr($achternaam, 0, 1));
        $initiaalBotst = false;
        foreach ($zelfdeVoornaam as $u) {
            if ((int) $u['id'] !== (int) $g['id']
                && mb_strtoupper(mb_substr(trim((string) ($u['achternaam'] ?? '')), 0, 1)) === $initiaal) {
                $initiaalBotst = true;
                break;
            }
        }

        return $initiaalBotst ? "$voornaam $achternaam" : "$voornaam $initiaal";
    }
}
