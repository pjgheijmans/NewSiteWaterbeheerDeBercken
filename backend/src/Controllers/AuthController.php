<?php

declare(strict_types=1);

namespace Zwembad\Controllers;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Zwembad\Services\IAuthService;
use Zwembad\Support\Json;
use Zwembad\Validation\Validator;

/**
 * Port van backend/controllers/AuthController.ts.
 * Endpoints en JSON-vorm zijn identiek aan de Node-backend zodat frontend/js/auth.js
 * ongewijzigd blijft werken:
 *   POST /api/login    → { status: 'success', gebruiker } | 401 { error }
 *   POST /api/logout   → { status: 'success' }
 *   GET  /api/ingelogd → { ingelogd: true, gebruiker } | { ingelogd: false }
 */
class AuthController
{
    public function __construct(private IAuthService $service)
    {
    }

    public function login(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        // Validator gooit AppError(400) bij ontbrekende velden (afgehandeld door JsonErrorHandler).
        $data = Validator::login((array) $request->getParsedBody());

        $gebruiker = $this->service->login($data['username'], $data['password']);
        if ($gebruiker === null) {
            return Json::write($response, ['error' => 'Onjuiste inlognaam of wachtwoord'], 401);
        }

        $_SESSION['gebruiker'] = $gebruiker;

        return Json::write($response, ['status' => 'success', 'gebruiker' => $gebruiker]);
    }

    public function logout(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $_SESSION = [];
        // Alleen opruimen als er een actieve sessie is (in de app start SessionMiddleware
        // die voor /api; zo blijft logout ook zonder actieve sessie veilig — bv. in tests).
        if (session_status() === PHP_SESSION_ACTIVE) {
            if (ini_get('session.use_cookies')) {
                $p = session_get_cookie_params();
                setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
            }
            session_destroy();
        }

        return Json::write($response, ['status' => 'success']);
    }

    public function ingelogd(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        if (!empty($_SESSION['gebruiker'])) {
            return Json::write($response, ['ingelogd' => true, 'gebruiker' => $_SESSION['gebruiker']]);
        }

        return Json::write($response, ['ingelogd' => false]);
    }
}
