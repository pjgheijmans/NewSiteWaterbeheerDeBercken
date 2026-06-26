<?php

declare(strict_types=1);

namespace Zwembad\Services;

use Zwembad\Repositories\IActiesRepository;
use Zwembad\Repositories\IVerbruikRepository;

/**
 * Bedrijfslogica voor verbruik en verwarmingssysteem — port van VerbruikService.ts.
 * Triggert na het opslaan van verbruik de actiegeneratie (chemicaliën-voorraad).
 */
class VerbruikService implements IVerbruikService
{
    public function __construct(
        private IVerbruikRepository $verbruikRepo,
        private IActiesRepository $actiesRepo,
    ) {
    }

    public function getVerbruik(string $datum): array
    {
        return $this->verbruikRepo->getVerbruik($datum);
    }

    public function getVorigeVerbruik(string $datum): array
    {
        return $this->verbruikRepo->getVorigeVerbruik($datum);
    }

    public function saveVerbruik(array $body, ?string $auteur): array
    {
        $versie = isset($body['versie']) && $body['versie'] !== null ? (int) $body['versie'] : null;
        $resultaat = $this->verbruikRepo->saveVerbruik($body, $auteur, $versie);
        $this->actiesRepo->genereerVerbruik($body['datum'], $body);

        return $resultaat;
    }

    public function getVerwarming(string $datum): array
    {
        return $this->verbruikRepo->getVerwarming($datum);
    }

    public function saveVerwarming(array $body, ?string $auteur): array
    {
        $versie = isset($body['versie']) && $body['versie'] !== null ? (int) $body['versie'] : null;

        return $this->verbruikRepo->saveVerwarming($body, $auteur, $versie);
    }
}
