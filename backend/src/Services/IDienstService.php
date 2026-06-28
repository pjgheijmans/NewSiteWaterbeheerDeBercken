<?php

declare(strict_types=1);

namespace Zwembad\Services;

/**
 * Port van backend/services/IDienstService.ts.
 */
interface IDienstService
{
    /** @return array{dienst_1:?string,dienst_2:?string} */
    public function getDienst(string $datum): array;

    /** @param array{datum:string,dienst_1:?string,dienst_2:?string} $data */
    public function saveDienst(array $data): void;

    /** @return string[] Namen van de geregistreerde waterbeheerders (voor de keuzelijst). */
    public function getWaterbeheerders(): array;
}
