<?php

declare(strict_types=1);

namespace Zwembad\Repositories;

/**
 * Port van backend/repositories/IDienstRepository.ts.
 */
interface IDienstRepository
{
    /** @return array{dienst_1:?string,dienst_2:?string} De twee diensten van de dag. */
    public function getDienst(string $datum): array;

    /** @param array{datum:string,dienst_1:?string,dienst_2:?string} $data */
    public function saveDienst(array $data): void;
}
