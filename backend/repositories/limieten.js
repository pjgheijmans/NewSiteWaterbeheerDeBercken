/**
 * Repository for limit definitions.
 */
const pool = require('./db');

const DEFAULT_LIMIETEN = [
    { parameter_naam: 'ph_waarde',             min_waarde: 6.80,  max_waarde: 7.60    },
    { parameter_naam: 'chloor_waarde',          min_waarde: 0.50,  max_waarde: 1.50    },
    { parameter_naam: 'watertemperatuur',       min_waarde: 20.00, max_waarde: 30.00   },
    { parameter_naam: 'flow_diep',              min_waarde: 250.00,max_waarde: 450.00  },
    { parameter_naam: 'flow_ondiep',            min_waarde: 50.00, max_waarde: 120.00  },
    { parameter_naam: 'flow_peuterbad',         min_waarde: 3.00,  max_waarde: 10.00   },
    { parameter_naam: 'filter_druk_in',         min_waarde: 0.20,  max_waarde: 1.50    },
    { parameter_naam: 'filter_druk_uit',        min_waarde: 0.20,  max_waarde: 1.50    },
    { parameter_naam: 'filter_druk_peuterbad',  min_waarde: 0.20,  max_waarde: 1.50    },
    { parameter_naam: 'elektriciteit_nacht',    min_waarde: 0.00,  max_waarde: 500.00  },
    { parameter_naam: 'elektriciteit_dag',      min_waarde: 0.00,  max_waarde: 500.00  },
    { parameter_naam: 'gas',                    min_waarde: 0.00,  max_waarde: 500.00  },
    { parameter_naam: 'water_diep',             min_waarde: 0.00,  max_waarde: 99999.00},
    { parameter_naam: 'water_ondiep',           min_waarde: 0.00,  max_waarde: 99999.00},
    { parameter_naam: 'water_totaal',           min_waarde: 0.00,  max_waarde: 99999.00},
    { parameter_naam: 'water_peuterbad',        min_waarde: 0.00,  max_waarde: 99999.00},
    // Chloor subtypes (coördinatoren)
    { parameter_naam: 'chloor_vrij',            min_waarde: 0.50,  max_waarde: 1.50    },
    { parameter_naam: 'chloor_totaal',          min_waarde: 0.30,  max_waarde: 3.50    },
    { parameter_naam: 'chloor_gebonden',        min_waarde: 0.30,  max_waarde: 3.50    },
    // Actie-drempelwaarden (max_waarde = drempelwaarde)
    { parameter_naam: 'actie_druk_verschil',    min_waarde: 0.00,  max_waarde: 0.40    },
    { parameter_naam: 'actie_druk_peuterbad',   min_waarde: 0.00,  max_waarde: 1.00    },
    { parameter_naam: 'actie_flow_diep',        min_waarde: 0.00,  max_waarde: 250.00  },
    { parameter_naam: 'actie_flow_ondiep',      min_waarde: 0.00,  max_waarde: 75.00   },
    { parameter_naam: 'actie_flow_peuterbad',   min_waarde: 0.00,  max_waarde: 4.00    },
    { parameter_naam: 'actie_chloor_min',       min_waarde: 0.00,  max_waarde: 200.00  },
    { parameter_naam: 'actie_zwavelzuur_min',   min_waarde: 0.00,  max_waarde: 50.00   },
    { parameter_naam: 'actie_bezoekers_max',    min_waarde: 0.00,  max_waarde: 750.00  },
    { parameter_naam: 'actie_spoelbeurt_max',   min_waarde: 0.00,  max_waarde: 1500.00 },
    { parameter_naam: 'actie_floculant_min',    min_waarde: 0.00,  max_waarde: 10.00   },
    { parameter_naam: 'seizoen_begin',          min_waarde: 0.00,  max_waarde: 20260425.00 },
    { parameter_naam: 'seizoen_eind',           min_waarde: 0.00,  max_waarde: 20260901.00 },
];

/**
 * Load all limit definitions and normalize aliases.
 */
async function getAll() {
    const [rows] = await pool.execute('SELECT parameter_naam, min_waarde, max_waarde FROM limieten');
    const obj = {};
    rows.forEach(r => {
        obj[r.parameter_naam] = { min: parseFloat(r.min_waarde), max: parseFloat(r.max_waarde) };
    });

    // Backwards-compatible aliases for renamed parameters
    if (!obj.watertemperatuur && obj.temperatuur) obj.watertemperatuur = obj.temperatuur;
    if (obj.flow) {
        if (!obj.flow_diep) obj.flow_diep = obj.flow;
        if (!obj.flow_ondiep) obj.flow_ondiep = obj.flow;
        if (!obj.flow_peuterbad) obj.flow_peuterbad = obj.flow;
    }
    if (obj.filter_druk) {
        if (!obj.filter_druk_in) obj.filter_druk_in = obj.filter_druk;
        if (!obj.filter_druk_uit) obj.filter_druk_uit = obj.filter_druk;
        if (!obj.filter_druk_peuterbad) obj.filter_druk_peuterbad = obj.filter_druk;
    }
    delete obj.temperatuur;
    delete obj.flow;
    delete obj.filter_druk;

    return obj;
}

/**
 * Return the hardcoded default limit definitions.
 */
function getDefaults() {
    const obj = {};
    DEFAULT_LIMIETEN.forEach(l => {
        obj[l.parameter_naam] = { min: l.min_waarde, max: l.max_waarde };
    });
    return obj;
}

/**
 * Insert all default limit definitions, skipping any that already exist.
 */
async function seedDefaults() {
    for (const l of DEFAULT_LIMIETEN) {
        await pool.execute(
            'INSERT IGNORE INTO limieten (parameter_naam, min_waarde, max_waarde) VALUES (?, ?, ?)',
            [l.parameter_naam, l.min_waarde, l.max_waarde]
        );
    }
}

/**
 * Save or update a limit definition.
 */
async function save({ parameter_naam, min_waarde, max_waarde }) {
    await pool.execute(
        'INSERT INTO limieten (parameter_naam, min_waarde, max_waarde) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE min_waarde = VALUES(min_waarde), max_waarde = VALUES(max_waarde)',
        [parameter_naam, min_waarde, max_waarde]
    );
}

module.exports = { getAll, getDefaults, seedDefaults, save };
