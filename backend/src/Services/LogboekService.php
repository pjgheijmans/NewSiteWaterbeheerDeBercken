<?php

declare(strict_types=1);

namespace Zwembad\Services;

use Zwembad\Errors\AppError;
use Zwembad\Repositories\ILogboekRepository;
use Zwembad\Support\Auteur;
use Zwembad\Support\Historie;

/**
 * Bedrijfslogica voor het waterbeheer-logboek — port van LogboekService.ts.
 */
class LogboekService implements ILogboekService
{
    public function __construct(private ILogboekRepository $repo)
    {
    }

    public function getByDatum(string $datum): array
    {
        return $this->repo->getByDatum($datum);
    }

    public function save(string $datum, string $tijdstip, string $tekst, array $gebruiker): array
    {
        $auteur = Auteur::bepaal($gebruiker);
        $row = $this->repo->save($datum, $tijdstip, $tekst, $auteur);

        return ['id' => $row['id'] ?? null, 'auteur' => $row['auteur'] ?? $auteur];
    }

    public function deleteById(string $id, array $gebruiker): void
    {
        $datum = $this->repo->getDatumById($id);
        if ($datum !== null && !Historie::magDatumBewerken($datum, $gebruiker)) {
            throw new AppError('Een datum in het verleden mag je niet bewerken', 403);
        }
        $this->repo->deleteById($id);
    }
}
