<?php

declare(strict_types=1);

namespace Zwembad\Controllers;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Zwembad\Support\Json;

/**
 * Port van backend/routes/versie.ts + versie.ts. Publieke versie-endpoint:
 * code-versie (uit package.json) + git-commit (uit GIT_COMMIT). Geen auth — de
 * frontend toont de versie in de kop nog vóór het inloggen.
 *   GET /api/versie → { versie, commit }
 */
class VersieController
{
    public function get(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        return Json::write($response, [
            'versie' => self::leesPackageVersie(),
            'commit' => getenv('GIT_COMMIT') ?: 'onbekend',
        ]);
    }

    private static function leesPackageVersie(): string
    {
        foreach ([dirname(__DIR__, 3) . '/package.json', dirname(__DIR__, 2) . '/package.json'] as $pad) {
            if (is_file($pad)) {
                $pkg = json_decode((string) file_get_contents($pad), true);

                return is_array($pkg) && isset($pkg['version']) ? (string) $pkg['version'] : 'onbekend';
            }
        }

        return 'onbekend';
    }
}
