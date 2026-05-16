CREATE TABLE IF NOT EXISTS baden (
    id INT AUTO_INCREMENT PRIMARY KEY,
    naam VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS metingen_coordinatoren (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bad_id INT,
    datum DATE NOT NULL,
    ph_waarde DECIMAL(3,2) NOT NULL,
    chloor_waarde DECIMAL(3,2) NOT NULL,
    watertemperatuur DECIMAL(3,1) NOT NULL,
    helderheid VARCHAR(20) NOT NULL, -- Bijv: 'Helder', 'Licht troebel', 'Troebel'
    FOREIGN KEY (bad_id) REFERENCES baden(id),
    UNIQUE KEY unieke_meting_coord (bad_id, datum)
);

CREATE TABLE IF NOT EXISTS metingen_grote_baden (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bad_id INT,
    datum DATE NOT NULL,
    ph_waarde DECIMAL(3,2) NOT NULL,
    chloor_waarde DECIMAL(3,2) NOT NULL,
    temperatuur DECIMAL(4,1) NULL,
    flow INT NOT NULL,
    filter_druk_in DECIMAL(4,2) NULL,
    filter_druk_uit DECIMAL(4,2) NULL,
    FOREIGN KEY (bad_id) REFERENCES baden(id),
    UNIQUE KEY unieke_meting_grote_baden (bad_id, datum)
);

CREATE TABLE IF NOT EXISTS metingen_peuterbad (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bad_id INT,
    datum DATE NOT NULL,
    ph_waarde DECIMAL(3,2) NOT NULL,
    chloor_waarde DECIMAL(3,2) NOT NULL,
    flow INT NULL,
    filter_druk_in DECIMAL(4,2) NULL,
    water VARCHAR(100) NULL,
    chemicalien_chloor VARCHAR(100) NULL,
    chemicalien_zwavelzuur VARCHAR(100) NULL,
    FOREIGN KEY (bad_id) REFERENCES baden(id),
    UNIQUE KEY unieke_meting_peuterbad (bad_id, datum)
);

INSERT IGNORE INTO baden (naam) VALUES ('Diep'), ('Ondiep'), ('Peuterbad');

-- Tabel voor de centrale limieten
CREATE TABLE IF NOT EXISTS limieten (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parameter_naam VARCHAR(50) NOT NULL UNIQUE,
    min_waarde DECIMAL(5,2) NOT NULL,
    max_waarde DECIMAL(5,2) NOT NULL
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
('watertemperatuur', 20.00, 30.00), 
('elektriciteit_nacht', 0.00, 500.00), 
('elektriciteit_dag', 0.00, 500.00), 
('gas', 0.00, 500.00);

CREATE TABLE IF NOT EXISTS gebruikers (id INT AUTO_INCREMENT PRIMARY KEY, voornaam VARCHAR(50) NOT NULL, achternaam VARCHAR(50) NOT NULL, inlognaam VARCHAR(50) NOT NULL UNIQUE, wachtwoord VARCHAR(255) NOT NULL, taak ENUM('waterbeheerder', 'coordinator', 'Administrator') NOT NULL);
INSERT IGNORE INTO gebruikers (voornaam, achternaam, inlognaam, wachtwoord, taak) VALUES ('Admin', '', 'Admin', 'lpphw', 'Administrator');
INSERT IGNORE INTO gebruikers (voornaam, achternaam, inlognaam, wachtwoord, taak) VALUES ('Paul', 'Heijmans', 'pheijmans', 'Paul', 'waterbeheerder');

-- Tabel voor acties/alarmen
CREATE TABLE IF NOT EXISTS acties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bad_id INT NOT NULL,
    datum DATE NOT NULL,
    beschrijving VARCHAR(255) NOT NULL,
    actie_type VARCHAR(50) NOT NULL,
    opgelost BOOLEAN DEFAULT FALSE,
    opgelost_op DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bad_id) REFERENCES baden(id),
    UNIQUE KEY unieke_actie (bad_id, datum, actie_type)
);
