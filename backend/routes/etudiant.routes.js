const express = require('express');
const router = express.Router();
const db = require('../db');

/* =========================
   📚 Toutes les formations
========================= */
router.get('/formations/:etudiantId', (req, res) => {
  const { etudiantId } = req.params;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const offset = (page - 1) * limit;

  const countSql = `SELECT COUNT(*) AS total FROM formations f
    JOIN etudiants e ON e.id = ? WHERE f.status = 'published'`;

  const dataSql = `SELECT f.*,
    (SELECT COUNT(*) FROM inscriptions WHERE formation_id = f.id) AS inscrits
    FROM formations f JOIN etudiants e ON e.id = ?
    WHERE f.status = 'published' ORDER BY f.date_debut DESC LIMIT ? OFFSET ?`;

  db.query(countSql, [etudiantId], (err, countResult) => {
    if (err) return res.status(500).json(err);
    const total = countResult[0].total;
    db.query(dataSql, [etudiantId, limit, offset], (err2, results) => {
      if (err2) return res.status(500).json(err2);
      res.json({ data: results, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    });
  });
});


/* =========================
   ✅ Inscription à une formation
========================= */
router.post('/inscription', (req, res) => {
  const { etudiant_id, formation_id } = req.body;

  if (!etudiant_id || !formation_id)
    return res.status(400).json({ message: 'etudiant_id et formation_id sont obligatoires' });

  db.query('SELECT id FROM inscriptions WHERE etudiant_id = ? AND formation_id = ?',
    [etudiant_id, formation_id], (err, existing) => {
      if (err) return res.status(500).json(err);
      if (existing.length > 0)
        return res.status(400).json({ message: 'Vous êtes déjà inscrit à cette formation' });

      db.query(
        `SELECT nb_places, (SELECT COUNT(*) FROM inscriptions WHERE formation_id = ?) AS inscrits
         FROM formations WHERE id = ? AND status = 'published'`,
        [formation_id, formation_id], (err2, results) => {
          if (err2) return res.status(500).json(err2);
          if (results.length === 0)
            return res.status(404).json({ message: 'Formation introuvable ou non publiée' });

          const { nb_places, inscrits } = results[0];
          if (nb_places !== null && inscrits >= nb_places)
            return res.status(400).json({ message: 'Cette formation est complète' });

          db.query(
            `INSERT INTO inscriptions (etudiant_id, formation_id, statut, date_inscription)
             VALUES (?, ?, 'Inscrit', NOW())`,
            [etudiant_id, formation_id],
            (err3) => {
  if (err3) return res.status(500).json(err3);
  res.json({ message: 'Inscription réussie' });

  // Notifier le formateur
  db.query(
    `SELECT f.titre, fo.user_id AS formateur_user_id, u.nom AS etudiant_nom
     FROM formations f
     JOIN formateurs fo ON f.formateur_id = fo.id
     JOIN etudiants e ON e.id = ?
     JOIN users u ON e.user_id = u.id
     WHERE f.id = ?`,
    [etudiant_id, formation_id],
    (ne, nr) => {
      if (!ne && nr.length > 0) {
        db.query(
          'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
          [nr[0].formateur_user_id, `📚 ${nr[0].etudiant_nom} s'est inscrit à votre formation « ${nr[0].titre} »`, 'inscription'],
          () => {}
        );
      }
    }
  );
}
          );
        }
      );
    }
  );
});


/* =========================
   📌 Mes formations
========================= */
router.get('/mes-formations/:etudiantId', (req, res) => {
  const etudiantId = req.params.etudiantId;

   const sql = `
    SELECT f.id AS formation_id, f.titre, f.description,
           f.date_debut, f.date_fin, f.duree, f.specialite,
           i.id AS inscription_id, i.statut, i.date_inscription
    FROM inscriptions i
    JOIN formations f ON i.formation_id = f.id
    WHERE i.etudiant_id = ?
    ORDER BY i.date_inscription DESC
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
  db.query('SELECT id, type, fichier FROM supports WHERE formation_id = ?',
    [formationId], (err, results) => {
      if (err) return res.status(500).json(err);
      res.json(results);
    });
});

/* =========================
   📈 Progression étudiant
========================= */
router.get('/progression/:etudiantId', (req, res) => {
  const { etudiantId } = req.params;
  db.query('SELECT progression FROM etudiants WHERE id = ?',
    [etudiantId], (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result[0]);
    });
});

/* =========================
   ⭐ Notation d'une formation
========================= */
router.post('/notation', (req, res) => {
  const { etudiant_id, formation_id, note, commentaire } = req.body;
  if (!etudiant_id || !formation_id || !note) return res.status(400).json({ message: 'Champs requis' });
  if (note < 1 || note > 5) return res.status(400).json({ message: 'Note entre 1 et 5' });

  db.query(
    'SELECT id FROM notations WHERE etudiant_id = ? AND formation_id = ?',
    [etudiant_id, formation_id],
    (err, existing) => {
      if (err) return res.status(500).json(err);

      if (existing.length > 0) {
        db.query(
          'UPDATE notations SET note = ?, commentaire = ? WHERE etudiant_id = ? AND formation_id = ?',
          [note, commentaire || null, etudiant_id, formation_id],
          (err2) => {
            if (err2) return res.status(500).json(err2);
            res.json({ message: 'Note mise à jour' });
          }
        );
      } else {
        db.query(
          'INSERT INTO notations (etudiant_id, formation_id, note, commentaire, date_notation) VALUES (?, ?, ?, ?, NOW())',
          [etudiant_id, formation_id, note, commentaire || null],
          (err2) => {
            if (err2) return res.status(500).json(err2);
            res.json({ message: 'Formation notée avec succès' });
          }
        );
      }
    }
  );
});

router.get('/notation/:etudiantId/:formationId', (req, res) => {
  const { etudiantId, formationId } = req.params;
  db.query(
    'SELECT note, commentaire FROM notations WHERE etudiant_id = ? AND formation_id = ?',
    [etudiantId, formationId],
    (err, results) => {
      if (err) return res.status(500).json(err);
      res.json(results[0] || null);
    }
  );
});

router.get('/notations-avg/:formationId', (req, res) => {
  const { formationId } = req.params;
  db.query(
    'SELECT ROUND(AVG(note),1) AS moyenne, COUNT(*) AS total FROM notations WHERE formation_id = ?',
    [formationId],
    (err, results) => {
      if (err) return res.status(500).json(err);
      res.json({ moyenne: results[0].moyenne || 0, total: results[0].total });
    }
  );
});

module.exports = router;
