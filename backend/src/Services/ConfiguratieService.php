<?php

declare(strict_types=1);

namespace Zwembad\Services;

use Zwembad\Errors\AppError;
use Zwembad\Repositories\IConfiguratieRepository;

/**
 * Bedrijfslogica voor de generieke configuratie — port van ConfiguratieService.ts.
 * De DEFAULTS bepalen tevens welke sleutels geldig zijn (onbekende sleutel → 404).
 *
 * NB: anders dan de Node-backend (langlevend proces met een gedeelde cache) draait
 * PHP per request; de cache is hier dus per-request. Voor de admin-endpoints maakt
 * dat niet uit (getAll/update gaan rechtstreeks naar de DB).
 */
class ConfiguratieService implements IConfiguratieService
{
    /** Defaults + de toegestane sleutels. */
    private const DEFAULTS = ['sessie_timeout_minuten' => '5'];

    /** @var array<string,string> */
    private array $cache = [];

    public function __construct(private IConfiguratieRepository $repo)
    {
    }

    public function laadCache(): void
    {
        try {
            $this->cache = [];
            foreach ($this->repo->getAll() as $r) {
                $this->cache[$r['sleutel']] = $r['waarde'];
            }
        } catch (\Throwable $e) {
            error_log('Configuratie laden mislukt, gebruik defaults: ' . $e->getMessage());
        }
    }

    public function getAll(): array
    {
        return $this->repo->getAll();
    }

    public function getSessieTimeoutMs(): int
    {
        $minuten = (int) ($this->waarde('sessie_timeout_minuten') ?? '5');
        $veilig = $minuten > 0 ? $minuten : 5;

        return $veilig * 60 * 1000;
    }

    public function update(string $sleutel, string $waarde): void
    {
        if (!array_key_exists($sleutel, self::DEFAULTS)) {
            throw new AppError("Onbekende configuratiesleutel: $sleutel", 404);
        }
        $this->valideer($sleutel, $waarde);
        $this->repo->upsert($sleutel, $waarde);
        $this->cache[$sleutel] = $waarde;
    }

    private function waarde(string $sleutel): ?string
    {
        return $this->cache[$sleutel] ?? (self::DEFAULTS[$sleutel] ?? null);
    }

    /** Per-sleutel validatie; gooit AppError(400) bij een ongeldige waarde. */
    private function valideer(string $sleutel, string $waarde): void
    {
        if ($sleutel === 'sessie_timeout_minuten') {
            if (preg_match('/^\d+$/', $waarde) !== 1 || (int) $waarde < 1 || (int) $waarde > 1440) {
                throw new AppError(
                    'Sessie-time-out moet een geheel getal tussen 1 en 1440 minuten zijn.',
                    400,
                );
            }
        }
    }
}
