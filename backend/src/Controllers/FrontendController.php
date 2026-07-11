<?php

declare(strict_types=1);

namespace Zwembad\Controllers;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Zwembad\Support\Frontend;

/**
 * Port van backend/controllers/FrontendController.ts. Stelt op `/` de HTML-pagina
 * samen uit de partials (zelfde volgorde als Node) en serveert de statische assets
 * (/js, /css, /images) uit de frontend-map. Publiek: geen auth.
 *
 * Op Apache kun je `frontend/` ook rechtstreeks onder de docroot serveren (sneller);
 * via PHP routen werkt overal (ook de PHP built-in server).
 */
class FrontendController
{
    /** Volgorde waarin de partials worden samengevoegd (head bevat <html>/<body>). */
    private const ORDER = [
        'head', 'login', 'dashboard-open', 'nav', 'dagstaat', 'limieten', 'actieteksten',
        'gebruikers', 'rollen', 'database', 'configuratie', 'trendanalyse', 'footer',
    ];

    /** JS-bestanden in laadvolgorde (sequentieel ingeladen, geen bundler). */
    private const JS_FILES = [
        'state', 'api', 'ui', 'limieten', 'actieteksten', 'dienst', 'auth', 'metingen', 'taken',
        'verbruik', 'opslaan', 'logboek', 'gebruikers', 'rollen', 'database', 'configuratie',
        'nav', 'trend', 'tracer', 'app',
    ];

    private const CONTENT_TYPES = [
        'js' => 'text/javascript; charset=utf-8',
        'css' => 'text/css; charset=utf-8',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'svg' => 'image/svg+xml',
    ];

    public function servePage(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $partials = Frontend::dir() . '/partials';
        $delen = [];
        foreach (self::ORDER as $naam) {
            $delen[] = (string) file_get_contents("$partials/$naam.html");
        }
        $scriptTags = [];
        foreach (self::JS_FILES as $f) {
            $scriptTags[] = "<script src=\"/js/$f.js\"></script>";
        }

        $page = implode("\n", $delen) . "\n    " . implode("\n    ", $scriptTags) . "\n</body>\n</html>";
        $response->getBody()->write($page);

        return $response->withHeader('Content-Type', 'text/html; charset=utf-8');
    }

    public function serveAsset(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $type = $args['type'];
        $bestand = basename($args['file']); // path-traversal guard
        if (!in_array($type, ['js', 'css', 'images'], true)) {
            return $response->withStatus(404);
        }

        $pad = Frontend::dir() . "/$type/$bestand";
        if (!is_file($pad)) {
            return $response->withStatus(404);
        }

        $ext = strtolower(pathinfo($bestand, PATHINFO_EXTENSION));
        $response->getBody()->write((string) file_get_contents($pad));

        return $response->withHeader('Content-Type', self::CONTENT_TYPES[$ext] ?? 'application/octet-stream');
    }
}
