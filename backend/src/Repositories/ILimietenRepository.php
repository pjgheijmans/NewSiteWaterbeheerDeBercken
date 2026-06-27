<?php

declare(strict_types=1);

namespace Zwembad\Repositories;

/**
 * Port van backend/repositories/ILimietenRepository.ts.
 */
interface ILimietenRepository
{
    /** @return array<string,array{min:float,max:float}> Map: parameter_naam → {min,max}. */
    public function getAll(): array;

    /** @return array<string,array{min:float,max:float}> De ingebouwde standaardlimieten. */
    public function getDefaults(): array;

    /** @param array{parameter_naam:string,min_waarde:float,max_waarde:float} $data */
    public function save(array $data): void;

    /** Zaai de ingebouwde standaardlimieten (idempotent via INSERT IGNORE). */
    public function seedDefaults(): void;
}
