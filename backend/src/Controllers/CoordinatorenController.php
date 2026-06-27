<?php

declare(strict_types=1);

namespace Zwembad\Controllers;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Zwembad\Errors\AppError;
use Zwembad\Services\ICoordinatorenService;
use Zwembad\Support\Historie;
use Zwembad\Support\Json;
use Zwembad\Validation\Validator;

/**
 * Port van backend/controllers/CoordinatorenController.ts. Coördinator-domein.
 * De historie-recht-controle gebeurt hier (na validatie), net als de
 * middlewarevolgorde in de Node-backend.
 */
class CoordinatorenController
{
    public function __construct(private ICoordinatorenService $service)
    {
    }

    public function getMetingen(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        return Json::write($response, $this->service->getCoordinatoren($this->datum($request)));
    }

    public function postMeting(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $body = Validator::meting((array) $request->getParsedBody());
        $this->eisHistorie($body['datum']);
        $this->service->saveMeting($body, $this->gebruiker());

        return Json::write($response, ['status' => 'success']);
    }

    public function getChecklist(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        return Json::write($response, (object) $this->service->getChecklist($this->datum($request)));
    }

    public function postChecklist(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $body = Validator::metDatum((array) $request->getParsedBody());
        $this->eisHistorie($body['datum']);
        $this->service->saveChecklist($body['datum'], $body, $this->gebruiker());

        return Json::write($response, ['status' => 'success']);
    }

    public function getDaggegevens(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        return Json::write($response, (object) $this->service->getDaggegevens($this->datum($request)));
    }

    public function postDaggegevens(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $body = Validator::metDatum((array) $request->getParsedBody());
        $this->eisHistorie($body['datum']);
        $this->service->saveDaggegevens($body['datum'], $body, $this->gebruiker());

        return Json::write($response, ['status' => 'success']);
    }

    public function deleteBlok(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $params = $request->getQueryParams();
        $datum = (string) ($params['datum'] ?? '');
        $tijdstip = (string) ($params['tijdstip'] ?? '');
        // Historie-recht eerst (zoals vereistHistorieRecht vóór de handler in Node).
        if ($datum !== '' && !Historie::magDatumBewerken($datum, $this->gebruiker() ?: null)) {
            throw new AppError('Een datum in het verleden mag je niet bewerken', 403);
        }
        if ($datum === '' || $tijdstip === '') {
            return Json::write($response, ['error' => 'datum en tijdstip zijn verplicht'], 400);
        }
        $this->service->deleteBlok($datum, $tijdstip);

        return Json::write($response, ['status' => 'success']);
    }

    public function getLogboek(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        return Json::write($response, $this->service->getLogboek($this->datum($request)));
    }

    public function postLogboek(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $body = Validator::logboek((array) $request->getParsedBody());
        $this->eisHistorie($body['datum']);
        $r = $this->service->saveLogboek($body['datum'], $body['tijdstip'], $body['tekst'], $this->gebruiker());

        return Json::write($response, ['status' => 'success', 'id' => $r['id'], 'auteur' => $r['auteur']]);
    }

    public function deleteLogboek(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        // Historie-recht wordt in de service gecontroleerd (op basis van de regel-datum).
        $this->service->deleteLogboek((string) $args['id'], $this->gebruiker());

        return Json::write($response, ['status' => 'success']);
    }

    /** @return array<string,mixed> De sessie-gebruiker (leeg array als niet ingelogd). */
    private function gebruiker(): array
    {
        return $_SESSION['gebruiker'] ?? [];
    }

    private function datum(ServerRequestInterface $request): string
    {
        return (string) ($request->getQueryParams()['datum'] ?? '');
    }

    private function eisHistorie(string $datum): void
    {
        if (!Historie::magDatumBewerken($datum, $this->gebruiker() ?: null)) {
            throw new AppError('Een datum in het verleden mag je niet bewerken', 403);
        }
    }
}
