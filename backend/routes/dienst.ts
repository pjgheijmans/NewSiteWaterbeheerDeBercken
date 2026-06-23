import { Router } from 'express';
import { Pool } from 'mysql2/promise';
import { DienstRepository } from '../repositories/DienstRepository';
import { GebruikersRepository } from '../repositories/GebruikersRepository';
import { DienstService } from '../services/DienstService';
import { DienstController } from '../controllers/DienstController';

export function maakDienstRouter(pool: Pool): Router {
    const dienstRepo = new DienstRepository(pool);
    const gebruikersRepo = new GebruikersRepository(pool);
    const service = new DienstService(dienstRepo, gebruikersRepo);
    const controller = new DienstController(service);
    return controller.router;
}
