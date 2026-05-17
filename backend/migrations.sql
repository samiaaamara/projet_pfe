-- Migration: add prix + payment_ref to formations/inscriptions_externes
-- Run once against MySQL database

-- ============================================================
-- MIGRATION: etudiant → candidat
-- ============================================================

-- 1. Modifier le ENUM du rôle dans users
ALTER TABLE users MODIFY COLUMN role ENUM('candidat','formateur','admin','externe') NOT NULL;

-- 2. Renommer la table etudiants → candidats
RENAME TABLE etudiants TO candidats;

-- 3. Ajouter la colonne entreprise dans candidats (optionnelle)
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS entreprise VARCHAR(150) DEFAULT NULL;

-- 4. Renommer les colonnes etudiant_id → candidat_id dans les tables dépendantes
ALTER TABLE inscriptions
  CHANGE COLUMN etudiant_id candidat_id INT NOT NULL;

ALTER TABLE presences
  CHANGE COLUMN etudiant_id candidat_id INT NOT NULL;

ALTER TABLE liste_attente
  CHANGE COLUMN etudiant_id candidat_id INT NOT NULL;

ALTER TABLE justificatifs
  CHANGE COLUMN etudiant_id candidat_id INT NOT NULL;

-- 5. Renommer la table progression_etudiants → progression_candidats
RENAME TABLE progression_etudiants TO progression_candidats;

-- 6. Renommer la colonne dans progression_candidats
ALTER TABLE progression_candidats
  CHANGE COLUMN etudiant_id candidat_id INT NOT NULL;

-- 7. Mettre à jour la valeur du rôle pour les utilisateurs existants
UPDATE users SET role = 'candidat' WHERE role = 'etudiant';

-- ============================================================

-- Rendre date_debut nullable (c'est l'admin qui fixe les dates)
ALTER TABLE formations MODIFY COLUMN date_debut DATE NULL;

-- Photo de profil utilisateur
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_profil VARCHAR(255) DEFAULT NULL;

ALTER TABLE formations ADD COLUMN IF NOT EXISTS specialite VARCHAR(100) DEFAULT NULL;
ALTER TABLE formations ADD COLUMN IF NOT EXISTS prix DECIMAL(10,2) NOT NULL DEFAULT 0.00;

CREATE TABLE IF NOT EXISTS inscriptions_externes (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  externe_id         INT NOT NULL,
  formation_id       INT NOT NULL,
  montant            DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  statut_paiement    ENUM('en_attente','payé') NOT NULL DEFAULT 'en_attente',
  statut_inscription ENUM('en_attente','confirmé','annulé') NOT NULL DEFAULT 'en_attente',
  payment_ref        VARCHAR(100) DEFAULT NULL,
  date_paiement      DATETIME DEFAULT NULL,
  date_inscription   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_externe_formation (externe_id, formation_id),
  FOREIGN KEY (formation_id) REFERENCES formations(id) ON DELETE CASCADE
);

-- If table already exists, add payment_ref column:
ALTER TABLE inscriptions_externes ADD COLUMN IF NOT EXISTS payment_ref VARCHAR(100) DEFAULT NULL;

-- Colonne module_id dans séances (rattacher une séance à un module)
ALTER TABLE seances ADD COLUMN IF NOT EXISTS module_id INT DEFAULT NULL,
  ADD FOREIGN KEY IF NOT EXISTS (module_id) REFERENCES modules_formation(id) ON DELETE SET NULL;

-- Programme de formation (description globale + objectifs + prérequis)
CREATE TABLE IF NOT EXISTS programme_formations (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  formation_id        INT NOT NULL,
  description_globale TEXT,
  objectifs           TEXT,
  prerequis           TEXT,
  UNIQUE KEY uq_prog_formation (formation_id),
  FOREIGN KEY (formation_id) REFERENCES formations(id) ON DELETE CASCADE
);

-- Modules / chapitres du programme
CREATE TABLE IF NOT EXISTS modules_formation (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  formation_id INT NOT NULL,
  titre        VARCHAR(200) NOT NULL,
  description  TEXT,
  duree_heures DECIMAL(5,2) DEFAULT NULL,
  ordre        INT          DEFAULT 0,
  FOREIGN KEY (formation_id) REFERENCES formations(id) ON DELETE CASCADE
);

