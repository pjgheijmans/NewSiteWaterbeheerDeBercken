<?php

declare(strict_types=1);

namespace Zwembad\Services;

/**
 * Port van backend/services/ILimietenService.ts.
 */
interface ILimietenService
{
    /** @return array<string,array{min:float,max:float}> */
    public function getAll(): array;

    /** @return array<string,array{min:float,max:float}> */
    public function getDefaults(): array;

    /** @param array{parameter_naam:string,min_waarde:float,max_waarde:float} $data */
    public function save(array $data): void;
}
