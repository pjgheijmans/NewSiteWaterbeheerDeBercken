<?php

declare(strict_types=1);

namespace Zwembad\Errors;

/**
 * Applicatiefout met een expliciete HTTP-statuscode.
 * Port van backend/errors.ts (AppError). Gooi `new AppError($bericht, $status)`
 * voor bekende HTTP-fouten; de JsonErrorHandler zet de status door.
 */
class AppError extends \RuntimeException
{
    public function __construct(
        string $message,
        private int $status,
    ) {
        parent::__construct($message);
    }

    public function getStatus(): int
    {
        return $this->status;
    }
}
