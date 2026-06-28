<?php

declare(strict_types=1);

namespace Zwembad\Support;

use Zwembad\Errors\AppError;

/**
 * Lokaliseert de frontend-map (partials/js/css/images). In dev/Docker ligt die in
 * de project-root; bij deploy kun je `frontend/` naast `php/` zetten.
 */
final class Frontend
{
    public static function dir(): string
    {
        foreach ([dirname(__DIR__, 3) . '/frontend', dirname(__DIR__, 2) . '/frontend'] as $d) {
            if (is_dir($d)) {
                return $d;
            }
        }
        throw new AppError('frontend-map niet gevonden (verwacht in de project-root of naast php/).', 500);
    }
}