-- Séances (sessions d'une formation présentielle)
CREATE TABLE IF NOT EXISTS seances (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  formation_id INT NOT NULL,
  date_seance  DATE NOT NULL,
  heure_debut  TIME NOT NULL,
  heure_fin    TIME NOT NULL,
  salle        VARCHAR(100) DEFAULT NULL,
  statut       ENUM('planifiée','en_cours','terminée') NOT NULL DEFAULT 'planifiée',
  FOREIGN KEY (formation_id) REFERENCES formations(id) ON DELETE CASCADE
);

-- Présences (feuille d'émargement par séance)
CREATE TABLE IF NOT EXISTS presences (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  seance_id   INT NOT NULL,
  etudiant_id INT NOT NULL,
  statut      ENUM('présent','absent','retard','excusé') NOT NULL DEFAULT 'absent',
  UNIQUE KEY uq_presence (seance_id, etudiant_id),
  FOREIGN KEY (seance_id)   REFERENCES seances(id)   ON DELETE CASCADE,
  FOREIGN KEY (etudiant_id) REFERENCES etudiants(id) ON DELETE CASCADE
);

-- Table des spécialités (référentiel commun)
CREATE TABLE IF NOT EXISTS specialites (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  nom  VARCHAR(100) NOT NULL UNIQUE
);

INSERT IGNORE INTO specialites (nom) VALUES
  ('Informatique'),
  ('Réseaux'),
  ('Génie logiciel'),
  ('Intelligence artificielle'),
  ('Cybersécurité'),
  ('Marketing'),
  ('Finance'),
  ('Mécanique'),
  ('Génie civil'),
  ('Génie électrique');

-- Liste d'attente (quand formation complète)
CREATE TABLE IF NOT EXISTS liste_attente (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  etudiant_id  INT NOT NULL,
  formation_id INT NOT NULL,
  date_ajout   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attente (etudiant_id, formation_id),
  FOREIGN KEY (etudiant_id)  REFERENCES etudiants(id)  ON DELETE CASCADE,
  FOREIGN KEY (formation_id) REFERENCES formations(id) ON DELETE CASCADE
);

-- Justificatifs d'absence
CREATE TABLE IF NOT EXISTS justificatifs (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  etudiant_id      INT NOT NULL,
  seance_id        INT NOT NULL,
  motif            TEXT NOT NULL,
  fichier          VARCHAR(255) DEFAULT NULL,
  statut           ENUM('en_attente','accepté','refusé') NOT NULL DEFAULT 'en_attente',
  date_soumission  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_just (etudiant_id, seance_id),
  FOREIGN KEY (seance_id)    REFERENCES seances(id)   ON DELETE CASCADE,
  FOREIGN KEY (etudiant_id)  REFERENCES etudiants(id) ON DELETE CASCADE
);

-- ============================================================
-- QUIZ SYSTEM
-- ============================================================

-- Quiz lié à une formation (un seul quiz par formation)
CREATE TABLE IF NOT EXISTS quiz (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  formation_id    INT NOT NULL UNIQUE,
  titre           VARCHAR(200) NOT NULL DEFAULT 'Quiz de validation',
  seuil_reussite  INT NOT NULL DEFAULT 70,
  nb_tentatives   INT NOT NULL DEFAULT 3,
  FOREIGN KEY (formation_id) REFERENCES formations(id) ON DELETE CASCADE
);

-- Questions du quiz
CREATE TABLE IF NOT EXISTS questions_quiz (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id   INT NOT NULL,
  question  TEXT NOT NULL,
  ordre     INT DEFAULT 0,
  FOREIGN KEY (quiz_id) REFERENCES quiz(id) ON DELETE CASCADE
);

-- Réponses possibles pour chaque question (QCM)
CREATE TABLE IF NOT EXISTS reponses_quiz (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  question_id  INT NOT NULL,
  reponse      TEXT NOT NULL,
  est_correcte BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (question_id) REFERENCES questions_quiz(id) ON DELETE CASCADE
);

-- Tentatives des candidats/externes
CREATE TABLE IF NOT EXISTS tentatives_quiz (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  candidat_id     INT DEFAULT NULL,
  externe_id      INT DEFAULT NULL,
  quiz_id         INT NOT NULL,
  score           INT NOT NULL,
  reussi          BOOLEAN NOT NULL DEFAULT FALSE,
  date_tentative  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quiz_id) REFERENCES quiz(id) ON DELETE CASCADE
);

-- ============================================================

-- Progression des candidats par module
CREATE TABLE IF NOT EXISTS progression_candidats (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  candidat_id  INT NOT NULL,
  formation_id INT NOT NULL,
  module_id    INT NOT NULL,
  statut       ENUM('non_commence', 'en_cours', 'termine') NOT NULL DEFAULT 'non_commence',
  date_maj     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_prog (candidat_id, formation_id, module_id),
  FOREIGN KEY (candidat_id)  REFERENCES candidats(id)         ON DELETE CASCADE,
  FOREIGN KEY (formation_id) REFERENCES formations(id)        ON DELETE CASCADE,
  FOREIGN KEY (module_id)    REFERENCES modules_formation(id) ON DELETE CASCADE
);
