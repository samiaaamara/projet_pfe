const express = require('express');
const router = express.Router();
const db = require('../db');

// 🔹 Formations du formateur
router.get('/mes-formations/:formateurId', (req, res) => {
  const formateurId = parseInt(req.params.formateurId);
  if (isNaN(formateurId)) {
    return res.status(400).json({ error: 'Formateur ID invalide' });
  }

  const sql = 'SELECT * FROM formations WHERE formateur_id = ?';
  db.query(sql, [formateurId], (err, results) => {
    if (err) {
      console.error('Erreur SQL /mes-formations:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results); // renvoie un tableau même vide
  });
});

// 🔹 Étudiants inscrits à une formation
router.get('/inscriptions/:formationId', (req, res) => {
  const formationId = parseInt(req.params.formationId);
  if (isNaN(formationId)) {
    return res.status(400).json({ error: 'Formation ID invalide' });
  }

  const sql = `
    SELECT u.nom, u.email, i.date_inscription, i.statut
    FROM inscriptions i
    JOIN etudiants e ON i.etudiant_id = e.id
    JOIN users u ON e.user_id = u.id
    WHERE i.formation_id = ?
  `;

  db.query(sql, [formationId], (err, results) => {
    if (err) {
      console.error('Erreur SQL /inscriptions:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// 🔹 Créer une formation
router.post('/creer-formation', (req, res) => {
  const { titre, description, date_debut, formateur_id } = req.body;

  if (!titre || !description || !date_debut || !formateur_id) {
    return res.status(400).json({ error: 'Tous les champs sont obligatoires' });
  }

  const sql = `
    INSERT INTO formations (titre, description, date_debut, formateur_id)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [titre, description, date_debut, formateur_id], (err, results) => {
    if (err) {
      console.error('Erreur SQL /creer-formation:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Formation créée avec succès', id: results.insertId });
  });
});

// 🔹 Ajouter un support à une formation
router.post('/supports', (req, res) => {
  const { formation_id, type, fichier } = req.body;
  if (!formation_id || !type || !fichier) {
    return res.status(400).json({ error: 'Tous les champs sont obligatoires pour le support' });
  }

  const sql = `
    INSERT INTO supports (formation_id, type, fichier)
    VALUES (?, ?, ?)
  `;

  db.query(sql, [formation_id, type, fichier], (err, results) => {
    if (err) {
      console.error('Erreur SQL /supports:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Support ajouté ✅", id: results.insertId });
  });
});

module.exports = router;
