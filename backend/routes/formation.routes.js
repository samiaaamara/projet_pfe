const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  db.query('SELECT * FROM formations', (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

router.post('/', (req, res) => {
  const { titre, description, date_debut, formateur_id } = req.body;

  const sql = `
    INSERT INTO formations (titre, description, date_debut, formateur_id)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [titre, description, date_debut, formateur_id], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ message: 'Formation ajoutée avec succès' });
  });
});

module.exports = router;
router.post('/inscription', (req, res) => {
  const { etudiant_id, formation_id } = req.body;

  // Vérifier s'il est déjà inscrit
  const checkSql = `
    SELECT * FROM inscriptions
    WHERE etudiant_id = ? AND formation_id = ?
  `;

  db.query(checkSql, [etudiant_id, formation_id], (err, rows) => {
    if (err) return res.status(500).json(err);

    if (rows.length > 0) {
      return res.status(400).json({
        message: "Vous êtes déjà inscrit à cette formation ❌"
      });
    }

    // Inscription
    const insertSql = `
      INSERT INTO inscriptions (etudiant_id, formation_id, statut)
      VALUES (?, ?, 'en cours')
    `;

    db.query(insertSql, [etudiant_id, formation_id], (err) => {
      if (err) return res.status(500).json(err);

      res.json({ message: "Inscription réussie ✅" });
    });
  });
});
