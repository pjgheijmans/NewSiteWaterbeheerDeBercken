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

const JS_FILES = [
    'state', 'api', 'ui', 'limieten', 'auth',
    'metingen', 'verbruik', 'opslaan',
    'gebruikers', 'database', 'nav', 'trend', 'app',
];

function readPartial(name) {
    return fs.readFileSync(path.join(PARTIALS, name + '.html'), 'utf8');
}

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
