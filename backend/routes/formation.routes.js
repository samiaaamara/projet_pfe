const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const [result] = await db.query('SELECT * FROM formations');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { titre, description, date_debut, formateur_id } = req.body;
  const sql = `INSERT INTO formations (titre, description, date_debut, formateur_id) VALUES (?, ?, ?, ?)`;
  try {
    await db.query(sql, [titre, description, date_debut, formateur_id]);
    res.json({ message: 'Formation ajoutée avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/inscription', async (req, res) => {
  const { etudiant_id, formation_id } = req.body;
  try {
    const [rows] = await db.query(
      'SELECT * FROM inscriptions WHERE etudiant_id = ? AND formation_id = ?',
      [etudiant_id, formation_id]
    );
    if (rows.length > 0) {
      return res.status(400).json({ message: 'Vous êtes déjà inscrit à cette formation ❌' });
    }
    await db.query(
      "INSERT INTO inscriptions (etudiant_id, formation_id, statut) VALUES (?, ?, 'en cours')",
      [etudiant_id, formation_id]
    );
    res.json({ message: 'Inscription réussie ✅' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
