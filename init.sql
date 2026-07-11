-- Schema-definitie voor de Digitale Dagstaat. Wordt idempotent toegepast via
-- runInitSql() (per statement, met try/catch) — zie bin/init-db.php.
--
-- De tabellen staan hier in hun definitieve vorm: eerdere per-kolom-migraties
-- (ALTER TABLE) zijn opgenomen in de CREATE-definities. Voor een BESTAANDE
-- database met een oudere structuur voegt "CREATE TABLE IF NOT EXISTS" geen
-- ontbrekende kolommen toe; zulke databases moeten éénmalig los worden
-- bijgewerkt. Nieuwe schema-wijzigingen: pas de CREATE aan én, waar een
-- bestaande database mee moet, voeg tijdelijk een kale ALTER toe (GEEN
-- "IF NOT EXISTS" — dat is MariaDB-syntax en een harde fout op MySQL 8;
-- runInitSql vangt de onschadelijke "Duplicate column" op).

CREATE TABLE IF NOT EXISTS baden (
    id INT AUTO_INCREMENT PRIMARY KEY,
    naam VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS metingen_coordinatoren (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bad_id INT,
    datum DATE NOT NULL,
    tijdstip TIME NOT NULL DEFAULT '00:00:00',
    auteur VARCHAR(100) NULL,
    ph_waarde DECIMAL(4,2) NULL,
    chloor_waarde DECIMAL(4,2) NULL,
    chloor_vrij DECIMAL(4,2) NULL,
    chloor_totaal DECIMAL(4,2) NULL,
    chloor_gebonden DECIMAL(4,2) NULL,
    watertemperatuur DECIMAL(3,1) NULL,
    helderheid VARCHAR(20) NULL,
    bad_gebruikt TINYINT(1) NULL,
    FOREIGN KEY (bad_id) REFERENCES baden(id),
    UNIQUE KEY unieke_meting_coord (bad_id, datum, tijdstip)
);

CREATE TABLE IF NOT EXISTS metingen_diep_ondiep (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bad_id INT,
    datum DATE NOT NULL,
    ph_waarde DECIMAL(4,2) NULL,
    chloor_waarde DECIMAL(4,2) NULL,
    temperatuur DECIMAL(4,1) NULL,
    flow INT NULL,
    filter_druk_in DECIMAL(4,2) NULL,
    filter_druk_uit DECIMAL(4,2) NULL,
    kathodische_bescherming DECIMAL(4,2) NULL,
    water DECIMAL(10,2) NULL,
    versie INT NOT NULL DEFAULT 0,
    auteur VARCHAR(100) NULL,
    bijgewerkt_op TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (bad_id) REFERENCES baden(id),
    UNIQUE KEY unieke_meting_diep_ondiep (bad_id, datum)
);

CREATE TABLE IF NOT EXISTS metingen_peuterbad (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bad_id INT,
    datum DATE NOT NULL,
    ph_waarde DECIMAL(4,2) NULL,
    chloor_waarde DECIMAL(4,2) NULL,
    flow INT NULL,
    filter_druk_in DECIMAL(4,2) NULL,
    water INT NULL,
    chemicalien_chloor INT NULL,
    chemicalien_zwavelzuur INT NULL,
    versie INT NOT NULL DEFAULT 0,
    auteur VARCHAR(100) NULL,
    bijgewerkt_op TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (bad_id) REFERENCES baden(id),
    UNIQUE KEY unieke_meting_peuterbad (bad_id, datum)
);

INSERT IGNORE INTO baden (naam) VALUES ('Diep'), ('Ondiep'), ('Peuterbad');

-- Tabel voor de centrale limieten. min/max zijn DECIMAL(10,2) zodat grote
-- meterstanden passen.
CREATE TABLE IF NOT EXISTS limieten (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parameter_naam VARCHAR(50) NULL UNIQUE,
    min_waarde DECIMAL(10,2) NULL,
    max_waarde DECIMAL(10,2) NULL
);

-- Standaard limieten invoeren bij de eerste start
INSERT IGNORE INTO limieten (parameter_naam, min_waarde, max_waarde) VALUES
('ph_waarde', 6.80, 7.60),
('chloor_waarde', 0.50, 1.50),
('flow_diep', 250.00, 450.00),
('flow_ondiep', 50.00, 120.00),
('flow_peuterbad', 3.00, 10.00),
('filter_druk_in', 0.20, 1.50),
('filter_druk_uit', 0.20, 1.50),
('filter_druk_peuterbad', 0.20, 1.50),
('kathodische_bescherming', 0.20, 2.50),
('watertemperatuur', 20.00, 30.00),
('elektriciteit_nacht', 0.00, 500.00),
('elektriciteit_dag', 0.00, 500.00),
('gas', 0.00, 500.00),
('water_diep', 0.00, 99999.00),
('water_ondiep', 0.00, 99999.00),
('water_totaal', 0.00, 99999.00),
('water_peuterbad', 0.00, 99999.00),
('chloor_vrij', 0.50, 1.50),
('chloor_totaal', 0.30, 3.50),
('chloor_gebonden', 0.30, 3.50),
-- Actie-drempelwaarden (max_waarde = drempelwaarde; actie wanneer gemeten waarde deze overschrijdt/onderschrijdt)
('actie_druk_verschil', 0.00, 0.40),
('actie_druk_peuterbad', 0.00, 1.00),
('actie_flow_diep', 0.00, 250.00),
('actie_flow_ondiep', 0.00, 75.00),
('actie_flow_peuterbad', 0.00, 4.00),
('actie_chloor_min', 0.00, 200.00),
('actie_zwavelzuur_min', 0.00, 50.00),
('actie_bezoekers_max', 0.00, 750.00),
('actie_spoelbeurt_max', 0.00, 1500.00),
('actie_spoelbeurt_dagen', 0.00, 7.00),
('actie_Flocculant_min', 0.00, 10.00),
('actie_gebonden_chloor_max', 0.00, 1.00),
('actie_chloor_peuterbad_min', 0.00, 10.00),
('actie_zwavelzuur_peuterbad_min', 0.00, 5.00),
('seizoen_begin', 0.00, 20260425.00),
('seizoen_eind', 0.00, 20260901.00);

-- taak is vervangen door rollen (zie hieronder); mag daarom leeg zijn en blijft
-- alleen behouden voor backfill/legacy.
CREATE TABLE IF NOT EXISTS gebruikers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    voornaam VARCHAR(50) NOT NULL,
    achternaam VARCHAR(50) NOT NULL,
    inlognaam VARCHAR(50) NOT NULL UNIQUE,
    wachtwoord VARCHAR(255) NOT NULL,
    taak ENUM('waterbeheerder', 'coordinator', 'Administrator') NULL);

