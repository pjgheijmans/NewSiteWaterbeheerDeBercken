/** Applicatiefout met een expliciete HTTP-statuscode. */
export class AppError extends Error {
    constructor(
        message: string,
        public readonly status: number,
    ) {
        super(message);
        this.name = 'AppError';
    }
}
