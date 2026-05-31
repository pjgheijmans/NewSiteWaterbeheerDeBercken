import { Router } from 'express';
import { FrontendController } from '../controllers/FrontendController';

export function maakFrontendRouter(): Router {
    const controller = new FrontendController();
    return controller.router;
}
