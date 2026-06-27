<?php

declare(strict_types=1);

/**
 * Configuratie-entry 'settings' voor de DI-container.
 *
 * De DB-gegevens komen bij voorkeur uit omgevingsvariabelen (zoals in de
 * Node-backend: DB_HOST/DB_USER/DB_PASSWORD/DB_NAME). Op gedeelde hosting zonder
 * env-ondersteuning kun je de fallback-waarden hieronder rechtstreeks invullen.
 */

function env(string $sleutel, string $standaard): string
{
    $waarde = getenv($sleutel);
    return $waarde !== false && $waarde !== '' ? $waarde : $standaard;
}

return [
    'settings' => [
        'db' => [
            'host' => env('DB_HOST', 'localhost'),
            'name' => env('DB_NAME', 'zwembad_status'),
            'user' => env('DB_USER', 'root'),
            'pass' => env('DB_PASSWORD', 'geheim_wachtwoord'),
        ],
    ],
];
