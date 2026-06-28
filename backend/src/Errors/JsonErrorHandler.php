<?php

declare(strict_types=1);

namespace Zwembad\Errors;

use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Slim\Exception\HttpException;
use Throwable;
use Zwembad\Support\Json;

/**
 * Centrale foutafhandeling — port van backend/middleware/errorHandler.ts.
 * AppError → eigen status; Slim HttpException → bijbehorende status; al het
 * overige → 500. Antwoord altijd als JSON { error: "..." }. 5xx wordt gelogd.
 */
class JsonErrorHandler
{
    public function __construct(private ResponseFactoryInterface $responseFactory)
    {
    }

    public function __invoke(
        ServerRequestInterface $request,
        Throwable $exception,
        bool $displayErrorDetails,
        bool $logErrors,
        bool $logErrorDetails,
    ): ResponseInterface {
        $status = match (true) {
            $exception instanceof AppError => $exception->getStatus(),
            $exception instanceof HttpException => $exception->getCode(),
            default => 500,
        };
        $message = $exception->getMessage() !== '' ? $exception->getMessage() : 'Onbekende fout';

        if ($status >= 500) {
            error_log((string) $exception);
        }

        return Json::write($this->responseFactory->createResponse(), ['error' => $message], $status);
    }
}
