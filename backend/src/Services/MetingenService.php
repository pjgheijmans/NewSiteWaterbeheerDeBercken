<?php

declare(strict_types=1);

namespace Zwembad\Services;

use Zwembad\Repositories\IActiesRepository;
use Zwembad\Repositories\IDaggegevensProvider;
use Zwembad\Repositories\IMetingenRepository;
use Zwembad\Support\Auteur;

/**
 * Bedrijfslogica voor metingen en acties — port van MetingenService.ts.
 * Beslist welke bad-tabel gebruikt wordt en orkestreert de actiegeneratie.
 */
class MetingenService implements IMetingenService
{
    public function __construct(
        private IMetingenRepository $metingenRepo,
        private IActiesRepository $actiesRepo,
        private IDaggegevensProvider $daggegevensProvider,
    ) {
    }

    public function getMetingen(string $datum): array
    {
        return $this->metingenRepo->getMetingen($datum);
    }

    public function saveMeting(array $body, ?string $auteur): array
    {
        $badId = $this->metingenRepo->getBadId($body['bad_naam']);
        $verwachteVersie = isset($body['versie']) && $body['versie'] !== null ? (int) $body['versie'] : null;
        // Bij een versieconflict gooit de repo AppError(409); de actiegeneratie
        // hieronder wordt dan terecht overgeslagen (er is niets opgeslagen).
        $resultaat = $body['bad_naam'] === 'Peuterbad'
            ? $this->metingenRepo->savePeuterbadMeting($badId, $body, $auteur, $verwachteVersie)
            : $this->metingenRepo->saveGrootBadMeting($badId, $body, $auteur, $verwachteVersie);
        $this->actiesRepo->genereer($badId, $body['datum'], $body['bad_naam'], $body);

        return $resultaat;
    }

    public function getActies(string $datum): array
    {
        return $this->actiesRepo->getActies($datum);
    }

    public function resolveActie(string $id, array $gebruiker): void
    {
        $this->actiesRepo->resolve($id, Auteur::bepaal($gebruiker));
    }

    public function unresolveActie(string $id): void
    {
        $this->actiesRepo->unresolve($id);
    }

    public function getBezoekers(string $datum): array
    {
        $dag = $this->daggegevensProvider->getDaggegevens($datum);
        // Fire-and-forget: geen transactionele garantie vereist.
        $this->actiesRepo->genereerBezoekers($datum, $dag['bezoekers_vandaag'] ?? null);
        $totalen = $this->actiesRepo->genereerSpoelbeurt($datum);

        return [
            'bezoekers_vandaag' => $dag['bezoekers_vandaag'] ?? null,
            'bezoekers_totaal_diep' => $totalen['diep'] ?? null,
            'bezoekers_totaal_ondiep' => $totalen['ondiep'] ?? null,
        ];
    }

    public function getGebondenChloor(string $datum): array
    {
        // Fire-and-forget: herleid de gebonden-chloor-acties op basis van de
        // huidige coordinator-metingen (geen transactionele garantie vereist).
        $this->actiesRepo->genereerCoordinatoren($datum);

        return $this->actiesRepo->getGebondenChloorMax($datum);
    }
}
