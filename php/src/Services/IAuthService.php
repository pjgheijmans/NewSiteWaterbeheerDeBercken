<?php

declare(strict_types=1);

namespace Zwembad\Services;

/**
 * Port van backend/services/IAuthService.ts.
 */
interface IAuthService
{
    /**
     * Verifieer inloggegevens; geeft de gebruiker (incl. weergavenaam) terug of null.
     * @return array<string,mixed>|null
     */
    public function login(string $gebruikersnaam, string $wachtwoord): ?array;
}
