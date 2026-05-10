-- Migration : lier séances aux modules
-- À exécuter une seule fois sur la base de données

ALTER TABLE seances
  ADD COLUMN module_id INT NULL,
  ADD CONSTRAINT fk_seance_module
    FOREIGN KEY (module_id) REFERENCES modules_formation(id) ON DELETE SET NULL;
