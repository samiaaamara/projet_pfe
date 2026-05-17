const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const validate = require('../middleware/validate');
const { seanceSchema } = require('../validators/schemas');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|doc|docx|ppt|pptx|png|jpg|jpeg|mp4|zip/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    allowed.test(ext) ? cb(null, true) : cb(new Error('Type de fichier non autorisé'));
  }
});

const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /png|jpg|jpeg|gif|webp/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    allowed.test(ext) ? cb(null, true) : cb(new Error('Seules les images sont autorisées (PNG, JPG, GIF, WEBP)'));
  }
});

router.get('/mes-formations/:formateurId', async (req, res) => {
  const formateurId = parseInt(req.params.formateurId);
  if (isNaN(formateurId)) return res.status(400).json({ error: 'Formateur ID invalide' });
  try {
    const [results] = await db.query(
      `SELECT f.*,
              (SELECT COUNT(*) FROM modules_formation WHERE formation_id = f.id) AS module_count
       FROM formations f WHERE f.formateur_id = ?`,
      [formateurId]
    );
    res.json(results);
  } catch (err) {
    console.error('Erreur SQL /mes-formations:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/profil/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) return res.status(400).json({ error: 'User ID invalide' });
  try {
    const [results] = await db.query(
      `SELECT f.id, f.specialite, f.telephone, f.date_naissance, f.user_id, u.nom, u.email, u.role, u.photo_profil
       FROM formateurs f JOIN users u ON f.user_id = u.id WHERE f.user_id = ?`,
      [userId]
    );
    if (results.length === 0) {
      const [userResults] = await db.query('SELECT id, role FROM users WHERE id = ?', [userId]);
      if (!userResults.length) return res.status(404).json({ error: 'Utilisateur non trouvé', userId });
      const user = userResults[0];
      if (user.role !== 'formateur') return res.status(403).json({ error: "Utilisateur n'est pas un formateur", role: user.role });
      return res.status(404).json({ error: 'Profil formateur non trouvé mais rôle est formateur', userId });
    }
    res.json(results[0]);
  } catch (err) {
    console.error('Erreur SQL /profil:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/supports/:formationId', async (req, res) => {
  const formationId = parseInt(req.params.formationId);
  if (isNaN(formationId)) return res.status(400).json({ error: 'Formation ID invalide' });
  try {
    const [results] = await db.query('SELECT * FROM supports WHERE formation_id = ?', [formationId]);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/inscriptions/:formationId', async (req, res) => {
  const formationId = parseInt(req.params.formationId);
  if (isNaN(formationId)) return res.status(400).json({ error: 'Formation ID invalide' });
  const sql = `
    SELECT i.id, u.nom, u.email, i.date_inscription, i.statut,
           c.id AS candidat_id, NULL AS externe_id, 'candidat' AS type_participant
    FROM inscriptions i
    JOIN candidats c ON i.candidat_id = c.id
    JOIN users u ON c.user_id = u.id
    WHERE i.formation_id = ?

    UNION ALL

    SELECT ie.id, u.nom, u.email, ie.date_inscription, COALESCE(ie.statut, 'Inscrit') AS statut,
           NULL AS candidat_id, ex.id AS externe_id, 'externe' AS type_participant
    FROM inscriptions_externes ie
    JOIN externes ex ON ie.externe_id = ex.id
    JOIN users u ON ex.user_id = u.id
    WHERE ie.formation_id = ? AND ie.statut_paiement = 'payé'

    ORDER BY date_inscription DESC
  `;
  try {
    const [results] = await db.query(sql, [formationId, formationId]);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats/:formateurId', async (req, res) => {
  const formateurId = parseInt(req.params.formateurId);
  if (isNaN(formateurId)) return res.status(400).json({ error: 'Formateur ID invalide' });
  const statsSql = `
    SELECT
      (SELECT COUNT(*) FROM formations WHERE formateur_id = ?) AS totalFormations,
      (SELECT COUNT(*) FROM inscriptions i JOIN formations f ON i.formation_id = f.id WHERE f.formateur_id = ?)
       + (SELECT COUNT(*) FROM inscriptions_externes ie JOIN formations f ON ie.formation_id = f.id WHERE f.formateur_id = ? AND ie.statut_paiement = 'payé') AS totalEtudiants,
      (SELECT COUNT(*) FROM seances s JOIN formations f ON s.formation_id = f.id WHERE f.formateur_id = ?) AS totalSeances
  `;
  try {
    const [result] = await db.query(statsSql, [formateurId, formateurId, formateurId, formateurId]);
    res.json({
      formations: result[0].totalFormations || 0,
      etudiants: result[0].totalEtudiants || 0,
      seances: result[0].totalSeances || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/creer-formation', uploadImage.single('photo'), async (req, res) => {
  const { titre, description, specialite, nb_places, formateur_id } = req.body;
  const photo = req.file ? `/uploads/${req.file.filename}` : null;

  if (!titre || !titre.trim()) return res.status(400).json({ error: 'Le titre est obligatoire.' });
  if (!description || !description.trim()) return res.status(400).json({ error: 'La description est obligatoire.' });
  if (!formateur_id) return res.status(400).json({ error: 'Le formateur est obligatoire.' });
  if (nb_places && Number(nb_places) <= 0) return res.status(400).json({ error: 'Le nombre de places doit être > 0.' });

  try {
    const [results] = await db.query(
      `INSERT INTO formations (titre, description, specialite, nb_places, formateur_id, status, photo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [titre, description, specialite || null, nb_places || null, formateur_id, 'draft', photo]
    );
    res.json({ message: 'Formation créée avec succès ✅', id: results.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/supports', upload.single('fichier'), async (req, res) => {
  const { formation_id, type } = req.body;
  if (!formation_id || !type) return res.status(400).json({ error: 'formation_id et type sont obligatoires' });
  const fichier = req.file ? `/uploads/${req.file.filename}` : req.body.fichier;
  if (!fichier) return res.status(400).json({ error: 'Un fichier ou une URL est obligatoire' });
  try {
    const [results] = await db.query(
      'INSERT INTO supports (formation_id, type, fichier) VALUES (?, ?, ?)',
      [formation_id, type, fichier]
    );
    res.json({ message: 'Support ajouté ✅', id: results.insertId, fichier });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/formations/:id', uploadImage.single('photo'), async (req, res) => {
  const formationId = parseInt(req.params.id);
  const { titre, description, specialite, nb_places, formateur_id, photo_existante } = req.body;
  const photo = req.file ? `/uploads/${req.file.filename}` : (photo_existante || null);

  if (isNaN(formationId)) return res.status(400).json({ error: 'Formation ID invalide' });
  if (!titre || !titre.trim()) return res.status(400).json({ error: 'Le titre est obligatoire.' });
  if (!description || !description.trim()) return res.status(400).json({ error: 'La description est obligatoire.' });
  if (nb_places !== undefined && nb_places !== null && nb_places !== '' && Number(nb_places) <= 0) return res.status(400).json({ error: 'Le nombre de places doit être > 0.' });
  if (!formateur_id) return res.status(400).json({ error: 'Le formateur est obligatoire.' });

  try {
    const [checkResult] = await db.query(
      'SELECT status FROM formations WHERE id = ? AND formateur_id = ?',
      [formationId, formateur_id]
    );
    if (checkResult.length === 0) return res.status(404).json({ error: 'Formation non trouvée ou accès refusé' });
    if (checkResult[0].status === 'published')
      return res.status(403).json({ error: "Impossible de modifier une formation publiée. Contactez l'administrateur." });

    const [result] = await db.query(
      `UPDATE formations SET titre = ?, description = ?, specialite = ?, nb_places = ?, photo = ?
       WHERE id = ? AND formateur_id = ?`,
      [titre, description, specialite || null, nb_places || null, photo, formationId, formateur_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Formation non trouvée ou accès refusé' });
    res.json({ message: 'Formation mise à jour ✅' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/formations/:id/submit-for-approval', async (req, res) => {
  const formationId = parseInt(req.params.id);
  const { formateur_id } = req.body;
  if (isNaN(formationId)) return res.status(400).json({ error: 'Formation ID invalide' });
  if (!formateur_id) return res.status(400).json({ error: 'Formateur ID obligatoire' });

  try {
    const [checkResult] = await db.query(
      'SELECT id, status, formateur_id, titre FROM formations WHERE id = ?',
      [formationId]
    );
    if (checkResult.length === 0) return res.status(404).json({ error: 'Formation non trouvée' });
    const formation = checkResult[0];
    if (formation.formateur_id !== formateur_id)
      return res.status(403).json({ error: "Accès refusé - vous n'êtes pas le formateur de cette formation" });
    if (formation.status !== 'draft')
      return res.status(400).json({ error: `Formation déjà ${formation.status}` });

    // Vérifier qu'il y a au moins 1 module
    const [[moduleCount]] = await db.query(
      'SELECT COUNT(*) AS cnt FROM modules_formation WHERE formation_id = ?',
      [formationId]
    );
    if (moduleCount.cnt < 1)
      return res.status(400).json({ error: 'Vous devez ajouter au moins un module avant de soumettre la formation.' });

    const [result] = await db.query(
      "UPDATE formations SET status = 'pending_approval' WHERE id = ? AND formateur_id = ? AND status = 'draft'",
      [formationId, formateur_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Formation non trouvée ou déjà soumise' });
    res.json({ message: "Formation soumise à l'admin pour approbation ✉️" });

    // Notifier tous les admins (fire and forget)
    db.query('SELECT id FROM users WHERE role = "admin"').then(([admins]) => {
      admins.forEach(admin => {
        db.query(
          'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
          [admin.id, `🔔 Nouvelle formation en attente d'approbation : « ${formation.titre} »`, 'approbation']
        ).catch(() => {});
      });
    }).catch(() => {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/formations/:id', async (req, res) => {
  const formationId = parseInt(req.params.id);
  const { formateur_id } = req.body;
  if (isNaN(formationId)) return res.status(400).json({ error: 'Formation ID invalide' });
  if (!formateur_id) return res.status(400).json({ error: 'Formateur ID obligatoire' });

  try {
    const [checkResult] = await db.query(
      'SELECT status FROM formations WHERE id = ? AND formateur_id = ?',
      [formationId, formateur_id]
    );
    if (checkResult.length === 0) return res.status(404).json({ error: 'Formation non trouvée ou accès refusé' });
    if (checkResult[0].status === 'published')
      return res.status(403).json({ error: "Impossible de supprimer une formation publiée. Contactez l'administrateur." });

    const [result] = await db.query(
      'DELETE FROM formations WHERE id = ? AND formateur_id = ?',
      [formationId, formateur_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Formation non trouvée ou accès refusé' });
    res.json({ message: 'Formation supprimée ❌' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/inscriptions/:inscriptionId/status', async (req, res) => {
  const inscriptionId = parseInt(req.params.inscriptionId);
  const { statut, type_participant } = req.body;
  if (isNaN(inscriptionId)) return res.status(400).json({ error: 'Inscription ID invalide' });
  if (!statut || typeof statut !== 'string') return res.status(400).json({ error: 'Statut invalide' });

  const isExterne = type_participant === 'externe';
  const updateSql = isExterne
    ? 'UPDATE inscriptions_externes SET statut = ? WHERE id = ?'
    : 'UPDATE inscriptions SET statut = ? WHERE id = ?';

  try {
    const [result] = await db.query(updateSql, [statut, inscriptionId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Inscription non trouvée' });
    res.json({ message: 'Statut mis à jour ✅' });

    // Notifier le participant (fire and forget)
    if (statut === 'présent' || statut === 'absent') {
      const notifSql = isExterne
        ? `SELECT f.titre, ex.user_id FROM inscriptions_externes ie JOIN formations f ON ie.formation_id = f.id JOIN externes ex ON ie.externe_id = ex.id WHERE ie.id = ?`
        : `SELECT f.titre, c.user_id FROM inscriptions i JOIN formations f ON i.formation_id = f.id JOIN candidats c ON i.candidat_id = c.id WHERE i.id = ?`;
      db.query(notifSql, [inscriptionId]).then(([nr]) => {
        if (nr.length > 0) {
          const msg = statut === 'présent'
            ? `🏆 Votre présence à la formation « ${nr[0].titre} » a été validée !`
            : `📋 Votre absence à la formation « ${nr[0].titre} » a été enregistrée.`;
          db.query('INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
            [nr[0].user_id, msg, 'presence']).catch(() => {});
        }
      }).catch(() => {});
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= PROGRESSION PAR MODULE ========================= */

router.get('/progression/:formationId/:candidatId', async (req, res) => {
  const { formationId, candidatId } = req.params;
  const sql = `
    SELECT m.id, m.titre, m.ordre, m.duree_heures,
           COALESCE(p.statut, 'non_commence') AS statut
    FROM modules_formation m
    LEFT JOIN progression_candidats p ON p.module_id = m.id AND p.candidat_id = ? AND p.formation_id = ?
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

router.put('/progression/:formationId/:candidatId/:moduleId', async (req, res) => {
  const { formationId, candidatId, moduleId } = req.params;
  const { statut } = req.body;
  const validStatuts = ['non_commence', 'en_cours', 'termine'];
  if (!validStatuts.includes(statut)) return res.status(400).json({ message: 'Statut invalide.' });

  try {
    await db.query(
      `INSERT INTO progression_candidats (candidat_id, formation_id, module_id, statut)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE statut = VALUES(statut), date_maj = NOW()`,
      [candidatId, formationId, moduleId, statut]
    );
    res.json({ message: 'Progression mise à jour.' });

    if (statut === 'termine') {
      (async () => {
        try {
          const [rows] = await db.query(
            `SELECT (SELECT COUNT(*) FROM modules_formation WHERE formation_id = ?) AS total,
                    (SELECT COUNT(*) FROM progression_candidats WHERE candidat_id = ? AND formation_id = ? AND statut = 'termine') AS termines`,
            [formationId, candidatId, formationId]
          );
          if (rows[0] && rows[0].total > 0 && rows[0].total === rows[0].termines) {
            const [cRows] = await db.query('SELECT user_id FROM candidats WHERE id = ?', [candidatId]);
            const [fRows] = await db.query('SELECT titre FROM formations WHERE id = ?', [formationId]);
            if (cRows.length > 0 && fRows.length > 0) {
              await db.query(
                'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
                [cRows[0].user_id, `🎓 Félicitations ! Vous avez complété 100% de la formation "${fRows[0].titre}" !`, 'approbation']
              );
            }
          }
        } catch (_) {}
      })();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= PROGRAMME (description + objectifs + prérequis) ========================= */

router.get('/formations/:id/programme', async (req, res) => {
  const formationId = parseInt(req.params.id);
  if (isNaN(formationId)) return res.status(400).json({ error: 'Formation ID invalide' });
  try {
    const [[prog]] = await db.query(
      'SELECT * FROM programme_formations WHERE formation_id = ?',
      [formationId]
    );
    const [modules] = await db.query(
      'SELECT id, titre, description, duree_heures, ordre FROM modules_formation WHERE formation_id = ? ORDER BY ordre ASC, id ASC',
      [formationId]
    );
    res.json({ programme: prog || null, modules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/formations/:id/programme', async (req, res) => {
  const formationId = parseInt(req.params.id);
  const { description_globale, objectifs, prerequis } = req.body;
  if (isNaN(formationId)) return res.status(400).json({ error: 'Formation ID invalide' });
  try {
    await db.query(
      `INSERT INTO programme_formations (formation_id, description_globale, objectifs, prerequis)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE description_globale = VALUES(description_globale),
                               objectifs = VALUES(objectifs),
                               prerequis = VALUES(prerequis)`,
      [formationId, description_globale || null, objectifs || null, prerequis || null]
    );
    res.json({ message: 'Programme sauvegardé ✅' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/formations/:id/modules', async (req, res) => {
  const formationId = parseInt(req.params.id);
  const { titre, description, duree_heures, ordre } = req.body;
  if (isNaN(formationId)) return res.status(400).json({ error: 'Formation ID invalide' });
  if (!titre || !titre.trim()) return res.status(400).json({ error: 'Le titre du module est obligatoire.' });
  try {
    const [result] = await db.query(
      'INSERT INTO modules_formation (formation_id, titre, description, duree_heures, ordre) VALUES (?, ?, ?, ?, ?)',
      [formationId, titre.trim(), description || null, duree_heures || null, ordre || 0]
    );
    res.json({ message: 'Module ajouté ✅', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/formations/:formationId/modules/:moduleId', async (req, res) => {
  const formationId = parseInt(req.params.formationId);
  const moduleId = parseInt(req.params.moduleId);
  const { titre, description, duree_heures, ordre } = req.body;
  if (isNaN(formationId) || isNaN(moduleId)) return res.status(400).json({ error: 'IDs invalides' });
  if (!titre || !titre.trim()) return res.status(400).json({ error: 'Le titre du module est obligatoire.' });
  try {
    const [result] = await db.query(
      'UPDATE modules_formation SET titre = ?, description = ?, duree_heures = ?, ordre = ? WHERE id = ? AND formation_id = ?',
      [titre.trim(), description || null, duree_heures || null, ordre || 0, moduleId, formationId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Module non trouvé' });
    res.json({ message: 'Module mis à jour ✅' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/formations/:formationId/modules/:moduleId', async (req, res) => {
  const formationId = parseInt(req.params.formationId);
  const moduleId = parseInt(req.params.moduleId);
  if (isNaN(formationId) || isNaN(moduleId)) return res.status(400).json({ error: 'IDs invalides' });
  try {
    const [result] = await db.query(
      'DELETE FROM modules_formation WHERE id = ? AND formation_id = ?',
      [moduleId, formationId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Module non trouvé' });
    res.json({ message: 'Module supprimé ✅' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= MODULES ========================= */

router.get('/formation-modules/:formationId', async (req, res) => {
  const formationId = parseInt(req.params.formationId);
  if (isNaN(formationId)) return res.status(400).json({ error: 'Formation ID invalide' });
  try {
    const [rows] = await db.query(
      'SELECT id, titre, ordre, duree_heures FROM modules_formation WHERE formation_id = ? ORDER BY ordre ASC, id ASC',
      [formationId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= SÉANCES ========================= */

router.get('/seances/:formationId', async (req, res) => {
  const formationId = parseInt(req.params.formationId);
  if (isNaN(formationId)) return res.status(400).json({ error: 'Formation ID invalide' });
  try {
    const [rows] = await db.query(
      `SELECT s.*, m.titre AS module_titre, m.ordre AS module_ordre
       FROM seances s LEFT JOIN modules_formation m ON s.module_id = m.id
       WHERE s.formation_id = ? ORDER BY s.date_seance ASC, s.heure_debut ASC`,
      [formationId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/seances', validate(seanceSchema), async (req, res) => {
  const { formation_id, date_seance, heure_debut, heure_fin, salle, module_id } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO seances (formation_id, date_seance, heure_debut, heure_fin, salle, module_id) VALUES (?, ?, ?, ?, ?, ?)',
      [formation_id, date_seance, heure_debut, heure_fin, salle || null, module_id || null]
    );
    res.json({ message: 'Séance créée ✅', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/seances/:id', async (req, res) => {
  const seanceId = parseInt(req.params.id);
  const { date_seance, heure_debut, heure_fin, salle, statut, module_id } = req.body;
  if (isNaN(seanceId)) return res.status(400).json({ error: 'Séance ID invalide' });
  try {
    const [result] = await db.query(
      'UPDATE seances SET date_seance = ?, heure_debut = ?, heure_fin = ?, salle = ?, statut = ?, module_id = ? WHERE id = ?',
      [date_seance, heure_debut, heure_fin, salle || null, statut || 'planifiée', module_id || null, seanceId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Séance non trouvée' });
    res.json({ message: 'Séance mise à jour ✅' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/seances/:id', async (req, res) => {
  const seanceId = parseInt(req.params.id);
  if (isNaN(seanceId)) return res.status(400).json({ error: 'Séance ID invalide' });
  try {
    const [result] = await db.query('DELETE FROM seances WHERE id = ?', [seanceId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Séance non trouvée' });
    res.json({ message: 'Séance supprimée ✅' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= PRÉSENCES ========================= */

router.get('/presences/:seanceId', async (req, res) => {
  const seanceId = parseInt(req.params.seanceId);
  if (isNaN(seanceId)) return res.status(400).json({ error: 'Séance ID invalide' });
  try {
    const [seanceRows] = await db.query('SELECT formation_id FROM seances WHERE id = ?', [seanceId]);
    if (seanceRows.length === 0) return res.status(404).json({ error: 'Séance non trouvée' });
    const formationId = seanceRows[0].formation_id;
    const [rows] = await db.query(
      `SELECT c.id AS candidat_id, u.nom, u.email,
              COALESCE(p.statut, 'absent') AS statut
       FROM inscriptions i
       JOIN candidats c ON i.candidat_id = c.id
       JOIN users u ON c.user_id = u.id
       LEFT JOIN presences p ON p.seance_id = ? AND p.candidat_id = c.id
       WHERE i.formation_id = ?
       ORDER BY u.nom ASC`,
      [seanceId, formationId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/presences/:seanceId/:candidatId', async (req, res) => {
  const seanceId = parseInt(req.params.seanceId);
  const candidatId = parseInt(req.params.candidatId);
  const { statut } = req.body;
  const validStatuts = ['présent', 'absent', 'retard', 'excusé'];
  if (isNaN(seanceId) || isNaN(candidatId)) return res.status(400).json({ error: 'IDs invalides' });
  if (!validStatuts.includes(statut)) return res.status(400).json({ error: 'Statut invalide' });

  try {
    await db.query(
      `INSERT INTO presences (seance_id, candidat_id, statut)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE statut = VALUES(statut)`,
      [seanceId, candidatId, statut]
    );
    res.json({ message: 'Présence enregistrée ✅' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  // Auto-progression et alerte taux (fire and forget)
  (async () => {
    try {
      const [seanceRows] = await db.query('SELECT formation_id, module_id FROM seances WHERE id = ?', [seanceId]);
      if (!seanceRows.length) return;
      const { formation_id: formationId, module_id: moduleId } = seanceRows[0];

      if (moduleId) {
        const [cr] = await db.query(
          `SELECT COUNT(s.id) AS total,
                  SUM(CASE WHEN p.statut IN ('présent','excusé') THEN 1 ELSE 0 END) AS presents
           FROM seances s
           LEFT JOIN presences p ON p.seance_id = s.id AND p.candidat_id = ?
           WHERE s.module_id = ?`,
          [candidatId, moduleId]
        );
        const total = Number(cr[0].total);
        const presents = Number(cr[0].presents);
        const newStatut = presents === total && total > 0 ? 'termine'
          : presents > 0 ? 'en_cours' : 'non_commence';

        await db.query(
          `INSERT INTO progression_candidats (candidat_id, formation_id, module_id, statut)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE statut = VALUES(statut), date_maj = NOW()`,
          [candidatId, formationId, moduleId, newStatut]
        );

        if (newStatut === 'termine') {
          const [rows] = await db.query(
            `SELECT (SELECT COUNT(*) FROM modules_formation WHERE formation_id = ?) AS total_m,
                    (SELECT COUNT(*) FROM progression_candidats WHERE candidat_id = ? AND formation_id = ? AND statut = 'termine') AS termines`,
            [formationId, candidatId, formationId]
          );
          if (rows[0].total_m > 0 && rows[0].total_m === rows[0].termines) {
            const [cRows] = await db.query('SELECT user_id FROM candidats WHERE id = ?', [candidatId]);
            const [fRows] = await db.query('SELECT titre FROM formations WHERE id = ?', [formationId]);
            if (cRows.length > 0 && fRows.length > 0) {
              await db.query(
                'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
                [cRows[0].user_id, `🎓 Félicitations ! Vous avez complété 100% de la formation « ${fRows[0].titre} ». Votre attestation est disponible !`, 'progression']
              );
            }
          }
        }
      }

      // Alerte taux de présence < 75%
      const [tr] = await db.query(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN p.statut IN ('présent','retard') THEN 1 ELSE 0 END) AS presents
         FROM seances s
         LEFT JOIN presences p ON p.seance_id = s.id AND p.candidat_id = ?
         WHERE s.formation_id = ?`,
        [candidatId, formationId]
      );
      if (tr[0] && tr[0].total > 0) {
        const taux = Math.round((tr[0].presents / tr[0].total) * 100);
        if (taux < 75) {
          const [cRows] = await db.query('SELECT user_id FROM candidats WHERE id = ?', [candidatId]);
          const [fRows] = await db.query('SELECT titre FROM formations WHERE id = ?', [formationId]);
          if (cRows.length > 0 && fRows.length > 0) {
            await db.query(
              'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
              [cRows[0].user_id, `⚠️ Votre taux de présence pour « ${fRows[0].titre} » est de ${taux}%. Un taux minimum de 75% est requis.`, 'presence']
            );
          }
        }
      }
    } catch (_) {}
  })();
});

/* ========================= JUSTIFICATIFS ========================= */

router.get('/justificatifs/:formationId', async (req, res) => {
  const formationId = parseInt(req.params.formationId);
  if (isNaN(formationId)) return res.status(400).json({ error: 'ID invalide' });
  const sql = `
    SELECT j.id, j.motif, j.statut, j.date_soumission,
           s.date_seance, s.heure_debut, s.id AS seance_id,
           u.nom AS candidat_nom, c.id AS candidat_id
    FROM justificatifs j
    JOIN seances s ON j.seance_id = s.id
    JOIN candidats c ON j.candidat_id = c.id
    JOIN users u ON c.user_id = u.id
    WHERE s.formation_id = ?
    ORDER BY j.date_soumission DESC
  `;
  try {
    const [rows] = await db.query(sql, [formationId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/justificatifs/:id', async (req, res) => {
  const justifId = parseInt(req.params.id);
  const { statut } = req.body;
  if (!['accepté', 'refusé'].includes(statut)) return res.status(400).json({ error: 'Statut invalide' });

  try {
    await db.query('UPDATE justificatifs SET statut = ? WHERE id = ?', [statut, justifId]);
    res.json({ message: `Justificatif ${statut} ✅` });

    // Traitement post-réponse (fire and forget)
    (async () => {
      try {
        const [jr] = await db.query('SELECT candidat_id, seance_id FROM justificatifs WHERE id = ?', [justifId]);
        if (!jr.length) return;
        const { candidat_id, seance_id } = jr[0];
        const [cr] = await db.query('SELECT user_id FROM candidats WHERE id = ?', [candidat_id]);
        const [sr] = await db.query('SELECT date_seance FROM seances WHERE id = ?', [seance_id]);
        if (!cr.length || !sr.length) return;
        const d = new Date(sr[0].date_seance).toLocaleDateString('fr-FR');

        if (statut === 'accepté') {
          await db.query(
            `INSERT INTO presences (seance_id, candidat_id, statut) VALUES (?, ?, 'excusé')
             ON DUPLICATE KEY UPDATE statut = 'excusé'`,
            [seance_id, candidat_id]
          );
          await db.query(
            'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
            [cr[0].user_id, `✅ Votre justificatif d'absence pour la séance du ${d} a été accepté.`, 'presence']
          );
        } else {
          await db.query(
            'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
            [cr[0].user_id, `❌ Votre justificatif d'absence pour la séance du ${d} a été refusé.`, 'presence']
          );
        }
      } catch (_) {}
    })();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
