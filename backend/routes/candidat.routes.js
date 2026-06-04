const express = require('express');
const router = express.Router();
const db = require('../db');
const validate = require('../middleware/validate');
const { inscriptionCandidatSchema, notationCandidatSchema, justificatifCandidatSchema } = require('../validators/schemas');
const { genererAttestationPDF } = require('../attestationPdf');
const syncFormationStatuses = require('../utils/syncFormationStatuses');

router.get('/formations/:candidatId', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const offset = (page - 1) * limit;

  const countSql = `
    SELECT COUNT(*) AS total FROM formations f
    WHERE f.status = 'published'
      AND (f.date_debut IS NULL OR f.date_debut > CURDATE())`;

  const dataSql = `
    SELECT f.*,
      (SELECT COUNT(*) FROM inscriptions WHERE formation_id = f.id) AS inscrits
    FROM formations f
    WHERE f.status = 'published'
      AND (f.date_debut IS NULL OR f.date_debut > CURDATE())
    ORDER BY f.date_debut IS NULL ASC, f.date_debut ASC
    LIMIT ? OFFSET ?`;

  try {
    await syncFormationStatuses();
    const [countResult] = await db.query(countSql);
    const total = countResult[0].total;
    const [results] = await db.query(dataSql, [limit, offset]);
    res.json({
      data: results,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
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
       WHERE i.candidat_id = ?
         AND i.formation_id != ?
         AND i.statut = 'Inscrit'
         AND f.status NOT IN ('archivée', 'terminée')
         AND (f.date_fin IS NULL OR f.date_fin >= CURDATE())`,
      [candidat_id, formation_id]
    );
    if (activeInscription.length > 0)
      return res.status(400).json({ message: 'Vous êtes déjà inscrit à une formation en cours. Attendez sa fin pour vous inscrire à une autre.' });

    const [results] = await db.query(
 `SELECT nb_places, (SELECT COUNT(*) FROM inscriptions WHERE formation_id = ? AND statut = 'Inscrit') AS inscrits
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
           f.date_debut, f.date_fin, f.specialite, f.photo, f.status,
           u.nom AS formateur_nom,
           i.id AS inscription_id, i.date_inscription,
           CASE
             WHEN f.status IN ('archivée', 'terminée') OR (f.date_fin IS NOT NULL AND f.date_fin < CURDATE())
             THEN 'Terminée'
             ELSE i.statut
           END AS statut
    FROM inscriptions i
    JOIN formations f ON i.formation_id = f.id
    LEFT JOIN formateurs fo ON f.formateur_id = fo.id
    LEFT JOIN users u ON fo.user_id = u.id
    WHERE i.candidat_id = ? AND i.statut = 'Inscrit'
    ORDER BY i.date_inscription DESC
 `;
  try {
    const [results] = await db.query(sql, [req.params.candidatId]);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/mes-demandes/:candidatId', async (req, res) => {
  const sql = `
    SELECT i.id AS inscription_id, i.formation_id, i.statut, i.date_inscription,
           f.titre, f.date_debut, f.date_fin, f.specialite
    FROM inscriptions i
    JOIN formations f ON i.formation_id = f.id
    WHERE i.candidat_id = ? AND i.statut = 'en_attente'
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
           COALESCE(p.statut, 'absent') AS statut_presence,
           j.statut AS justif_statut
    FROM seances s
    LEFT JOIN presences p ON p.seance_id = s.id AND p.candidat_id = ?
    LEFT JOIN justificatifs j ON j.seance_id = s.id AND j.candidat_id = ?
    WHERE s.formation_id = ?
    ORDER BY s.date_seance ASC, s.heure_debut ASC
 `;
  try {
    const [rows] = await db.query(sql, [candidatId, candidatId, formationId]);
    const total = rows.length;
    const presents = rows.filter(r => r.statut_presence === 'présent' || r.statut_presence === 'excusé').length;
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
              (SELECT COUNT(*) FROM inscriptions WHERE formation_id = ? AND statut = 'Inscrit') AS inscrits,
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
    res.json({ message: "Vous avez rejoint la liste d'attente " });
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


router.post('/justificatifs', validate(justificatifCandidatSchema), async (req, res) => {
  const { candidat_id, seance_id, motif } = req.body;
  try {
    await db.query(
 `INSERT INTO justificatifs (candidat_id, seance_id, motif)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE motif = VALUES(motif), statut = 'en_attente', date_soumission = NOW()`,
      [candidat_id, seance_id, motif]
    );
    res.json({ message: 'Justificatif soumis ' });

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
          [nr[0].formateur_uid, `${nr[0].candidat_nom} a soumis un justificatif d'absence pour la séance du ${d} (${nr[0].titre})`, 'presence']
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
    const [[formation]] = await db.query('SELECT status FROM formations WHERE id = ?', [formationId]);
    if (!formation || formation.status !== 'terminée')
      return res.status(403).json({ message: 'Le quiz est accessible uniquement une fois la formation terminée.' });
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
    SELECT f.titre, f.date_debut, f.date_fin, f.specialite,
           u_form.nom AS formateur_nom,
           u_c.nom AS candidat_nom, u_c.email AS candidat_email,
           i.date_inscription,
           (SELECT COUNT(*) FROM seances WHERE formation_id = f.id) AS total_seances,
           (SELECT COUNT(*) FROM seances s
            JOIN presences p ON p.seance_id = s.id
            WHERE s.formation_id = f.id AND p.candidat_id = ? AND p.statut IN ('présent','excusé')
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
    const refId = `ATT-C${candidatId}-F${formationId}`;
    const dateGen = new Date().toLocaleDateString('fr-FR');
    const QRCode = require('qrcode');
    const qrContent = [
 `REF: ${refId}`,
 `Titulaire : ${d.candidat_nom}`,
 `Formation : ${d.titre}`,
 `Taux présence : ${taux ?? 'N/A'}%`,
 `Délivré : ${dateGen}`,
    ].join('\n');
    const qr_data_url = await QRCode.toDataURL(qrContent, { width: 150, margin: 1, color: { dark: '#003366' } });
    res.json({ ...d, taux, ref_id: refId, qr_data_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── GET /generer-attestation/:candidatId/:formationId ─────────────────── */
router.get('/generer-attestation/:candidatId/:formationId', async (req, res) => {
  const { candidatId, formationId } = req.params;
  try {
    // 1. Vérifier l'éligibilité
    const [inscRows] = await db.query(
 'SELECT id FROM inscriptions WHERE candidat_id = ? AND formation_id = ?',
      [candidatId, formationId]
    );
    if (!inscRows.length) return res.status(404).json({ error: 'Inscription introuvable' });

    // Calculer la progression depuis progression_candidats
    const [[progRow]] = await db.query(`
      SELECT COUNT(m.id) AS total,
             SUM(CASE WHEN COALESCE(p.statut,'non_commence') = 'termine' THEN 1 ELSE 0 END) AS termines
      FROM modules_formation m
      LEFT JOIN progression_candidats p ON p.module_id = m.id AND p.candidat_id = ? AND p.formation_id = ?
      WHERE m.formation_id = ?
 `, [candidatId, formationId, formationId]);

    const progression = progRow.total > 0 ? Math.round((progRow.termines / progRow.total) * 100) : 0;

    const [[quizRow]] = await db.query(`
      SELECT COUNT(*) AS quiz_reussi FROM tentatives_quiz tq
      JOIN quiz q ON tq.quiz_id = q.id
      WHERE q.formation_id = ? AND tq.candidat_id = ? AND tq.reussi = 1
 `, [formationId, candidatId]);

    if (progression < 100) return res.status(403).json({ error: 'Progression insuffisante' });
    if (!quizRow.quiz_reussi) return res.status(403).json({ error: 'Quiz non réussi' });

    // 2. Récupérer les données
    const [rows] = await db.query(`
      SELECT f.titre, f.date_debut, f.date_fin, f.specialite,
             u_form.nom AS formateur_nom,
             u_c.nom AS candidat_nom,
             (SELECT COUNT(*) FROM seances WHERE formation_id = f.id) AS total_seances,
             (SELECT COUNT(*) FROM seances s JOIN presences p ON p.seance_id = s.id
              WHERE s.formation_id = f.id AND p.candidat_id = ? AND p.statut IN ('présent','excusé')
             ) AS seances_presentes
      FROM inscriptions i
      JOIN formations f ON i.formation_id = f.id
      JOIN formateurs fo ON f.formateur_id = fo.id
      JOIN users u_form ON fo.user_id = u_form.id
      JOIN candidats c ON i.candidat_id = c.id
      JOIN users u_c ON c.user_id = u_c.id
      WHERE i.candidat_id = ? AND i.formation_id = ?
 `, [candidatId, candidatId, formationId]);

    if (!rows.length) return res.status(404).json({ error: 'Données introuvables' });
    const d = rows[0];
    const taux = d.total_seances > 0 ? Math.round((d.seances_presentes / d.total_seances) * 100) : 100;

    // 3. Générer le PDF
    await genererAttestationPDF(res, {
      candidat_nom : d.candidat_nom,
      titre        : d.titre,
      specialite   : d.specialite,
      formateur_nom: d.formateur_nom,
      date_debut   : d.date_debut ? new Date(d.date_debut).toLocaleDateString('fr-FR') : '—',
      date_fin     : d.date_fin   ? new Date(d.date_fin).toLocaleDateString('fr-FR')   : '—',
      taux,
      dateGen      : new Date().toLocaleDateString('fr-FR'),
      refId        : `ATT-C${candidatId}-F${formationId}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
