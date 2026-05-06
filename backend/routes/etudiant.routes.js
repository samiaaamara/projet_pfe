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

  const countSql = `
    SELECT COUNT(*) AS total, e.specialite AS etudiant_specialite
    FROM formations f
    JOIN etudiants e ON e.id = ?
    WHERE f.status = 'published'
      AND f.date_debut >= CURDATE()
      AND (e.specialite IS NULL OR e.specialite = '' OR f.specialite = e.specialite)`;

  const dataSql = `
    SELECT f.*,
      (SELECT COUNT(*) FROM inscriptions WHERE formation_id = f.id) AS inscrits
    FROM formations f
    JOIN etudiants e ON e.id = ?
    WHERE f.status = 'published'
      AND f.date_debut >= CURDATE()
      AND (e.specialite IS NULL OR e.specialite = '' OR f.specialite = e.specialite)
    ORDER BY f.date_debut ASC LIMIT ? OFFSET ?`;

  db.query(countSql, [etudiantId], (err, countResult) => {
    if (err) return res.status(500).json(err);
    const total = countResult[0].total;
    const etudiantSpecialite = countResult[0].etudiant_specialite || null;
    db.query(dataSql, [etudiantId, limit, offset], (err2, results) => {
      if (err2) return res.status(500).json(err2);
      res.json({
        data: results,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        filtre_specialite: etudiantSpecialite
      });
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

/* =========================
   📈 Progression par module
========================= */
router.get('/progression-modules/:etudiantId/:formationId', (req, res) => {
  const { etudiantId, formationId } = req.params;
  const sql = `
    SELECT m.id, m.titre, m.ordre, m.duree_heures,
           COALESCE(p.statut, 'non_commence') AS statut
    FROM modules_formation m
    LEFT JOIN progression_etudiants p
           ON p.module_id = m.id AND p.etudiant_id = ? AND p.formation_id = ?
    WHERE m.formation_id = ?
    ORDER BY m.ordre ASC, m.id ASC
  `;
  db.query(sql, [etudiantId, formationId, formationId], (err, modules) => {
    if (err) return res.status(500).json(err);
    const total = modules.length;
    const termines = modules.filter(m => m.statut === 'termine').length;
    const pourcentage = total > 0 ? Math.round((termines / total) * 100) : 0;
    res.json({ modules, pourcentage, total, termines });
  });
});

/* ========================= PRÉSENCES ÉTUDIANT ========================= */

// 🔹 Taux de présence d'un étudiant pour une formation (toutes séances)
router.get('/mes-presences/:etudiantId/:formationId', (req, res) => {
  const { etudiantId, formationId } = req.params;
  const sql = `
    SELECT s.id AS seance_id, s.date_seance, s.heure_debut, s.heure_fin, s.salle, s.statut AS statut_seance,
           COALESCE(p.statut, 'absent') AS statut_presence
    FROM seances s
    LEFT JOIN presences p ON p.seance_id = s.id AND p.etudiant_id = ?
    WHERE s.formation_id = ?
    ORDER BY s.date_seance ASC, s.heure_debut ASC
  `;
  db.query(sql, [etudiantId, formationId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const total = rows.length;
    const presents = rows.filter(r => r.statut_presence === 'présent' || r.statut_presence === 'retard').length;
    const taux = total > 0 ? Math.round((presents / total) * 100) : null;
    res.json({ seances: rows, total, presents, taux });
  });
});

/* ========================= LISTE D'ATTENTE ========================= */

// Rejoindre la liste d'attente
router.post('/liste-attente', (req, res) => {
  const { etudiant_id, formation_id } = req.body;
  if (!etudiant_id || !formation_id) return res.status(400).json({ error: 'Champs manquants' });

  db.query(
    `SELECT nb_places,
            (SELECT COUNT(*) FROM inscriptions WHERE formation_id = ?) AS inscrits,
            (SELECT COUNT(*) FROM liste_attente WHERE etudiant_id = ? AND formation_id = ?) AS deja
     FROM formations WHERE id = ? AND status = 'published'`,
    [formation_id, etudiant_id, formation_id, formation_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!rows.length) return res.status(404).json({ error: 'Formation introuvable' });
      const { nb_places, inscrits, deja } = rows[0];
      if (deja > 0) return res.status(400).json({ error: 'Vous êtes déjà en liste d\'attente' });
      if (nb_places === null || inscrits < nb_places)
        return res.status(400).json({ error: 'Des places sont disponibles, inscrivez-vous directement' });
      db.query(
        'INSERT INTO liste_attente (etudiant_id, formation_id) VALUES (?, ?)',
        [etudiant_id, formation_id],
        (err2) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json({ message: 'Vous avez rejoint la liste d\'attente ✅' });
        }
      );
    }
  );
});

// Quitter la liste d'attente
router.delete('/liste-attente/:etudiantId/:formationId', (req, res) => {
  const { etudiantId, formationId } = req.params;
  db.query('DELETE FROM liste_attente WHERE etudiant_id = ? AND formation_id = ?',
    [etudiantId, formationId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Retiré de la liste d\'attente' });
    }
  );
});

