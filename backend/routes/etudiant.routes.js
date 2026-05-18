const express = require('express');
const router = express.Router();
const db = require('../db');
const validate = require('../middleware/validate');
const { inscriptionEtudiantSchema, notationEtudiantSchema, justificatifEtudiantSchema } = require('../validators/schemas');

router.get('/formations/:etudiantId', async (req, res) => {
  const { etudiantId } = req.params;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const offset = (page - 1) * limit;

  const countSql = `
    SELECT COUNT(*) AS total, e.specialite AS etudiant_specialite
    FROM formations f
    JOIN etudiants e ON e.id = ?
    WHERE f.status = 'published'
      AND f.status != 'archivée'
      AND f.date_debut >= CURDATE()
      AND (e.specialite IS NULL OR e.specialite = '' OR f.specialite = e.specialite)`;

  const dataSql = `
    SELECT f.*,
      (SELECT COUNT(*) FROM inscriptions WHERE formation_id = f.id) AS inscrits
    FROM formations f
    JOIN etudiants e ON e.id = ?
    WHERE f.status = 'published'
      AND f.status != 'archivée'
      AND f.date_debut >= CURDATE()
      AND (e.specialite IS NULL OR e.specialite = '' OR f.specialite = e.specialite)
    ORDER BY f.date_debut ASC LIMIT ? OFFSET ?`;

  try {
    const [countResult] = await db.query(countSql, [etudiantId]);
    const total = countResult[0].total;
    const etudiantSpecialite = countResult[0].etudiant_specialite || null;
    const [results] = await db.query(dataSql, [etudiantId, limit, offset]);
    res.json({
      data: results,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      filtre_specialite: etudiantSpecialite
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/inscription', validate(inscriptionEtudiantSchema), async (req, res) => {
  const { etudiant_id, formation_id } = req.body;

  try {
    const [existing] = await db.query(
      'SELECT id FROM inscriptions WHERE etudiant_id = ? AND formation_id = ?',
      [etudiant_id, formation_id]
    );
    if (existing.length > 0)
      return res.status(400).json({ message: 'Vous êtes déjà inscrit à cette formation' });

    const [activeInscription] = await db.query(
      `SELECT i.id FROM inscriptions i
       JOIN formations f ON i.formation_id = f.id
       WHERE i.etudiant_id = ? AND (f.date_fin IS NULL OR f.date_fin >= CURDATE())`,
      [etudiant_id]
    );
    if (activeInscription.length > 0)
      return res.status(400).json({ message: 'Vous êtes déjà inscrit à une formation en cours. Attendez sa fin pour vous inscrire à une autre.' });

    const [results] = await db.query(
      `SELECT nb_places, (SELECT COUNT(*) FROM inscriptions WHERE formation_id = ?) AS inscrits
       FROM formations WHERE id = ? AND status = 'published'`,
      [formation_id, formation_id]
    );
    if (results.length === 0)
      return res.status(404).json({ message: 'Formation introuvable ou non publiée' });

    const { nb_places, inscrits } = results[0];
    if (nb_places !== null && inscrits >= nb_places)
      return res.status(400).json({ message: 'Cette formation est complète' });

    await db.query(
      "INSERT INTO inscriptions (etudiant_id, formation_id, statut, date_inscription) VALUES (?, ?, 'en_attente', NOW())",
      [etudiant_id, formation_id]
    );
    res.json({ message: "Demande d'inscription envoyée. En attente d'approbation par l'administrateur." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/mes-formations/:etudiantId', async (req, res) => {
  const sql = `
    SELECT f.id AS formation_id, f.titre, f.description,
           f.date_debut, f.date_fin, f.duree, f.specialite, f.photo,
           u.nom AS formateur_nom,
           i.id AS inscription_id, i.statut, i.date_inscription
    FROM inscriptions i
    JOIN formations f ON i.formation_id = f.id
    LEFT JOIN formateurs fo ON f.formateur_id = fo.id
    LEFT JOIN users u ON fo.user_id = u.id
    WHERE i.etudiant_id = ?
    ORDER BY i.date_inscription DESC
  `;
  try {
    const [results] = await db.query(sql, [req.params.etudiantId]);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/supports/:formationId', async (req, res) => {
  try {
    const [results] = await db.query(
      'SELECT id, type, fichier FROM supports WHERE formation_id = ?',
      [req.params.formationId]
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/progression/:etudiantId', async (req, res) => {
  try {
    const [result] = await db.query(
      'SELECT progression FROM etudiants WHERE id = ?',
      [req.params.etudiantId]
    );
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/notation', validate(notationEtudiantSchema), async (req, res) => {
  const { etudiant_id, formation_id, note, commentaire } = req.body;
  try {
    const [existing] = await db.query(
      'SELECT id FROM notations WHERE etudiant_id = ? AND formation_id = ?',
      [etudiant_id, formation_id]
    );
    if (existing.length > 0) {
      await db.query(
        'UPDATE notations SET note = ?, commentaire = ? WHERE etudiant_id = ? AND formation_id = ?',
        [note, commentaire || null, etudiant_id, formation_id]
      );
      res.json({ message: 'Note mise à jour' });
    } else {
      await db.query(
        'INSERT INTO notations (etudiant_id, formation_id, note, commentaire, date_notation) VALUES (?, ?, ?, ?, NOW())',
        [etudiant_id, formation_id, note, commentaire || null]
      );
      res.json({ message: 'Formation notée avec succès' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/notation/:etudiantId/:formationId', async (req, res) => {
  const { etudiantId, formationId } = req.params;
  try {
    const [results] = await db.query(
      'SELECT note, commentaire FROM notations WHERE etudiant_id = ? AND formation_id = ?',
      [etudiantId, formationId]
    );
    res.json(results[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/notations-avg/:formationId', async (req, res) => {
  try {
    const [results] = await db.query(
      'SELECT ROUND(AVG(note),1) AS moyenne, COUNT(*) AS total FROM notations WHERE formation_id = ?',
      [req.params.formationId]
    );
    res.json({ moyenne: results[0].moyenne || 0, total: results[0].total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/progression-modules/:etudiantId/:formationId', async (req, res) => {
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
  try {
    const [modules] = await db.query(sql, [etudiantId, formationId, formationId]);
    const total = modules.length;
    const termines = modules.filter(m => m.statut === 'termine').length;
    const pourcentage = total > 0 ? Math.round((termines / total) * 100) : 0;
    res.json({ modules, pourcentage, total, termines });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/mes-presences/:etudiantId/:formationId', async (req, res) => {
  const { etudiantId, formationId } = req.params;
  const sql = `
    SELECT s.id AS seance_id, s.date_seance, s.heure_debut, s.heure_fin, s.salle, s.statut AS statut_seance,
           COALESCE(p.statut, 'absent') AS statut_presence
    FROM seances s
    LEFT JOIN presences p ON p.seance_id = s.id AND p.etudiant_id = ?
    WHERE s.formation_id = ?
    ORDER BY s.date_seance ASC, s.heure_debut ASC
  `;
  try {
    const [rows] = await db.query(sql, [etudiantId, formationId]);
    const total = rows.length;
    const presents = rows.filter(r => r.statut_presence === 'présent' || r.statut_presence === 'retard').length;
    const taux = total > 0 ? Math.round((presents / total) * 100) : null;
    res.json({ seances: rows, total, presents, taux });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/liste-attente', async (req, res) => {
  const { etudiant_id, formation_id } = req.body;
  if (!etudiant_id || !formation_id) return res.status(400).json({ error: 'Champs manquants' });
  try {
    const [rows] = await db.query(
      `SELECT nb_places,
              (SELECT COUNT(*) FROM inscriptions WHERE formation_id = ?) AS inscrits,
              (SELECT COUNT(*) FROM liste_attente WHERE etudiant_id = ? AND formation_id = ?) AS deja
       FROM formations WHERE id = ? AND status = 'published'`,
      [formation_id, etudiant_id, formation_id, formation_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Formation introuvable' });
    const { nb_places, inscrits, deja } = rows[0];
    if (deja > 0) return res.status(400).json({ error: "Vous êtes déjà en liste d'attente" });
    if (nb_places === null || inscrits < nb_places)
      return res.status(400).json({ error: 'Des places sont disponibles, inscrivez-vous directement' });
    await db.query('INSERT INTO liste_attente (etudiant_id, formation_id) VALUES (?, ?)', [etudiant_id, formation_id]);
    res.json({ message: "Vous avez rejoint la liste d'attente ✅" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/liste-attente/:etudiantId/:formationId', async (req, res) => {
  const { etudiantId, formationId } = req.params;
  try {
    await db.query('DELETE FROM liste_attente WHERE etudiant_id = ? AND formation_id = ?', [etudiantId, formationId]);
    res.json({ message: "Retiré de la liste d'attente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/en-attente/:etudiantId', async (req, res) => {
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
  try {
    const [rows] = await db.query(sql, [req.params.etudiantId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/inscription/:etudiantId/:formationId', async (req, res) => {
  const { etudiantId, formationId } = req.params;
  try {
    const [result] = await db.query(
      'DELETE FROM inscriptions WHERE etudiant_id = ? AND formation_id = ?',
      [etudiantId, formationId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Inscription introuvable' });
    res.json({ message: 'Désinscription effectuée' });

    // Notifier le premier de la liste d'attente (fire and forget)
    db.query(
      `SELECT la.etudiant_id, e.user_id, u.nom, f.titre
       FROM liste_attente la
       JOIN etudiants e ON la.etudiant_id = e.id
       JOIN users u ON e.user_id = u.id
       JOIN formations f ON la.formation_id = f.id
       WHERE la.formation_id = ?
       ORDER BY la.date_ajout ASC LIMIT 1`,
      [formationId]
    ).then(([rows]) => {
      if (!rows.length) return;
      db.query(
        'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
        [rows[0].user_id, `🎉 Une place s'est libérée dans la formation « ${rows[0].titre} » ! Inscrivez-vous rapidement.`, 'inscription']
      ).catch(() => {});
    }).catch(() => {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/justificatifs', validate(justificatifEtudiantSchema), async (req, res) => {
  const { etudiant_id, seance_id, motif } = req.body;
  try {
    await db.query(
      `INSERT INTO justificatifs (etudiant_id, seance_id, motif)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE motif = VALUES(motif), statut = 'en_attente', date_soumission = NOW()`,
      [etudiant_id, seance_id, motif]
    );
    res.json({ message: 'Justificatif soumis ✅' });

    // Notifier le formateur (fire and forget)
    db.query(
      `SELECT f.titre, fo.user_id AS formateur_uid, u.nom AS etudiant_nom, s.date_seance
       FROM seances s
       JOIN formations f ON s.formation_id = f.id
       JOIN formateurs fo ON f.formateur_id = fo.id
       JOIN etudiants e ON e.id = ?
       JOIN users u ON e.user_id = u.id
       WHERE s.id = ?`,
      [etudiant_id, seance_id]
    ).then(([nr]) => {
      if (nr.length > 0) {
        const d = nr[0].date_seance ? new Date(nr[0].date_seance).toLocaleDateString('fr-FR') : '';
        db.query(
          'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
          [nr[0].formateur_uid, `📋 ${nr[0].etudiant_nom} a soumis un justificatif d'absence pour la séance du ${d} (${nr[0].titre})`, 'presence']
        ).catch(() => {});
      }
    }).catch(() => {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/mes-justificatifs/:etudiantId', async (req, res) => {
  const sql = `
    SELECT j.id, j.seance_id, j.motif, j.statut, j.date_soumission,
           s.date_seance, s.heure_debut, f.titre AS formation_titre
    FROM justificatifs j
    JOIN seances s ON j.seance_id = s.id
    JOIN formations f ON s.formation_id = f.id
    WHERE j.etudiant_id = ?
    ORDER BY j.date_soumission DESC
  `;
  try {
    const [rows] = await db.query(sql, [req.params.etudiantId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/eligibilite-attestation/:etudiantId/:formationId', async (req, res) => {
  const { etudiantId, formationId } = req.params;
  const progressionSql = `
    SELECT COUNT(m.id) AS total_modules,
           SUM(CASE WHEN COALESCE(p.statut, 'non_commence') = 'termine' THEN 1 ELSE 0 END) AS modules_termines
    FROM modules_formation m
    LEFT JOIN progression_etudiants p ON p.module_id = m.id AND p.etudiant_id = ? AND p.formation_id = ?
    WHERE m.formation_id = ?
  `;
  const presencesSql = `
    SELECT COUNT(s.id) AS total_seances,
           SUM(CASE WHEN p.statut IN ('présent','excusé') THEN 1 ELSE 0 END) AS seances_ok
    FROM seances s
    LEFT JOIN presences p ON p.seance_id = s.id AND p.etudiant_id = ?
    WHERE s.formation_id = ? AND s.statut = 'terminée'
  `;
  try {
    const [progRows] = await db.query(progressionSql, [etudiantId, formationId, formationId]);
    const [presRows] = await db.query(presencesSql, [etudiantId, formationId]);
    const prog = progRows[0];
    const pres = presRows[0];
    const progression = prog.total_modules > 0
      ? Math.round((prog.modules_termines / prog.total_modules) * 100)
      : 0;
    const presences_ok = pres.total_seances > 0 && Number(pres.seances_ok) >= Number(pres.total_seances);
    const eligible = progression === 100 && presences_ok;
    res.json({
      eligible, progression,
      total_modules: prog.total_modules,
      modules_termines: prog.modules_termines,
      presences_ok,
      total_seances: pres.total_seances,
      seances_presentes: pres.seances_ok
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/attestation-data/:etudiantId/:formationId', async (req, res) => {
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
  try {
    const [rows] = await db.query(sql, [etudiantId, etudiantId, formationId]);
    if (!rows.length) return res.status(404).json({ error: 'Inscription introuvable' });
    const d = rows[0];
    const taux = d.total_seances > 0 ? Math.round((d.seances_presentes / d.total_seances) * 100) : null;
    res.json({ ...d, taux });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
