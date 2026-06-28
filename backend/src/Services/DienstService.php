<?php

declare(strict_types=1);

namespace Zwembad\Services;

use Zwembad\Repositories\IDienstRepository;
use Zwembad\Repositories\IGebruikersRepository;

/**
 * Bedrijfslogica voor de waterbeheer-dienst — port van DienstService.ts.
 */
class DienstService implements IDienstService
{
    public function __construct(
        private IDienstRepository $dienstRepo,
        private IGebruikersRepository $gebruikersRepo,
    ) {
    }

    public function getDienst(string $datum): array
    {
        return $this->dienstRepo->getDienst($datum);
    }

    public function saveDienst(array $data): void
    {
        $this->dienstRepo->saveDienst($data);
    }

    /**
     * Namen voor de keuzelijst: iedereen die het waterbeheer-domein mag bewerken.
     * Dedupliceert en sorteert; lege namen vallen weg.
     */
    public function getWaterbeheerders(): array
    {
        $gebruikers = $this->gebruikersRepo->getMetRecht('waterbeheer', 'schrijven');
        $namen = [];
        foreach ($gebruikers as $g) {
            $delen = array_filter(
                [$g['voornaam'] ?? null, $g['achternaam'] ?? null],
                static fn ($n): bool => is_string($n) && $n !== '',
            );
            $naam = trim(implode(' ', $delen));
            if ($naam === '') {
                $naam = (string) ($g['inlognaam'] ?? '');
            }
            if ($naam !== '') {
                $namen[] = $naam;
            }
        }
        $namen = array_values(array_unique($namen));
        usort($namen, 'strcasecmp');

        return $namen;
    }
}
