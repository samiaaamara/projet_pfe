const express = require('express');
const router = express.Router();
const db = require('../db');
const validate = require('../middleware/validate');
const { inscriptionCandidatSchema, notationCandidatSchema, justificatifCandidatSchema } = require('../validators/schemas');

router.get('/formations/:candidatId', async (req, res) => {
  const { candidatId } = req.params;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const offset = (page - 1) * limit;

  const countSql = `
    SELECT COUNT(*) AS total, c.specialite AS candidat_specialite
    FROM formations f
    JOIN candidats c ON c.id = ?
    WHERE f.status = 'published'
      AND f.status != 'archivée'
      AND f.date_debut >= CURDATE()
      AND (c.specialite IS NULL OR c.specialite = '' OR f.specialite = c.specialite)`;

  const dataSql = `
    SELECT f.*,
      (SELECT COUNT(*) FROM inscriptions WHERE formation_id = f.id) AS inscrits
    FROM formations f
    JOIN candidats c ON c.id = ?
    WHERE f.status = 'published'
      AND f.status != 'archivée'
      AND f.date_debut >= CURDATE()
      AND (c.specialite IS NULL OR c.specialite = '' OR f.specialite = c.specialite)
    ORDER BY f.date_debut ASC LIMIT ? OFFSET ?`;

  try {
    const [countResult] = await db.query(countSql, [candidatId]);
    const total = countResult[0].total;
    const candidatSpecialite = countResult[0].candidat_specialite || null;
    const [results] = await db.query(dataSql, [candidatId, limit, offset]);
    res.json({
      data: results,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      filtre_specialite: candidatSpecialite
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/inscription', validate(inscriptionCandidatSchema), async (req, res) => {
  const { candidat_id, formation_id } = req.body;

  try {
    const [existing] = await db.query(
      'SELECT id FROM inscriptions WHERE candidat_id = ? AND formation_id = ?',
      [candidat_id, formation_id]
    );
    if (existing.length > 0)
      return res.status(400).json({ message: 'Vous êtes déjà inscrit à cette formation' });

    const [activeInscription] = await db.query(
      `SELECT i.id FROM inscriptions i
       JOIN formations f ON i.formation_id = f.id
       WHERE i.candidat_id = ? AND (f.date_fin IS NULL OR f.date_fin >= CURDATE())`,
      [candidat_id]
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
      "INSERT INTO inscriptions (candidat_id, formation_id, statut, date_inscription) VALUES (?, ?, 'en_attente', NOW())",
      [candidat_id, formation_id]
    );
    res.json({ message: "Demande d'inscription envoyée. En attente d'approbation par l'administrateur." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/mes-formations/:candidatId', async (req, res) => {
  const sql = `
    SELECT f.id AS formation_id, f.titre, f.description,
           f.date_debut, f.date_fin, f.duree, f.specialite, f.photo,
           u.nom AS formateur_nom,
           i.id AS inscription_id, i.statut, i.date_inscription
    FROM inscriptions i
    JOIN formations f ON i.formation_id = f.id
    LEFT JOIN formateurs fo ON f.formateur_id = fo.id
    LEFT JOIN users u ON fo.user_id = u.id
    WHERE i.candidat_id = ?
    ORDER BY i.date_inscription DESC
  `;
  try {
    const [results] = await db.query(sql, [req.params.candidatId]);
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

router.get('/progression/:candidatId', async (req, res) => {
  try {
    const [result] = await db.query(
      'SELECT progression FROM candidats WHERE id = ?',
      [req.params.candidatId]
    );
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/notation', validate(notationCandidatSchema), async (req, res) => {
  const { candidat_id, formation_id, note, commentaire } = req.body;
  try {
    const [existing] = await db.query(
      'SELECT id FROM notations WHERE candidat_id = ? AND formation_id = ?',
      [candidat_id, formation_id]
    );
    if (existing.length > 0) {
      await db.query(
        'UPDATE notations SET note = ?, commentaire = ? WHERE candidat_id = ? AND formation_id = ?',
        [note, commentaire || null, candidat_id, formation_id]
      );
      res.json({ message: 'Note mise à jour' });
    } else {
      await db.query(
        'INSERT INTO notations (candidat_id, formation_id, note, commentaire, date_notation) VALUES (?, ?, ?, ?, NOW())',
        [candidat_id, formation_id, note, commentaire || null]
      );
      res.json({ message: 'Formation notée avec succès' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/notation/:candidatId/:formationId', async (req, res) => {
  const { candidatId, formationId } = req.params;
  try {
    const [results] = await db.query(
      'SELECT note, commentaire FROM notations WHERE candidat_id = ? AND formation_id = ?',
      [candidatId, formationId]
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

router.get('/progression-modules/:candidatId/:formationId', async (req, res) => {
  const { candidatId, formationId } = req.params;
  const sql = `
    SELECT m.id, m.titre, m.ordre, m.duree_heures,
           COALESCE(p.statut, 'non_commence') AS statut
    FROM modules_formation m
    LEFT JOIN progression_candidats p
           ON p.module_id = m.id AND p.candidat_id = ? AND p.formation_id = ?
    WHERE m.formation_id = ?
    ORDER BY m.ordre ASC, m.id ASC
  `;
  try {
    const [modules] = await db.query(sql, [candidatId, formationId, formationId]);
    const total = modules.length;
    const termines = modules.filter(m => m.statut === 'termine').length;
    const pourcentage = total > 0 ? Math.round((termines / total) * 100) : 0;
    res.json({ modules, pourcentage, total, termines });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/mes-presences/:candidatId/:formationId', async (req, res) => {
  const { candidatId, formationId } = req.params;
  const sql = `
    SELECT s.id AS seance_id, s.date_seance, s.heure_debut, s.heure_fin, s.salle, s.statut AS statut_seance,
           COALESCE(p.statut, 'absent') AS statut_presence
    FROM seances s
    LEFT JOIN presences p ON p.seance_id = s.id AND p.candidat_id = ?
    WHERE s.formation_id = ?
    ORDER BY s.date_seance ASC, s.heure_debut ASC
  `;
  try {
    const [rows] = await db.query(sql, [candidatId, formationId]);
    const total = rows.length;
    const presents = rows.filter(r => r.statut_presence === 'présent' || r.statut_presence === 'retard').length;
    const taux = total > 0 ? Math.round((presents / total) * 100) : null;
    res.json({ seances: rows, total, presents, taux });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/liste-attente', async (req, res) => {
  const { candidat_id, formation_id } = req.body;
  if (!candidat_id || !formation_id) return res.status(400).json({ error: 'Champs manquants' });
  try {
    const [rows] = await db.query(
      `SELECT nb_places,
              (SELECT COUNT(*) FROM inscriptions WHERE formation_id = ?) AS inscrits,
              (SELECT COUNT(*) FROM liste_attente WHERE candidat_id = ? AND formation_id = ?) AS deja
       FROM formations WHERE id = ? AND status = 'published'`,
      [formation_id, candidat_id, formation_id, formation_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Formation introuvable' });
    const { nb_places, inscrits, deja } = rows[0];
    if (deja > 0) return res.status(400).json({ error: "Vous êtes déjà en liste d'attente" });
    if (nb_places === null || inscrits < nb_places)
      return res.status(400).json({ error: 'Des places sont disponibles, inscrivez-vous directement' });
    await db.query('INSERT INTO liste_attente (candidat_id, formation_id) VALUES (?, ?)', [candidat_id, formation_id]);
    res.json({ message: "Vous avez rejoint la liste d'attente ✅" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/liste-attente/:candidatId/:formationId', async (req, res) => {
  const { candidatId, formationId } = req.params;
  try {
    await db.query('DELETE FROM liste_attente WHERE candidat_id = ? AND formation_id = ?', [candidatId, formationId]);
    res.json({ message: "Retiré de la liste d'attente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/en-attente/:candidatId', async (req, res) => {
  const sql = `
    SELECT la.formation_id, la.date_ajout,
           f.titre, f.date_debut, f.nb_places,
           (SELECT COUNT(*) FROM inscriptions WHERE formation_id = f.id) AS inscrits,
           (SELECT COUNT(*) FROM liste_attente la2
            WHERE la2.formation_id = la.formation_id AND la2.date_ajout <= la.date_ajout) AS position
    FROM liste_attente la
    JOIN formations f ON la.formation_id = f.id
    WHERE la.candidat_id = ?
    ORDER BY la.date_ajout ASC
  `;
  try {
    const [rows] = await db.query(sql, [req.params.candidatId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/inscription/:candidatId/:formationId', async (req, res) => {
  const { candidatId, formationId } = req.params;
  try {
    const [result] = await db.query(
      'DELETE FROM inscriptions WHERE candidat_id = ? AND formation_id = ?',
      [candidatId, formationId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Inscription introuvable' });
    res.json({ message: 'Désinscription effectuée' });

    db.query(
      `SELECT la.candidat_id, c.user_id, u.nom, f.titre
       FROM liste_attente la
       JOIN candidats c ON la.candidat_id = c.id
       JOIN users u ON c.user_id = u.id
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

router.post('/justificatifs', validate(justificatifCandidatSchema), async (req, res) => {
  const { candidat_id, seance_id, motif } = req.body;
  try {
    await db.query(
      `INSERT INTO justificatifs (candidat_id, seance_id, motif)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE motif = VALUES(motif), statut = 'en_attente', date_soumission = NOW()`,
      [candidat_id, seance_id, motif]
    );
    res.json({ message: 'Justificatif soumis ✅' });

    db.query(
      `SELECT f.titre, fo.user_id AS formateur_uid, u.nom AS candidat_nom, s.date_seance
       FROM seances s
       JOIN formations f ON s.formation_id = f.id
       JOIN formateurs fo ON f.formateur_id = fo.id
       JOIN candidats c ON c.id = ?
       JOIN users u ON c.user_id = u.id
       WHERE s.id = ?`,
      [candidat_id, seance_id]
    ).then(([nr]) => {
      if (nr.length > 0) {
        const d = nr[0].date_seance ? new Date(nr[0].date_seance).toLocaleDateString('fr-FR') : '';
        db.query(
          'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
          [nr[0].formateur_uid, `📋 ${nr[0].candidat_nom} a soumis un justificatif d'absence pour la séance du ${d} (${nr[0].titre})`, 'presence']
        ).catch(() => {});
      }
    }).catch(() => {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/mes-justificatifs/:candidatId', async (req, res) => {
  const sql = `
    SELECT j.id, j.seance_id, j.motif, j.statut, j.date_soumission,
           s.date_seance, s.heure_debut, f.titre AS formation_titre
    FROM justificatifs j
    JOIN seances s ON j.seance_id = s.id
    JOIN formations f ON s.formation_id = f.id
    WHERE j.candidat_id = ?
    ORDER BY j.date_soumission DESC
  `;
  try {
    const [rows] = await db.query(sql, [req.params.candidatId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/eligibilite-attestation/:candidatId/:formationId', async (req, res) => {
  const { candidatId, formationId } = req.params;
  const progressionSql = `
    SELECT COUNT(m.id) AS total_modules,
           SUM(CASE WHEN COALESCE(p.statut, 'non_commence') = 'termine' THEN 1 ELSE 0 END) AS modules_termines
    FROM modules_formation m
    LEFT JOIN progression_candidats p ON p.module_id = m.id AND p.candidat_id = ? AND p.formation_id = ?
    WHERE m.formation_id = ?
  `;
  try {
    const [progRows] = await db.query(progressionSql, [candidatId, formationId, formationId]);
    const prog = progRows[0];
    const progression = prog.total_modules > 0
      ? Math.round((prog.modules_termines / prog.total_modules) * 100)
      : 0;

    const [[quiz]] = await db.query(
      'SELECT id, seuil_reussite, nb_tentatives FROM quiz WHERE formation_id = ?',
      [formationId]
    );
    let has_quiz = false, quiz_ok = true, quiz_score = null, quiz_tentatives = 0;
    let nb_tentatives_max = null, seuil_reussite = null;
    if (quiz) {
      has_quiz = true;
      nb_tentatives_max = quiz.nb_tentatives;
      seuil_reussite = quiz.seuil_reussite;
      const [tentatives] = await db.query(
        'SELECT score, reussi FROM tentatives_quiz WHERE candidat_id = ? AND quiz_id = ? ORDER BY score DESC',
        [candidatId, quiz.id]
      );
      quiz_tentatives = tentatives.length;
      quiz_ok = tentatives.some(t => t.reussi);
      quiz_score = tentatives.length > 0 ? tentatives[0].score : null;
    }

    const eligible = progression === 100 && quiz_ok;
    res.json({
      eligible, progression,
      total_modules: prog.total_modules,
      modules_termines: prog.modules_termines,
      has_quiz, quiz_ok, quiz_score, quiz_tentatives, nb_tentatives_max, seuil_reussite
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/quiz/:formationId', async (req, res) => {
  const { formationId } = req.params;
  try {
    const [[quiz]] = await db.query(
      'SELECT id, titre, seuil_reussite, nb_tentatives FROM quiz WHERE formation_id = ?',
      [formationId]
    );
    if (!quiz) return res.json(null);
    const [questions] = await db.query(
      'SELECT id, question, ordre FROM questions_quiz WHERE quiz_id = ? ORDER BY ordre ASC',
      [quiz.id]
    );
    for (const q of questions) {
      const [reponses] = await db.query('SELECT id, reponse FROM reponses_quiz WHERE question_id = ?', [q.id]);
      q.reponses = reponses;
    }
    quiz.questions = questions;
    res.json(quiz);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/quiz-score/:candidatId/:formationId', async (req, res) => {
  const { candidatId, formationId } = req.params;
  try {
    const [[quiz]] = await db.query(
      'SELECT id, seuil_reussite, nb_tentatives FROM quiz WHERE formation_id = ?',
      [formationId]
    );
    if (!quiz) return res.json({ has_quiz: false });
    const [tentatives] = await db.query(
      'SELECT score, reussi FROM tentatives_quiz WHERE candidat_id = ? AND quiz_id = ? ORDER BY score DESC',
      [candidatId, quiz.id]
    );
    const reussi = tentatives.some(t => t.reussi);
    const best_score = tentatives.length > 0 ? tentatives[0].score : null;
    res.json({
      has_quiz: true, quiz_id: quiz.id,
      tentatives: tentatives.length, nb_tentatives_max: quiz.nb_tentatives,
      seuil_reussite: quiz.seuil_reussite, best_score, reussi
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/quiz/soumettre', async (req, res) => {
  const { candidat_id, quiz_id, reponses } = req.body;
  if (!candidat_id || !quiz_id || !Array.isArray(reponses))
    return res.status(400).json({ error: 'Données manquantes.' });
  try {
    const [[quiz]] = await db.query(
      'SELECT id, seuil_reussite, nb_tentatives FROM quiz WHERE id = ?', [quiz_id]
    );
    if (!quiz) return res.status(404).json({ error: 'Quiz introuvable.' });

    const [existingTentatives] = await db.query(
      'SELECT id FROM tentatives_quiz WHERE candidat_id = ? AND quiz_id = ?', [candidat_id, quiz_id]
    );
    if (existingTentatives.length >= quiz.nb_tentatives)
      return res.status(400).json({ error: 'Nombre maximum de tentatives atteint.' });

    const [allQuestions] = await db.query('SELECT id FROM questions_quiz WHERE quiz_id = ?', [quiz_id]);
    let correct = 0;
    for (const rep of reponses) {
      const [[r]] = await db.query(
        'SELECT est_correcte FROM reponses_quiz WHERE id = ? AND question_id = ?',
        [rep.reponse_id, rep.question_id]
      );
      if (r && r.est_correcte) correct++;
    }
    const score = allQuestions.length > 0 ? Math.round((correct / allQuestions.length) * 100) : 0;
    const reussi = score >= quiz.seuil_reussite;
    await db.query(
      'INSERT INTO tentatives_quiz (candidat_id, quiz_id, score, reussi) VALUES (?, ?, ?, ?)',
      [candidat_id, quiz_id, score, reussi ? 1 : 0]
    );
    res.json({
      score, reussi, seuil_reussite: quiz.seuil_reussite, correct, total: allQuestions.length,
      tentatives_restantes: quiz.nb_tentatives - existingTentatives.length - 1
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/attestation-data/:candidatId/:formationId', async (req, res) => {
  const { candidatId, formationId } = req.params;
  const sql = `
    SELECT f.titre, f.date_debut, f.date_fin, f.duree, f.specialite,
           u_form.nom AS formateur_nom,
           u_c.nom AS candidat_nom, u_c.email AS candidat_email,
           i.date_inscription,
           (SELECT COUNT(*) FROM seances WHERE formation_id = f.id) AS total_seances,
           (SELECT COUNT(*) FROM seances s
            JOIN presences p ON p.seance_id = s.id
            WHERE s.formation_id = f.id AND p.candidat_id = ? AND p.statut IN ('présent','retard')
           ) AS seances_presentes
    FROM inscriptions i
    JOIN formations f ON i.formation_id = f.id
    JOIN formateurs fo ON f.formateur_id = fo.id
    JOIN users u_form ON fo.user_id = u_form.id
    JOIN candidats c ON i.candidat_id = c.id
    JOIN users u_c ON c.user_id = u_c.id
    WHERE i.candidat_id = ? AND i.formation_id = ?
  `;
  try {
    const [rows] = await db.query(sql, [candidatId, candidatId, formationId]);
    if (!rows.length) return res.status(404).json({ error: 'Inscription introuvable' });
    const d = rows[0];
    const taux = d.total_seances > 0 ? Math.round((d.seances_presentes / d.total_seances) * 100) : null;
    res.json({ ...d, taux });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