INSERT IGNORE INTO gebruikers (voornaam, achternaam, inlognaam, wachtwoord, taak) VALUES ('Admin', '', 'Admin', 'lpphw', 'Administrator');
INSERT IGNORE INTO gebruikers (voornaam, achternaam, inlognaam, wachtwoord, taak) VALUES ('Paul', 'Heijmans', 'pheijmans', 'Paul', 'waterbeheerder');

-- ── Rollen & rechten (RBAC) ───────────────────────────────────────────────────
-- Een rol bundelt rechten per domein (beheer/waterbeheer/coordinator). Een gebruiker
-- kan meerdere rollen hebben; zijn effectieve recht per domein is het HOOGSTE niveau
-- over al zijn rollen, en mag_historie_bewerken geldt als minstens een rol het heeft.
CREATE TABLE IF NOT EXISTS rollen (
    id INT AUTO_INCREMENT PRIMARY KEY,
    naam VARCHAR(50) NOT NULL UNIQUE,
    mag_historie_bewerken TINYINT(1) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rol_rechten (
    rol_id INT NOT NULL,
    domein ENUM('beheer', 'waterbeheer', 'coordinator') NOT NULL,
    niveau ENUM('geen', 'lezen', 'schrijven') NOT NULL DEFAULT 'geen',
    PRIMARY KEY (rol_id, domein),
    FOREIGN KEY (rol_id) REFERENCES rollen(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS gebruiker_rollen (
    gebruiker_id INT NOT NULL,
    rol_id INT NOT NULL,
    PRIMARY KEY (gebruiker_id, rol_id),
    FOREIGN KEY (gebruiker_id) REFERENCES gebruikers(id) ON DELETE CASCADE,
    FOREIGN KEY (rol_id) REFERENCES rollen(id) ON DELETE CASCADE
);

-- Standaardrollen (idempotent).
INSERT IGNORE INTO rollen (naam, mag_historie_bewerken) VALUES ('Beheer', 1);
INSERT IGNORE INTO rollen (naam, mag_historie_bewerken) VALUES ('Waterbeheer', 1);
INSERT IGNORE INTO rollen (naam, mag_historie_bewerken) VALUES ('Coordinator', 0);

-- Rechtenmatrix per standaardrol (idempotent via INSERT IGNORE op de samengestelde PK).
INSERT IGNORE INTO rol_rechten (rol_id, domein, niveau) SELECT id, 'beheer',      'schrijven' FROM rollen WHERE naam='Beheer';
INSERT IGNORE INTO rol_rechten (rol_id, domein, niveau) SELECT id, 'waterbeheer', 'geen'      FROM rollen WHERE naam='Beheer';
INSERT IGNORE INTO rol_rechten (rol_id, domein, niveau) SELECT id, 'coordinator', 'geen'      FROM rollen WHERE naam='Beheer';
INSERT IGNORE INTO rol_rechten (rol_id, domein, niveau) SELECT id, 'beheer',      'geen'      FROM rollen WHERE naam='Waterbeheer';
INSERT IGNORE INTO rol_rechten (rol_id, domein, niveau) SELECT id, 'waterbeheer', 'schrijven' FROM rollen WHERE naam='Waterbeheer';
INSERT IGNORE INTO rol_rechten (rol_id, domein, niveau) SELECT id, 'coordinator', 'schrijven' FROM rollen WHERE naam='Waterbeheer';
INSERT IGNORE INTO rol_rechten (rol_id, domein, niveau) SELECT id, 'beheer',      'geen'      FROM rollen WHERE naam='Coordinator';
INSERT IGNORE INTO rol_rechten (rol_id, domein, niveau) SELECT id, 'waterbeheer', 'geen'      FROM rollen WHERE naam='Coordinator';
INSERT IGNORE INTO rol_rechten (rol_id, domein, niveau) SELECT id, 'coordinator', 'schrijven' FROM rollen WHERE naam='Coordinator';

-- Eenmalige backfill: koppel bestaande gebruikers aan de rol die bij hun oude taak hoort.
-- Draait alleen voor gebruikers die nog geen enkele rol hebben, dus idempotent en niet-destructief.
INSERT IGNORE INTO gebruiker_rollen (gebruiker_id, rol_id)
    SELECT g.id, r.id FROM gebruikers g JOIN rollen r ON r.naam='Beheer'
    WHERE g.taak='Administrator' AND NOT EXISTS (SELECT 1 FROM gebruiker_rollen gr WHERE gr.gebruiker_id=g.id);
INSERT IGNORE INTO gebruiker_rollen (gebruiker_id, rol_id)
    SELECT g.id, r.id FROM gebruikers g JOIN rollen r ON r.naam='Waterbeheer'
    WHERE g.taak='waterbeheerder' AND NOT EXISTS (SELECT 1 FROM gebruiker_rollen gr WHERE gr.gebruiker_id=g.id);
INSERT IGNORE INTO gebruiker_rollen (gebruiker_id, rol_id)
    SELECT g.id, r.id FROM gebruikers g JOIN rollen r ON r.naam='Coordinator'
    WHERE g.taak='coordinator' AND NOT EXISTS (SELECT 1 FROM gebruiker_rollen gr WHERE gr.gebruiker_id=g.id);

-- Generieke configuratie (sleutel/waarde). Beheerbaar door Administrator.
CREATE TABLE IF NOT EXISTS configuratie (
    sleutel       VARCHAR(64)  NOT NULL PRIMARY KEY,
    waarde        VARCHAR(255) NOT NULL,
    omschrijving  VARCHAR(255) NULL,
    type          VARCHAR(20)  NOT NULL DEFAULT 'tekst',
    bijgewerkt_op TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
INSERT IGNORE INTO configuratie (sleutel, waarde, omschrijving, type) VALUES
('sessie_timeout_minuten', '5', 'Sessie-time-out (idle/sliding) in minuten', 'getal');

-- Vrij-tekst logboek voor waterbeheerders
CREATE TABLE IF NOT EXISTS logboek (
    id INT AUTO_INCREMENT PRIMARY KEY,
    datum DATE NOT NULL,
    tijdstip DATETIME NOT NULL,
    auteur VARCHAR(100) NULL,
    tekst TEXT NOT NULL,
    UNIQUE KEY uniek_logboek (datum, tijdstip),
    INDEX idx_logboek_datum (datum)
);

-- Vrij-tekst logboek voor coördinatoren
CREATE TABLE IF NOT EXISTS coordinatoren_logboek (
    id INT AUTO_INCREMENT PRIMARY KEY,
    datum DATE NOT NULL,
    tijdstip DATETIME NOT NULL,
    auteur VARCHAR(100) NULL,
    tekst TEXT NOT NULL,
    UNIQUE KEY uniek_coord_logboek (datum, tijdstip),
    INDEX idx_coord_logboek_datum (datum)
);

-- Dagelijkse temperatuur en bezoekers voor coördinatoren. Het cumulatieve
-- bezoekersaantal sinds de laatste spoelbeurt wordt op aanvraag berekend
-- (ActiesRepository::berekenSpoelbeurt, som van bezoekers_vandaag) en niet
-- opgeslagen; er is dus géén kolom bezoekers_totaal_spoelbeurt.
CREATE TABLE IF NOT EXISTS coordinatoren_daggegevens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    datum DATE NOT NULL UNIQUE,
    lucht_temperatuur DECIMAL(4,1) NULL,
    bezoekers_vandaag INT NULL,
    auteur VARCHAR(100) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Migratie: verwijder de ongebruikte kolom bezoekers_totaal_spoelbeurt uit
-- bestaande databases (werd nooit gevuld; de waarde is berekend, niet opgeslagen).
-- Kale DROP COLUMN — op een DB zonder de kolom faalt dit onschadelijk
-- ("Can't DROP"), wat runInitSql opvangt.
ALTER TABLE coordinatoren_daggegevens DROP COLUMN bezoekers_totaal_spoelbeurt;

-- Wie was er op dienst bij waterbeheer (altijd 2 personen; één logt in, de ander
-- wordt handmatig ingevuld). Eén record per dag.
CREATE TABLE IF NOT EXISTS waterbeheer_dienst (
    datum DATE PRIMARY KEY,
    dienst_1 VARCHAR(100) NULL,
    dienst_2 VARCHAR(100) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Dagelijkse checklijst voor coördinatoren
CREATE TABLE IF NOT EXISTS coordinatoren_checklist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    datum DATE NOT NULL UNIQUE,
    proef_waterspeel TINYINT(1) NOT NULL DEFAULT 0,
    proef_spraypark  TINYINT(1) NOT NULL DEFAULT 0,
    proef_douches    TINYINT(1) NOT NULL DEFAULT 0,
    proef_glijbaan   TINYINT(1) NOT NULL DEFAULT 0,
    auteur VARCHAR(100) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabel voor acties/alarmen
CREATE TABLE IF NOT EXISTS acties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bad_id INT NOT NULL,
    datum DATE NOT NULL,
    beschrijving VARCHAR(255) NOT NULL,
    actie_type VARCHAR(50) NOT NULL,
    opgelost BOOLEAN DEFAULT FALSE,
    opgelost_op DATETIME NULL,
    opgelost_door VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bad_id) REFERENCES baden(id),
    UNIQUE KEY unieke_actie (bad_id, datum, actie_type)
);

-- Tabel voor de tekst-sjablonen van acties. De waterbeheerder kan de
-- formulering van een actie aanpassen zonder code te wijzigen. Plaatshouders
-- tussen accolades worden bij het genereren ingevuld: {bad} = badnaam,
-- {drempel} = grenswaarde, {waarde} = gemeten waarde.
CREATE TABLE IF NOT EXISTS actie_teksten (
    actie_sleutel VARCHAR(60) PRIMARY KEY,
    sjabloon      VARCHAR(255) NOT NULL,
    omschrijving  VARCHAR(255) NULL
);

-- Standaard actie-sjablonen bij de eerste start (idempotent).
INSERT IGNORE INTO actie_teksten (actie_sleutel, sjabloon, omschrijving) VALUES
('filter_spoelen_druk',         'Filterdruk verschil {bad} > {drempel} bar — Filter spoelen', 'Diep/Ondiep: drukverschil in-uit te hoog'),
('filter_spoelen_druk_peuter',  'Filterdruk Peuterbad > {drempel} bar — Filter spoelen',      'Peuterbad: filterdruk te hoog'),
('filter_spoelen_flow',         'Flow {bad} onder {drempel} m³/h — Filter spoelen',           'Diep/Ondiep: flow te laag'),
('filter_spoelen_flow_peuter',  'Flow Peuterbad onder {drempel} m³/h — Filter spoelen',       'Peuterbad: flow te laag'),
('chloor_peuterbad_bijvullen',  'Chloorvoorraad Peuterbad {waarde} < {drempel} — Vat bijvullen',      'Peuterbad: chloorvat bijna leeg'),
('zwavelzuur_peuterbad_bijvullen','Zwavelzuurvoorraad Peuterbad {waarde} < {drempel} — Vat bijvullen','Peuterbad: zwavelzuurvat bijna leeg'),
('chloor_bestellen',            'Chloorvoorraad onder {drempel} liter — Chloor bestellen',    'Verbruik: chloorvoorraad te laag'),
('zwavelzuur_bestellen',        'Zwavelzuurvoorraad onder {drempel} liter — Zwavelzuur bestellen','Verbruik: zwavelzuurvoorraad te laag'),
('Flocculant_bijvullen',         'Flocculant {waarde} < {drempel} — Vul Flocculant bij',         'Verbruik: Flocculant bijna op'),
('filter_spoelen_bezoekers',    'Aantal bezoekers op een dag {waarde} > {drempel} — Filter spoelen',     'Dagbezoek boven de drempel'),
('filter_spoelen_spoelbeurt',   'Aantal bezoekers sinds spoelbeurt {bad} {waarde} > {drempel} — Filter spoelen', 'Cumulatief bezoek sinds laatste spoelbeurt'),
('filter_spoelen_dagen',        'Laatste spoelbeurt {bad} {waarde} dagen geleden > {drempel} dagen — Filter spoelen', 'Te lang geleden sinds laatste spoelbeurt'),
('filter_spoelen_gebonden',     'Gebonden chloor {bad} {waarde} > {drempel} mg/l — Filter spoelen', 'Coördinator: gebonden chloor te hoog'),
('peuterbad_leeglaten',          'Peuterbad is vandaag gebruikt — Peuterbad water leeglaten',   'Peuterbad na gebruik leeglaten');

-- Tabel voor rondetaken (dagelijkse onderhoudstaken tijdens een ronde).
-- De takencatalogus zelf staat in code (RondetakenRepository); hier worden
-- alleen de afgevinkte taken per dag bewaard. Een nieuwe dag = geen rijen =
-- alles weer onafgevinkt.
CREATE TABLE IF NOT EXISTS rondetaken_voltooid (
    id INT AUTO_INCREMENT PRIMARY KEY,
    taak_sleutel VARCHAR(50) NOT NULL,
    datum DATE NOT NULL,
    voltooid_op DATETIME NULL,
    voltooid_door VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unieke_rondetaak (taak_sleutel, datum)
);

-- Verbruik diep/ondiep: water, elektriciteit, gas, chemicaliën (gehele getallen)
CREATE TABLE IF NOT EXISTS verbruik_diep_ondiep (
    id INT AUTO_INCREMENT PRIMARY KEY,
    datum DATE NOT NULL UNIQUE,
    Flocculant INT NULL,
    water_diep INT NULL,
    water_ondiep INT NULL,
    water_totaal INT NULL,
    elektriciteit_nacht INT NULL,
    elektriciteit_dag INT NULL,
    gas INT NULL,
    chemicalien_chloor INT NULL,
    chemicalien_zwavelzuur INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    versie INT NOT NULL DEFAULT 0,
    auteur VARCHAR(100) NULL,
    bijgewerkt_op TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Verwarmingssysteem: ketelstatus en inspecties
CREATE TABLE IF NOT EXISTS verwarmings_systeem_diep_ondiep (
    id INT AUTO_INCREMENT PRIMARY KEY,
    datum DATE NOT NULL UNIQUE,
    verwarming_status_1 BOOLEAN DEFAULT FALSE,
    verwarming_status_2 BOOLEAN DEFAULT FALSE,
    verwarming_status_3 BOOLEAN DEFAULT FALSE,
    verwarming_status_4 BOOLEAN DEFAULT FALSE,
    verwarming_druk_ok BOOLEAN DEFAULT FALSE,
    verwarming_visuele_controle BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    versie INT NOT NULL DEFAULT 0,
    auteur VARCHAR(100) NULL,
    bijgewerkt_op TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
