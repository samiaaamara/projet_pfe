const express = require('express');
const router = express.Router();
const db = require('../db');

/* =========================
   📚 Formations disponibles (publiées)
========================= */
router.get('/formations', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const offset = (page - 1) * limit;

  db.query('SELECT COUNT(*) AS total FROM formations WHERE status = ?', ['published'], (err, countResult) => {
    if (err) return res.status(500).json(err);
    const total = countResult[0].total;

    const sql = `
      SELECT f.*,
        u.nom AS formateur_nom,
        (SELECT COUNT(*) FROM inscriptions WHERE formation_id = f.id) +
        (SELECT COUNT(*) FROM inscriptions_externes WHERE formation_id = f.id AND statut_paiement = 'payé') AS inscrits
      FROM formations f
      JOIN formateurs fo ON f.formateur_id = fo.id
      JOIN users u ON fo.user_id = u.id
      WHERE f.status = 'published'
      ORDER BY f.date_debut DESC
      LIMIT ? OFFSET ?
    `;
    db.query(sql, [limit, offset], (err2, results) => {
      if (err2) return res.status(500).json(err2);
      res.json({ data: results, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    });
  });
});

/* =========================
   📋 Mes inscriptions
========================= */
router.get('/mes-inscriptions/:externeId', (req, res) => {
  const { externeId } = req.params;
  const sql = `
    SELECT ie.*, f.titre, f.description, f.date_debut, f.date_fin, f.duree, f.niveau, f.prix,
           u.nom AS formateur_nom
    FROM inscriptions_externes ie
    JOIN formations f ON ie.formation_id = f.id
    JOIN formateurs fo ON f.formateur_id = fo.id
    JOIN users u ON fo.user_id = u.id
    WHERE ie.externe_id = ?
    ORDER BY ie.date_inscription DESC
  `;
  db.query(sql, [externeId], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

/* =========================
   💳 Payer et s'inscrire
========================= */
router.post('/payer', (req, res) => {
  const { externe_id, formation_id } = req.body;

  if (!externe_id || !formation_id) {
    return res.status(400).json({ message: 'externe_id et formation_id sont obligatoires' });
  }

  // Vérifier déjà inscrit
  db.query(
    'SELECT id FROM inscriptions_externes WHERE externe_id = ? AND formation_id = ?',
    [externe_id, formation_id],
    (err, existing) => {
      if (err) return res.status(500).json(err);
      if (existing.length > 0) {
        return res.status(400).json({ message: 'Vous êtes déjà inscrit à cette formation' });
      }

      // Récupérer la formation et son prix
      db.query(
        `SELECT f.prix, f.nb_places, f.titre,
          (SELECT COUNT(*) FROM inscriptions WHERE formation_id = f.id) +
          (SELECT COUNT(*) FROM inscriptions_externes WHERE formation_id = f.id AND statut_paiement = 'payé') AS inscrits
         FROM formations f WHERE f.id = ? AND f.status = 'published'`,
        [formation_id],
        (err2, results) => {
          if (err2) return res.status(500).json(err2);
          if (results.length === 0) return res.status(404).json({ message: 'Formation introuvable ou non publiée' });

          const { prix, nb_places, inscrits } = results[0];
          if (nb_places !== null && inscrits >= nb_places) {
            return res.status(400).json({ message: 'Cette formation est complète' });
          }

          const montant = prix || 0;
          const statut_paiement = montant === 0 ? 'payé' : 'payé'; // Simulation : paiement immédiat
          const statut_inscription = 'confirmé';

          db.query(
            `INSERT INTO inscriptions_externes
             (externe_id, formation_id, montant, statut_paiement, statut_inscription, date_paiement)
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [externe_id, formation_id, montant, statut_paiement, statut_inscription],
            (err3) => {
              if (err3) return res.status(500).json(err3);

              // Notification à l'externe
              db.query(
                'SELECT user_id FROM externes WHERE id = ?',
                [externe_id],
                (ne, nr) => {
                  if (!ne && nr.length > 0) {
                    const msg = montant > 0
                      ? `Paiement de ${montant} TND confirmé pour la formation "${results[0].titre}" ✅`
                      : `Inscription confirmée pour la formation "${results[0].titre}" ✅`;
                    db.query(
                      'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
                      [nr[0].user_id, msg, 'approbation'],
                      () => {}
                    );
                  }
                }
              );

              res.json({ message: montant > 0 ? 'Paiement effectué et inscription confirmée ✅' : 'Inscription confirmée ✅', montant });
            }
          );
        }
      );
    }
  );
});

/* =========================
   📂 Supports d'une formation (si payé)
========================= */
router.get('/supports/:externeId/:formationId', (req, res) => {
  const { externeId, formationId } = req.params;

  db.query(
    `SELECT * FROM inscriptions_externes
     WHERE externe_id = ? AND formation_id = ? AND statut_paiement = 'payé'`,
    [externeId, formationId],
    (err, access) => {
      if (err) return res.status(500).json(err);
      if (access.length === 0) return res.status(403).json({ message: 'Accès refusé : paiement requis' });

      db.query('SELECT * FROM supports WHERE formation_id = ?', [formationId], (err2, supports) => {
        if (err2) return res.status(500).json(err2);
        res.json(supports);
      });
    }
  );
});

/* =========================
   👤 Profil externe
========================= */
router.get('/profil/:userId', (req, res) => {
  const sql = `
    SELECT u.id, u.nom, u.email, u.role, ex.id AS externeId, ex.telephone, ex.entreprise
    FROM users u
    JOIN externes ex ON ex.user_id = u.id
    WHERE u.id = ?
  `;
  db.query(sql, [req.params.userId], (err, results) => {
    if (err) return res.status(500).json(err);
    if (results.length === 0) return res.status(404).json({ message: 'Introuvable' });
    res.json(results[0]);
  });
});

module.exports = router;