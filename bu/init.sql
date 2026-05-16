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

CREATE TABLE IF NOT EXISTS metingen (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bad_id INT,
    datum DATE NOT NULL,
    ph_waarde DECIMAL(3,2) NOT NULL,
    chloor_waarde DECIMAL(3,2) NOT NULL,
    flow INT NOT NULL,
    filter_druk DECIMAL(3,2) NOT NULL,
    FOREIGN KEY (bad_id) REFERENCES baden(id),
    UNIQUE KEY unieke_meting (bad_id, datum)
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
('flow', 50.00, 200.00), 
('filter_druk', 0.20, 1.50), 
('watertemperatuur', 20.00, 30.00);
