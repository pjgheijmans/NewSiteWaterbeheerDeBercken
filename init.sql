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
    water DECIMAL(10,2) NULL,
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
    FOREIGN KEY (bad_id) REFERENCES baden(id),
    UNIQUE KEY unieke_meting_peuterbad (bad_id, datum)
);

INSERT IGNORE INTO baden (naam) VALUES ('Diep'), ('Ondiep'), ('Peuterbad');

-- Tabel voor de centrale limieten
CREATE TABLE IF NOT EXISTS limieten (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parameter_naam VARCHAR(50) NULL UNIQUE,
    min_waarde DECIMAL(5,2) NULL,
    max_waarde DECIMAL(5,2) NULL
);

-- Widen limit columns to support large meter readings
ALTER TABLE limieten MODIFY min_waarde DECIMAL(10,2) NULL;
ALTER TABLE limieten MODIFY max_waarde DECIMAL(10,2) NULL;

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
('actie_floculant_min', 0.00, 10.00),
('actie_gebonden_chloor_max', 0.00, 1.00),
('actie_chloor_peuterbad_min', 0.00, 10.00),
('actie_zwavelzuur_peuterbad_min', 0.00, 5.00),
('seizoen_begin', 0.00, 20260425.00),
('seizoen_eind', 0.00, 20260901.00);

CREATE TABLE IF NOT EXISTS gebruikers (
    id INT AUTO_INCREMENT PRIMARY KEY, 
    voornaam VARCHAR(50) NOT NULL, 
    achternaam VARCHAR(50) NOT NULL, 
    inlognaam VARCHAR(50) NOT NULL UNIQUE, 
    wachtwoord VARCHAR(255) NOT NULL, 
    taak ENUM('waterbeheerder', 'coordinator', 'Administrator') NOT NULL);
    
INSERT IGNORE INTO gebruikers (voornaam, achternaam, inlognaam, wachtwoord, taak) VALUES ('Admin', '', 'Admin', 'lpphw', 'Administrator');
INSERT IGNORE INTO gebruikers (voornaam, achternaam, inlognaam, wachtwoord, taak) VALUES ('Paul', 'Heijmans', 'pheijmans', 'Paul', 'waterbeheerder');

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

-- Dagelijkse temperatuur en bezoekers voor coördinatoren
CREATE TABLE IF NOT EXISTS coordinatoren_daggegevens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    datum DATE NOT NULL UNIQUE,
    lucht_temperatuur DECIMAL(4,1) NULL,
    bezoekers_vandaag INT NULL,
    bezoekers_totaal_spoelbeurt INT NULL,
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

-- Migratie: voeg opgelost_door toe aan acties
ALTER TABLE acties ADD COLUMN IF NOT EXISTS opgelost_door VARCHAR(100) NULL AFTER opgelost_op;

-- Verbruik diep/ondiep: water, elektriciteit, gas, chemicaliën (gehele getallen)
CREATE TABLE IF NOT EXISTS verbruik_diep_ondiep (
    id INT AUTO_INCREMENT PRIMARY KEY,
    datum DATE NOT NULL UNIQUE,
    floculant INT NULL,
    water_diep INT NULL,
    water_ondiep INT NULL,
    water_totaal INT NULL,
    elektriciteit_nacht INT NULL,
    elektriciteit_dag INT NULL,
    gas INT NULL,
    chemicalien_chloor INT NULL,
    chemicalien_zwavelzuur INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Migratie: voeg auteur toe aan metingen_coordinatoren
ALTER TABLE metingen_coordinatoren ADD COLUMN IF NOT EXISTS auteur VARCHAR(100) NULL AFTER tijdstip;

-- Migratie: voeg auteur toe aan logboek tabellen
ALTER TABLE logboek ADD COLUMN IF NOT EXISTS auteur VARCHAR(100) NULL AFTER tijdstip;
ALTER TABLE coordinatoren_logboek ADD COLUMN IF NOT EXISTS auteur VARCHAR(100) NULL AFTER tijdstip;

-- Migratie: verwijder opmerkingen kolom uit coordinatoren_checklist
ALTER TABLE coordinatoren_checklist DROP COLUMN IF EXISTS opmerkingen;

-- Migratie: verbruik velden naar INT (meters geven gehele getallen, geen decimalen)
ALTER TABLE verbruik_diep_ondiep
    MODIFY floculant          INT NULL,
    MODIFY water_diep         INT NULL,
    MODIFY water_ondiep       INT NULL,
    MODIFY water_totaal       INT NULL,
    MODIFY elektriciteit_nacht INT NULL,
    MODIFY elektriciteit_dag  INT NULL,
    MODIFY gas                INT NULL,
    MODIFY chemicalien_chloor INT NULL,
    MODIFY chemicalien_zwavelzuur INT NULL;

-- Migratie: peuterbad water en chemicaliën naar INT
ALTER TABLE metingen_peuterbad
    MODIFY water               INT NULL,
    MODIFY chemicalien_chloor  INT NULL,
    MODIFY chemicalien_zwavelzuur INT NULL;
