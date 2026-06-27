<?php

declare(strict_types=1);

namespace Zwembad\Services;

use Zwembad\Repositories\IActiesRepository;
use Zwembad\Repositories\IRondetakenRepository;
use Zwembad\Repositories\RondetakenRepository;
use Zwembad\Support\Auteur;

/**
 * Bedrijfslogica voor de dagelijkse rondetaken — port van RondetakenService.ts.
 * Voor een filter-rondetaak worden de filter_spoelen_*-acties van het bad
 * mee afgehandeld (tweerichtingskoppeling met de Acties-tab).
 */
class RondetakenService implements IRondetakenService
{
    public function __construct(
        private IRondetakenRepository $repo,
        private IActiesRepository $actiesRepo,
    ) {
    }

    public function getRondetaken(string $datum): array
    {
        return $this->repo->getRondetaken($datum);
    }

    public function voltooi(string $sleutel, string $datum, array $gebruiker): void
    {
        $auteur = Auteur::bepaal($gebruiker);
        $this->repo->voltooi($sleutel, $datum, $auteur);
        $badNaam = RondetakenRepository::badVoorFilterSleutel($sleutel);
        if ($badNaam !== null) {
            $this->actiesRepo->resolveFilterSpoelen($badNaam, $datum, $auteur);
        }
    }

    public function heropen(string $sleutel, string $datum): void
    {
        $this->repo->heropen($sleutel, $datum);
        $badNaam = RondetakenRepository::badVoorFilterSleutel($sleutel);
        if ($badNaam !== null) {
            $this->actiesRepo->unresolveFilterSpoelen($badNaam, $datum);
        }
    }
}
