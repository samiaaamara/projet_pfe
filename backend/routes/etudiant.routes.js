const express = require('express');
const router = express.Router();
const db = require('../db');

/* =========================
   📚 Toutes les formations
========================= */
router.get('/formations/:etudiantId', (req, res) => {
  const { etudiantId } = req.params;

  const sql = `
    SELECT f.*
    FROM formations f
    JOIN etudiants e ON e.id = ?
    WHERE f.specialite = e.specialite
  `;

  db.query(sql, [etudiantId], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

/* =========================
   ✅ Inscription à une formation
========================= */
router.post('/inscription', (req, res) => {
  const { etudiant_id, formation_id } = req.body;

  const sql = `
    INSERT INTO inscriptions (etudiant_id, formation_id, statut, date_inscription)
    VALUES (?, ?, 'Inscrit', NOW())
  `;

  db.query(sql, [etudiant_id, formation_id], (err) => {
    if (err) return res.status(500).json(err);

    res.json({ message: 'Inscription réussie' });
  });
});

/* =========================
   📌 Mes formations
========================= */
router.get('/mes-formations/:etudiantId', (req, res) => {
  const etudiantId = req.params.etudiantId;

  const sql = `
    SELECT f.titre, f.description, i.statut, i.date_inscription
    FROM inscriptions i
    JOIN formations f ON i.formation_id = f.id
    WHERE i.etudiant_id = ?
  `;

  db.query(sql, [etudiantId], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

/* =========================
   📎 Supports pédagogiques
========================= */
router.get('/supports/:formationId', (req, res) => {
  const { formationId } = req.params;

  const sql = `
    SELECT id, type, fichier
    FROM supports
    WHERE formation_id = ?
  `;

  db.query(sql, [formationId], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

/* =========================
   📈 Progression étudiant
========================= */
router.get('/progression/:etudiantId', (req, res) => {
  const { etudiantId } = req.params;

  db.query(
    'SELECT progression FROM etudiants WHERE id = ?',
    [etudiantId],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result[0]);
    }
  );
});

module.exports = router;