// Mes formations en attente + position
router.get('/en-attente/:etudiantId', (req, res) => {
  const etudiantId = req.params.etudiantId;
  const sql = `
    SELECT la.formation_id, la.date_ajout,
           f.titre, f.date_debut, f.nb_places,
           (SELECT COUNT(*) FROM inscriptions WHERE formation_id = f.id) AS inscrits,
           (SELECT COUNT(*) FROM liste_attente la2
            WHERE la2.formation_id = la.formation_id AND la2.date_ajout <= la.date_ajout) AS position
    FROM liste_attente la
    JOIN formations f ON la.formation_id = f.id
    WHERE la.etudiant_id = ?
    ORDER BY la.date_ajout ASC
  `;
  db.query(sql, [etudiantId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Se désinscrire d'une formation (libère une place → notifie le premier en attente)
router.delete('/inscription/:etudiantId/:formationId', (req, res) => {
  const { etudiantId, formationId } = req.params;
  db.query(
    'DELETE FROM inscriptions WHERE etudiant_id = ? AND formation_id = ?',
    [etudiantId, formationId], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Inscription introuvable' });
      res.json({ message: 'Désinscription effectuée' });

      // Notifier le premier de la liste d'attente
      db.query(
        `SELECT la.etudiant_id, e.user_id, u.nom, f.titre
         FROM liste_attente la
         JOIN etudiants e ON la.etudiant_id = e.id
         JOIN users u ON e.user_id = u.id
         JOIN formations f ON la.formation_id = f.id
         WHERE la.formation_id = ?
         ORDER BY la.date_ajout ASC LIMIT 1`,
        [formationId], (err2, rows) => {
          if (err2 || !rows.length) return;
          const premier = rows[0];
          db.query(
            'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
            [premier.user_id,
             `🎉 Une place s'est libérée dans la formation « ${premier.titre} » ! Inscrivez-vous rapidement.`,
             'inscription'],
            () => {}
          );
        }
      );
    }
  );
});

/* ========================= JUSTIFICATIFS ========================= */

// Soumettre un justificatif
router.post('/justificatifs', (req, res) => {
  const { etudiant_id, seance_id, motif } = req.body;
  if (!etudiant_id || !seance_id || !motif)
    return res.status(400).json({ error: 'etudiant_id, seance_id et motif sont obligatoires' });
  db.query(
    `INSERT INTO justificatifs (etudiant_id, seance_id, motif)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE motif = VALUES(motif), statut = 'en_attente', date_soumission = NOW()`,
    [etudiant_id, seance_id, motif],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Justificatif soumis ✅' });

      // Notifier le formateur
      db.query(
        `SELECT f.titre, fo.user_id AS formateur_uid, u.nom AS etudiant_nom, s.date_seance
         FROM seances s
         JOIN formations f ON s.formation_id = f.id
         JOIN formateurs fo ON f.formateur_id = fo.id
         JOIN etudiants e ON e.id = ?
         JOIN users u ON e.user_id = u.id
         WHERE s.id = ?`,
        [etudiant_id, seance_id], (ne, nr) => {
          if (!ne && nr.length > 0) {
            const d = nr[0].date_seance ? new Date(nr[0].date_seance).toLocaleDateString('fr-FR') : '';
            db.query(
              'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
              [nr[0].formateur_uid,
               `📋 ${nr[0].etudiant_nom} a soumis un justificatif d'absence pour la séance du ${d} (${nr[0].titre})`,
               'presence'], () => {}
            );
          }
        }
      );
    }
  );
});

// Mes justificatifs
router.get('/mes-justificatifs/:etudiantId', (req, res) => {
  const etudiantId = req.params.etudiantId;
  const sql = `
    SELECT j.id, j.seance_id, j.motif, j.statut, j.date_soumission,
           s.date_seance, s.heure_debut, f.titre AS formation_titre
    FROM justificatifs j
    JOIN seances s ON j.seance_id = s.id
    JOIN formations f ON s.formation_id = f.id
    WHERE j.etudiant_id = ?
    ORDER BY j.date_soumission DESC
  `;
  db.query(sql, [etudiantId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

/* ========================= ATTESTATION DATA ========================= */

router.get('/attestation-data/:etudiantId/:formationId', (req, res) => {
  const { etudiantId, formationId } = req.params;
  const sql = `
    SELECT f.titre, f.date_debut, f.date_fin, f.duree, f.specialite,
           u_form.nom AS formateur_nom,
           u_et.nom AS etudiant_nom, u_et.email AS etudiant_email,
           i.date_inscription,
           (SELECT COUNT(*) FROM seances WHERE formation_id = f.id) AS total_seances,
           (SELECT COUNT(*) FROM seances s
            JOIN presences p ON p.seance_id = s.id
            WHERE s.formation_id = f.id AND p.etudiant_id = ? AND p.statut IN ('présent','retard')
           ) AS seances_presentes
    FROM inscriptions i
    JOIN formations f ON i.formation_id = f.id
    JOIN formateurs fo ON f.formateur_id = fo.id
    JOIN users u_form ON fo.user_id = u_form.id
    JOIN etudiants e ON i.etudiant_id = e.id
    JOIN users u_et ON e.user_id = u_et.id
    WHERE i.etudiant_id = ? AND i.formation_id = ?
  `;
  db.query(sql, [etudiantId, etudiantId, formationId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: 'Inscription introuvable' });
    const d = rows[0];
    const taux = d.total_seances > 0
      ? Math.round((d.seances_presentes / d.total_seances) * 100) : null;
    res.json({ ...d, taux });
  });
});

module.exports = router;
