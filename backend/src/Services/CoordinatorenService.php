<?php

declare(strict_types=1);

namespace Zwembad\Services;

use Zwembad\Errors\AppError;
use Zwembad\Repositories\IActiesRepository;
use Zwembad\Repositories\ICoordinatorenLogboekRepository;
use Zwembad\Repositories\ICoordinatorenRepository;
use Zwembad\Support\Auteur;
use Zwembad\Support\Historie;

/**
 * Bedrijfslogica voor coördinatoren — port van CoordinatorenService.ts.
 * Metingen-blokken, checklist, daggegevens (met actiegeneratie) en het logboek.
 */
class CoordinatorenService implements ICoordinatorenService
{
    public function __construct(
        private ICoordinatorenRepository $coordRepo,
        private ICoordinatorenLogboekRepository $logboekRepo,
        private IActiesRepository $actiesRepo,
    ) {
    }

    public function getCoordinatoren(string $datum): array
    {
        return $this->coordRepo->getCoordinatoren($datum);
    }

    public function saveMeting(array $body, array $gebruiker): void
    {
        $badId = $this->coordRepo->getBadId($body['bad_naam']);
        $this->coordRepo->saveMeting($badId, $body, Auteur::bepaal($gebruiker));
        // Fire-and-forget in Node; hier synchroon (geen transactionele garantie vereist).
        $this->actiesRepo->genereerCoordinatoren($body['datum']);
    }

    public function getChecklist(string $datum): array
    {
        return $this->coordRepo->getChecklist($datum);
    }

    public function saveChecklist(string $datum, array $body, array $gebruiker): void
    {
        $this->coordRepo->saveChecklist($datum, $body, Auteur::bepaal($gebruiker));
    }

    public function getDaggegevens(string $datum): array
    {
        return $this->coordRepo->getDaggegevens($datum);
    }

    public function saveDaggegevens(string $datum, array $body, array $gebruiker): void
    {
        $this->coordRepo->saveDaggegevens($datum, $body, Auteur::bepaal($gebruiker));
        $this->actiesRepo->genereerBezoekers($datum, $body['bezoekers_vandaag'] ?? null);
        $this->actiesRepo->genereerSpoelbeurt($datum);
    }

    public function deleteBlok(string $datum, string $tijdstip): void
    {
        $this->coordRepo->deleteBlok($datum, $tijdstip);
        $this->actiesRepo->genereerCoordinatoren($datum);
    }

    public function getLogboek(string $datum): array
    {
        return $this->logboekRepo->getByDatum($datum);
    }

    public function saveLogboek(string $datum, string $tijdstip, string $tekst, array $gebruiker): array
    {
        $auteur = Auteur::bepaal($gebruiker);
        $row = $this->logboekRepo->save($datum, $tijdstip, $tekst, $auteur);

        return ['id' => $row['id'] ?? null, 'auteur' => $row['auteur'] ?? $auteur];
    }

    public function deleteLogboek(string $id, array $gebruiker): void
    {
        $datum = $this->logboekRepo->getDatumById($id);
        if ($datum !== null && !Historie::magDatumBewerken($datum, $gebruiker)) {
            throw new AppError('Een datum in het verleden mag je niet bewerken', 403);
        }
        $this->logboekRepo->deleteById($id);
    }
}
