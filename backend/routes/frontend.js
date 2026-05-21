const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const PARTIALS = path.join(__dirname, '..', '..', 'frontend', 'partials');

const ORDER = [
    'head',
    'login',
    'dashboard-open',
    'nav',
    'dagstaat',
    'limieten',
    'gebruikers',
    'database',
    'trendanalyse',
    'footer',
];

/**
 * List of browser script files injected into the assembled frontend page.
 */
const JS_FILES = [
    'state', 'api', 'ui', 'limieten', 'auth',
    'metingen', 'verbruik', 'opslaan',
    'gebruikers', 'database', 'nav', 'trend', 'app',
];

/**
 * Read a frontend partial file from disk.
 * @param {string} name - Partial name without extension.
 * @returns {string} HTML fragment.
 */
function readPartial(name) {
    return fs.readFileSync(path.join(PARTIALS, name + '.html'), 'utf8');
}

/**
 * Assemble the full HTML response from partial fragments and the script list.
 */
router.get('/', (req, res) => {
    const scripts = JS_FILES
        .map(f => `<script src="/js/${f}.js"></script>`)
        .join('\n    ');

    const body = ORDER.map(readPartial).join('\n');

    const page = `${body}
    ${scripts}
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(page);
});

module.exports = router;
