<?php

declare(strict_types=1);

namespace Zwembad\Repositories;

use DateTimeImmutable;
use PDO;
use Zwembad\Support\Optimistisch;

/**
 * Port van backend/repositories/VerbruikRepository.ts. Verbruik en
 * verwarmingssysteem, opgeslagen via de optimistische versiecontrole.
 */
class VerbruikRepository implements IVerbruikRepository
{
    public function __construct(private PDO $pdo)
    {
    }

    public function getVerbruik(string $datum): array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM verbruik_diep_ondiep WHERE datum = ?');
        $stmt->execute([$datum]);

        return $stmt->fetch() ?: [];
    }

    public function getVorigeVerbruik(string $datum): array
    {
        $vorige = (new DateTimeImmutable($datum))->modify('-1 day')->format('Y-m-d');
        $stmt = $this->pdo->prepare('SELECT * FROM verbruik_diep_ondiep WHERE datum = ?');
        $stmt->execute([$vorige]);

        return $stmt->fetch() ?: [];
    }

    public function saveVerbruik(array $data, ?string $auteur, ?int $verwachteVersie): array
    {
        return Optimistisch::opslaan(
            $this->pdo,
            'verbruik_diep_ondiep',
            ['datum' => $data['datum']],
            [
                'Flocculant' => $data['Flocculant'] ?? null,
                'water_diep' => $data['water_diep'] ?? null,
                'water_ondiep' => $data['water_ondiep'] ?? null,
                'water_totaal' => $data['water_totaal'] ?? null,
                'elektriciteit_nacht' => $data['elektriciteit_nacht'] ?? null,
                'elektriciteit_dag' => $data['elektriciteit_dag'] ?? null,
                'gas' => $data['gas'] ?? null,
                'chemicalien_chloor' => $data['chemicalien_chloor'] ?? null,
                'chemicalien_zwavelzuur' => $data['chemicalien_zwavelzuur'] ?? null,
            ],
            $auteur,
            $verwachteVersie,
        );
    }

    public function getVerwarming(string $datum): array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM verwarmings_systeem_diep_ondiep WHERE datum = ?');
        $stmt->execute([$datum]);

        return $stmt->fetch() ?: [];
    }

    public function saveVerwarming(array $data, ?string $auteur, ?int $verwachteVersie): array
    {
        // Checkbox-velden naar 0/1, net als de bool()-helper in de Node-repo.
        $bool = static fn (mixed $v): int => ($v === true || $v === 1 || $v === '1') ? 1 : 0;

        return Optimistisch::opslaan(
            $this->pdo,
            'verwarmings_systeem_diep_ondiep',
            ['datum' => $data['datum']],
            [
                'verwarming_status_1' => $bool($data['verwarming_status_1'] ?? null),
                'verwarming_status_2' => $bool($data['verwarming_status_2'] ?? null),
                'verwarming_status_3' => $bool($data['verwarming_status_3'] ?? null),
                'verwarming_status_4' => $bool($data['verwarming_status_4'] ?? null),
                'verwarming_druk_ok' => $bool($data['verwarming_druk_ok'] ?? null),
                'verwarming_visuele_controle' => $bool($data['verwarming_visuele_controle'] ?? null),
            ],
            $auteur,
            $verwachteVersie,
        );
    }
}
