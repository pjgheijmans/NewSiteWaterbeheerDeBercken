<?php

declare(strict_types=1);

namespace Zwembad\Services;

use Zwembad\Repositories\ITrendRepository;

/**
 * Bedrijfslogica voor trendanalyse — port van TrendService.ts.
 */
class TrendService implements ITrendService
{
    public function __construct(private ITrendRepository $repo)
    {
    }

    public function getMetingenTrend(string $van, string $tot): array
    {
        return $this->repo->getMetingenTrend($van, $tot);
    }

    public function getVerbruikTrend(string $van, string $tot): array
    {
        return $this->repo->getVerbruikTrend($van, $tot);
    }
}
