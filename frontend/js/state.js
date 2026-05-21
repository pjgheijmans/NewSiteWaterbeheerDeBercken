// Stel de datum standaard in op vandaag via de lokale tijdzone van de computer
    const vandaagLocal = new Date();
    document.getElementById('centraleDatum').value = `${vandaagLocal.getFullYear()}-${String(vandaagLocal.getMonth() + 1).padStart(2, '0')}-${String(vandaagLocal.getDate()).padStart(2, '0')}`;

    let huidigeRol = 'waterbeheer';
    let huidigeBadPagina = 'grote-baden';
    let huidigeSubtab = 'meetwaarden';
    let huidigeTrendSubtab = 'meetwaarden';
    let trendCharts = {};
    let gecachteData = [];
    let actieveLimieten = {};
    let ingelogdeGebruiker = null;
    let berichtTimer = null;
