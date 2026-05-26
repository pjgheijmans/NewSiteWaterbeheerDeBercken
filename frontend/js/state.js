/**
 * Initialize the visible date control to today's date in local timezone.
 */
    const vandaagLocal = new Date();
    document.getElementById('centraleDatum').value = `${vandaagLocal.getFullYear()}-${String(vandaagLocal.getMonth() + 1).padStart(2, '0')}-${String(vandaagLocal.getDate()).padStart(2, '0')}`;

/**
 * Application state variables used across multiple frontend modules.
 */
    let huidigeRol = 'waterbeheer';
    let huidigeBadPagina = 'grote-baden';
    let huidigeSubtab = 'meetwaarden';
    let huidigeCoordSubtab = 'metingen';
    let huidigeTrendSubtab = 'meetwaarden';
    let trendCharts = {};
    let gecachteData = [];
    let actieveLimieten = {};
    let ingelogdeGebruiker = null;
    let berichtTimer = null;
