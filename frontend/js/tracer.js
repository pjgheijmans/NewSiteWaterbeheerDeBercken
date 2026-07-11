/**
 * Functietracer (alleen ontwikkeling).
 *
 * Wrapt de methoden van alle modules op de Application-container (zie app.js) zodat
 * elke aanroep — met invoerargumenten én retourwaarde — in de browserconsole
 * verschijnt. Het frontend-equivalent van de Xdebug-functietrace op de backend.
 *
 * Standaard UIT (geen overhead). Inschakelen kan op twee manieren:
 *   - URL:          ?trace=1   (onthoudt de keuze in localStorage; ?trace=0 zet uit)
 *   - localStorage: localStorage.trace = '1'
 *
 * Bewust zonder bundler/dependency: een dunne wrapper rond bestaande instanties.
 */
(function () {
    'use strict';

    /** Modules die niet gevolgd worden (leeg = alles volgen). */
    const OVERSLAAN = new Set();

    /** Bepaal of tracing aan staat; ?trace=… wint en wordt onthouden. */
    function traceIngeschakeld() {
        try {
            const params = new URLSearchParams(window.location.search);
            if (params.has('trace')) {
                const aan = params.get('trace') !== '0';
                window.localStorage.setItem('trace', aan ? '1' : '0');
                return aan;
            }
            return window.localStorage.getItem('trace') === '1';
        } catch {
            return false;
        }
    }

    // Aanroepdiepte voor inspringen. Bij async wordt pas bij het settelen van de
    // Promise weer uitgesprongen; de inspring van de ingang is dan al vastgelegd.
    let diepte = 0;
    const inspring = () => '  '.repeat(diepte);

    /** Bouw een gewrapte versie van één methode. */
    function wrapMethode(instance, naam, moduleNaam) {
        const origineel = instance[naam];
        const label = `${moduleNaam}.${naam}`;
        return function (...args) {
            const indent = inspring();
            const start = performance.now();
            console.log(`%c${indent}→ ${label}`, 'color:#2563eb', ...args);
            diepte++;
            const uitspringen = () => {
                diepte = Math.max(0, diepte - 1);
            };
            const ms = () => (performance.now() - start).toFixed(1);

            let resultaat;
            try {
                resultaat = origineel.apply(instance, args);
            } catch (fout) {
                uitspringen();
                console.log(`%c${indent}✖ ${label} — exception`, 'color:#dc2626', fout);
                throw fout;
            }

            if (resultaat && typeof resultaat.then === 'function') {
                return resultaat.then(
                    (waarde) => {
                        uitspringen();
                        console.log(
                            `%c${indent}← ${label} (${ms()}ms, async)`,
                            'color:#16a34a',
                            waarde,
                        );
                        return waarde;
                    },
                    (fout) => {
                        uitspringen();
                        console.log(
                            `%c${indent}✖ ${label} (${ms()}ms, async rejected)`,
                            'color:#dc2626',
                            fout,
                        );
                        throw fout;
                    },
                );
            }

            uitspringen();
            console.log(`%c${indent}← ${label} (${ms()}ms)`, 'color:#16a34a', resultaat);
            return resultaat;
        };
    }

    /**
     * Installeer de tracer op een Application-instantie. No-op als tracing uit staat.
     * @param {object} app - de Application-container uit app.js
     */
    function installTracer(app) {
        if (!app || !traceIngeschakeld()) return;
        const moduleNamen = Object.keys(app).filter(
            (k) => app[k] && typeof app[k] === 'object' && !OVERSLAAN.has(k),
        );
        let aantal = 0;
        moduleNamen.forEach((moduleNaam) => {
            const instance = app[moduleNaam];
            const proto = Object.getPrototypeOf(instance);
            if (!proto || proto === Object.prototype) return;
            Object.getOwnPropertyNames(proto).forEach((naam) => {
                if (naam === 'constructor') return;
                const desc = Object.getOwnPropertyDescriptor(proto, naam);
                // Alleen echte methoden; getters/setters laten we met rust.
                if (!desc || typeof desc.value !== 'function' || desc.get || desc.set) return;
                // Wrap op de instance (niet de prototype): `this` blijft de instance en
                // andere klassen worden niet geraakt.
                instance[naam] = wrapMethode(instance, naam, moduleNaam);
                aantal++;
            });
        });
        console.info(
            `%c[tracer] actief — ${aantal} methoden over ${moduleNamen.length} modules. Uitzetten: ?trace=0`,
            'color:#2563eb;font-weight:bold',
        );
    }

    window.installTracer = installTracer;

    // Node/Jest: exporteer zodat de tracer in jsdom-tests importeerbaar is.
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { installTracer };
    }
})();
