<?php

declare(strict_types=1);

namespace Zwembad\Support;

use Psr\Http\Message\ResponseInterface;

/**
 * Kleine helper om een PSR-7 response als JSON te schrijven — vervangt
 * res.json()/res.status().json() uit Express.
 */
final class Json
{
    public static function write(ResponseInterface $response, mixed $data, int $status = 200): ResponseInterface
    {
        $response->getBody()->write(
            (string) json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        );

        return $response
            ->withHeader('Content-Type', 'application/json; charset=utf-8')
            ->withStatus($status);
    }
}
