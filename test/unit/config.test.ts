import { bepaalSessionSecret } from '../../backend/config';

describe('bepaalSessionSecret', () => {
    const origSecret = process.env.SESSION_SECRET;
    const origEnv = process.env.NODE_ENV;

    afterEach(() => {
        if (origSecret === undefined) delete process.env.SESSION_SECRET;
        else process.env.SESSION_SECRET = origSecret;
        process.env.NODE_ENV = origEnv;
        jest.restoreAllMocks();
    });

    it('gebruikt SESSION_SECRET als die is gezet', () => {
        process.env.SESSION_SECRET = 'super-geheim';
        expect(bepaalSessionSecret()).toBe('super-geheim');
    });

    it('faalt in productie als SESSION_SECRET ontbreekt', () => {
        delete process.env.SESSION_SECRET;
        process.env.NODE_ENV = 'production';
        expect(() => bepaalSessionSecret()).toThrow(/SESSION_SECRET/);
    });

    it('gebruikt SESSION_SECRET in productie wanneer die wel is gezet', () => {
        process.env.SESSION_SECRET = 'prod-geheim';
        process.env.NODE_ENV = 'production';
        expect(bepaalSessionSecret()).toBe('prod-geheim');
    });

    it('valt buiten productie terug op een dev-secret (zonder waarschuwing onder test)', () => {
        delete process.env.SESSION_SECRET;
        process.env.NODE_ENV = 'test';
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        expect(bepaalSessionSecret()).toBe('dev-onveilig-zwembad-secret');
        expect(warn).not.toHaveBeenCalled();
    });

    it('waarschuwt bij de dev-fallback buiten test/productie', () => {
        delete process.env.SESSION_SECRET;
        process.env.NODE_ENV = 'development';
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        bepaalSessionSecret();
        expect(warn).toHaveBeenCalled();
    });
});
