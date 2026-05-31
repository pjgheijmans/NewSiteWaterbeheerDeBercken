import { Gebruiker } from './index';

declare module 'express-session' {
    interface SessionData {
        gebruiker?: Gebruiker;
    }
}
