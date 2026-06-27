<?php

declare(strict_types=1);

namespace Zwembad\Controllers;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Zwembad\Services\IDatabaseService;
use Zwembad\Support\Json;

/**
 * Port van backend/controllers/DatabaseController.ts. Beheer-domein. De
 * tabelnaam-allowlists beschermen tegen injectie via de URL-parameter.
 *   POST /api/database/truncate/{tabelnaam}  | GET /api/database/export/{tabelnaam}
 *   POST /api/database/import/{tabelnaam}     | POST /api/database/verwijder-alles
 *   POST /api/database/initialiseer
 */
class DatabaseController
{
    private const TRUNC_TABLES = [
        'logboek', 'coordinatoren_logboek', 'metingen_diep_ondiep', 'metingen_coordinatoren',
        'coordinatoren_checklist', 'coordinatoren_daggegevens', 'metingen_peuterbad',
        'verbruik_diep_ondiep', 'verwarmings_systeem_diep_ondiep', 'waterbeheer_dienst',
        'acties', 'limieten', 'actie_teksten', 'gebruikers',
    ];

    private const EXPORT_TABLES = [
        'logboek', 'coordinatoren_logboek', 'metingen_diep_ondiep', 'metingen_peuterbad',
        'metingen_coordinatoren', 'coordinatoren_checklist', 'coordinatoren_daggegevens',
        'verbruik_diep_ondiep', 'verwarmings_systeem_diep_ondiep', 'waterbeheer_dienst',
        'acties', 'limieten', 'actie_teksten', 'gebruikers',
    ];

    private const IMPORT_TABLES = [
        'logboek', 'metingen_diep_ondiep', 'metingen_coordinatoren', 'coordinatoren_checklist',
        'coordinatoren_daggegevens', 'metingen_peuterbad', 'verbruik_diep_ondiep',
        'verwarmings_systeem_diep_ondiep', 'waterbeheer_dienst', 'limieten', 'actie_teksten', 'gebruikers',
    ];

    public function __construct(private IDatabaseService $service)
    {
    }

    public function truncate(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $tabel = (string) $args['tabelnaam'];
        if (!in_array($tabel, self::TRUNC_TABLES, true)) {
            return Json::write($response, ['error' => 'Ongeldige tabelnaam'], 400);
        }
        $this->service->truncate($tabel);

        return Json::write($response, ['status' => 'success', 'message' => "Tabel $tabel succesvol geleegd."]);
    }

    public function exportCsv(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $tabel = (string) $args['tabelnaam'];
        if (!in_array($tabel, self::EXPORT_TABLES, true)) {
            return Json::write($response, ['error' => 'Ongeldige tabelnaam'], 400);
        }
        $csv = $this->service->exporteerCsv($tabel);
        if ($csv === null) {
            return Json::write($response, ['error' => 'Tabel is leeg, niets te exporteren'], 404);
        }
        $bestand = "export_{$tabel}_" . gmdate('Y-m-d') . '.csv';
        $response->getBody()->write($csv);

        return $response
            ->withHeader('Content-Type', 'text/csv; charset=utf-8')
            ->withHeader('Content-Disposition', "attachment; filename=$bestand")
            ->withStatus(200);
    }

    public function importCsv(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $tabel = (string) $args['tabelnaam'];
        if (!in_array($tabel, self::IMPORT_TABLES, true)) {
            return Json::write($response, ['error' => 'Ongeldige tabelnaam'], 400);
        }
        $this->service->importeerCsv($tabel, (string) $request->getBody());

        return Json::write($response, ['status' => 'success', 'message' => 'CSV succesvol geimporteerd']);
    }

    public function verwijderAlles(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $this->service->wisAlles();
        $this->vernietigSessie();

        return Json::write($response, ['status' => 'success', 'message' => 'Alle data gewist.']);
    }

    public function initialiseer(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $this->service->initialiseer();
        $this->vernietigSessie();

        return Json::write($response, ['status' => 'success', 'message' => 'Database geïnitialiseerd met standaardwaarden.']);
    }

    private function vernietigSessie(): void
    {
        $_SESSION = [];
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
    }
}
