const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyAdmin } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { formationSchema, moduleSchema, createFormateurSchema, updateFormateurSchema } = require('../validators/schemas');

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  }
});

const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /png|jpg|jpeg|gif|webp/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    allowed.test(ext) ? cb(null, true) : cb(new Error('Seules les images sont autorisées'));
  }
});

const uploadSupport = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

const allowedStatuses = ['draft', 'published', 'accepted', 'archivée'];

const autoArchiver = async () => {
  await db.query(`
    UPDATE formations SET status = 'archivée'
    WHERE status IN ('published', 'accepted', 'pending_approval', 'draft')
      AND (
        (date_fin IS NOT NULL AND date_fin < CURDATE())
        OR (date_fin IS NULL AND date_debut < CURDATE())
      )
  `);
};

const isValidDate = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value));

const validateFormationPayload = ({ titre, date_debut, date_fin, specialite, nb_places, formateur_id, status, prix }) => {
  if (!titre || typeof titre !== 'string' || titre.trim().length === 0) return 'Le titre est obligatoire.';
  if (!date_debut || !isValidDate(date_debut)) return 'La date de début est invalide.';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(date_debut) < today) return "La date de début doit être aujourd'hui ou dans le futur.";
  if (date_fin && !isValidDate(date_fin)) return 'La date de fin est invalide.';
  if (date_fin && new Date(date_fin) < new Date(date_debut)) return 'La date de fin doit être postérieure ou égale à la date de début.';
  if (!nb_places || Number(nb_places) <= 0) return 'Le nombre de places doit être un nombre positif.';
  if (!specialite || typeof specialite !== 'string' || specialite.trim().length === 0) return 'Le spécialité est obligatoire.';
  if (!formateur_id || Number(formateur_id) <= 0) return 'Le formateur est obligatoire.';
  if (prix !== undefined && prix !== null && Number(prix) < 0) return 'Le prix doit être positif ou nul.';
  if (status && !allowedStatuses.includes(status)) return 'Le statut est invalide.';
  return null;
};

router.use(verifyAdmin);

/* ========================= USERS ========================= */
router.get('/users', async (req, res) => {
  const sql = `
    SELECT u.id, u.nom, u.email, u.role,
      COALESCE(c.specialite, f.specialite, ex.specialite) AS specialite
    FROM users u
    LEFT JOIN candidats c  ON u.role = 'candidat'  AND c.user_id = u.id
    LEFT JOIN formateurs f ON u.role = 'formateur' AND f.user_id = u.id
    LEFT JOIN externes ex  ON u.role = 'externe'   AND ex.user_id = u.id
    ORDER BY u.id DESC
  `;
  try {
    const [results] = await db.query(sql);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  const targetId = parseInt(req.params.id);
  if (isNaN(targetId)) return res.status(400).json({ message: 'ID invalide.' });
  try {
    const [rows] = await db.query('SELECT role FROM users WHERE id = ?', [targetId]);
    if (rows.length === 0) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    if (rows[0].role === 'admin') return res.status(403).json({ message: 'Impossible de supprimer un compte administrateur.' });

    if (rows[0].role === 'formateur') {
      const [result] = await db.query(
        `SELECT COUNT(*) AS cnt FROM formations f JOIN formateurs fo ON f.formateur_id = fo.id WHERE fo.user_id = ?`,
        [targetId]
      );
      if (result[0].cnt > 0)
        return res.status(400).json({ message: 'Impossible de supprimer ce formateur : il possède des formations actives.' });
    }

    await db.query('DELETE FROM users WHERE id = ?', [targetId]);
    res.json({ message: 'Utilisateur supprimé avec succès.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= FORMATIONS (ADMIN VIEW) ========================= */
router.get('/formations', async (req, res) => {
  const sql = `
    SELECT f.id, f.titre, f.description, f.date_debut, f.date_fin,
           f.duree, f.specialite, f.nb_places, f.prix, f.status, f.formateur_id,
           f.photo, u.nom AS formateur
    FROM formations f
    LEFT JOIN formateurs fo ON f.formateur_id = fo.id
    LEFT JOIN users u ON fo.user_id = u.id
    ORDER BY f.status = 'archivée' ASC, f.id DESC
  `;
  try {
    await autoArchiver();
    const [results] = await db.query(sql);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= CREATE FORMATION ========================= */
router.post('/formations', uploadImage.single('photo'), validate(formationSchema), async (req, res) => {
  const payload = req.body;
  const validationError = validateFormationPayload(payload);
  if (validationError) return res.status(400).json({ message: validationError });

  const { titre, description, date_debut, specialite, nb_places, formateur_id, prix } = payload;
  const date_fin = payload.date_fin && payload.date_fin !== '' ? payload.date_fin : null;
  const photo = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const [formateurs] = await db.query('SELECT id, user_id FROM formateurs WHERE id = ?', [formateur_id]);
    if (formateurs.length === 0) return res.status(400).json({ message: 'Formateur introuvable.' });
    const formateurUserId = formateurs[0].user_id;

    const [result] = await db.query(
      `INSERT INTO formations (titre, description, date_debut, date_fin, specialite, nb_places, prix, formateur_id, status, photo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
      [titre, description, date_debut, date_fin, specialite, nb_places, prix || 0, formateur_id, photo]
    );

    const dateFormatee = new Date(date_debut).toLocaleDateString('fr-FR');
    db.query(
      'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
      [formateurUserId, `📋 Une nouvelle formation vous a été assignée : « ${titre} » — Spécialité : ${specialite} — Début : ${dateFormatee}`, 'assignation']
    ).catch(() => {});

    res.json({ message: 'Formation créée (draft) ✅', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= UPDATE FORMATION ========================= */
router.put('/formations/:id', uploadImage.single('photo'), validate(formationSchema), async (req, res) => {
  const { id } = req.params;
  const payload = req.body;
  const { titre, specialite, nb_places, formateur_id, status, prix, photo_existante } = payload;
  const date_debut = payload.date_debut || null;
  const date_fin = payload.date_fin && payload.date_fin !== '' ? payload.date_fin : null;
  const description = payload.description || '';
  const photo = req.file ? `/uploads/${req.file.filename}` : (photo_existante || null);

  if (!titre || !titre.trim()) return res.status(400).json({ message: 'Le titre est obligatoire.' });
  if (!date_debut) return res.status(400).json({ message: 'La date de début est obligatoire.' });
  if (!nb_places || Number(nb_places) <= 0) return res.status(400).json({ message: 'Le nombre de places doit être un nombre positif.' });
  if (!specialite || !specialite.trim()) return res.status(400).json({ message: 'La spécialité est obligatoire.' });
  if (!formateur_id || Number(formateur_id) <= 0) return res.status(400).json({ message: 'Le formateur est obligatoire.' });

  try {
    const [rows] = await db.query(
      'SELECT f.user_id, fo.formateur_id AS ancien_formateur_id FROM formations fo JOIN formateurs f ON f.id = ? WHERE fo.id = ?',
      [formateur_id, id]
    );
    const [formateurs] = await db.query('SELECT id, user_id FROM formateurs WHERE id = ?', [formateur_id]);
    if (formateurs.length === 0) return res.status(400).json({ message: 'Formateur introuvable.' });

    const formateurUserId = formateurs[0].user_id;
    const ancienFormateurId = rows.length > 0 ? rows[0].ancien_formateur_id : null;

    await db.query(
      `UPDATE formations SET titre=?, description=?, date_debut=?, date_fin=?,
          specialite=?, nb_places=?, prix=?, formateur_id=?, status=?, photo=? WHERE id=?`,
      [titre, description, date_debut, date_fin, specialite, nb_places, prix || 0, formateur_id, status || 'draft', photo, id]
    );

    if (String(ancienFormateurId) !== String(formateur_id)) {
      const dateFormatee = new Date(date_debut).toLocaleDateString('fr-FR');
      db.query(
        'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
        [formateurUserId, `📋 La formation « ${titre} » vous a été assignée par l'administrateur — Début : ${dateFormatee}`, 'assignation']
      ).catch(() => {});
    }

    res.json({ message: 'Formation modifiée ✅' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/formations/:id/publish', async (req, res) => {
  try {
    await db.query("UPDATE formations SET status='published' WHERE id=?", [req.params.id]);
    res.json({ message: 'Formation publiée 🚀' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/formations/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM formations WHERE id=?', [req.params.id]);
    res.json({ message: 'Formation supprimée ❌' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= FORMATEURS ========================= */
router.get('/formateurs', async (req, res) => {
  try {
    const [results] = await db.query(
      `SELECT f.id, u.nom, u.email, f.specialite FROM formateurs f JOIN users u ON f.user_id = u.id ORDER BY u.nom ASC`
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/formateurs', validate(createFormateurSchema), async (req, res) => {
  const { nom, email, mot_de_passe, specialite } = req.body;
  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length > 0) return res.status(400).json({ message: 'Email déjà utilisé.' });
    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
    const [result] = await db.query(
      'INSERT INTO users (nom, email, mot_de_passe, role) VALUES (?, ?, ?, ?)',
      [nom, email, hashedPassword, 'formateur']
    );
    await db.query('INSERT INTO formateurs (user_id, specialite) VALUES (?, ?)', [result.insertId, specialite || null]);
    res.status(201).json({ message: 'Formateur créé avec succès.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/formateurs/:id', validate(updateFormateurSchema), async (req, res) => {
  const { id } = req.params;
  const { nom, email, mot_de_passe, specialite } = req.body;
  try {
    const [results] = await db.query('SELECT user_id FROM formateurs WHERE id = ?', [id]);
    if (results.length === 0) return res.status(404).json({ message: 'Formateur introuvable.' });
    const userId = results[0].user_id;

    const [existing] = await db.query('SELECT * FROM users WHERE email = ? AND id <> ?', [email, userId]);
    if (existing.length > 0) return res.status(400).json({ message: 'Email déjà utilisé par un autre compte.' });

    if (mot_de_passe) {
      const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
      await db.query('UPDATE users SET nom=?, email=?, mot_de_passe=? WHERE id=?', [nom, email, hashedPassword, userId]);
    } else {
      await db.query('UPDATE users SET nom=?, email=? WHERE id=?', [nom, email, userId]);
    }
    await db.query('UPDATE formateurs SET specialite=? WHERE id=?', [specialite || null, id]);
    res.json({ message: 'Formateur mis à jour avec succès.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/formateurs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [formations] = await db.query('SELECT * FROM formations WHERE formateur_id = ?', [id]);
    if (formations.length > 0) return res.status(400).json({ message: 'Impossible de supprimer un formateur lié à des formations.' });
    const [results] = await db.query('SELECT user_id FROM formateurs WHERE id = ?', [id]);
    if (results.length === 0) return res.status(404).json({ message: 'Formateur introuvable.' });
    const userId = results[0].user_id;
    await db.query('DELETE FROM formateurs WHERE id = ?', [id]);
    await db.query('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ message: 'Formateur supprimé avec succès.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= STATS ========================= */
router.get('/stats', async (req, res) => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM users WHERE role='candidat') AS candidats,
      (SELECT COUNT(*) FROM formateurs) AS formateurs,
      (SELECT COUNT(*) FROM formations) AS formations,
      (SELECT COUNT(*) FROM formations WHERE status='published') AS published
  `;
  try {
    const [results] = await db.query(sql);
    res.json(results[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= DÉTAILS COMPLETS D'UNE FORMATION ========================= */
router.get('/formations/:id/details', async (req, res) => {
  const formationId = parseInt(req.params.id);
  if (isNaN(formationId)) return res.status(400).json({ error: 'Formation ID invalide' });
  try {
    const [[formation]] = await db.query(
      `SELECT f.id, f.titre, f.description, f.date_debut, f.date_fin,
              f.duree, f.specialite, f.nb_places, f.prix, f.status, f.photo, f.formateur_id,
              u.nom AS formateur_nom, u.email AS formateur_email, fo.specialite AS formateur_specialite
       FROM formations f
       LEFT JOIN formateurs fo ON f.formateur_id = fo.id
       LEFT JOIN users u ON fo.user_id = u.id
       WHERE f.id = ?`,
      [formationId]
    );
    if (!formation) return res.status(404).json({ error: 'Formation non trouvée' });

    const [[programme]] = await db.query(
      'SELECT description_globale, objectifs, prerequis FROM programme_formations WHERE formation_id = ?',
      [formationId]
    );
    const [modules] = await db.query(
      'SELECT id, titre, description, duree_heures, ordre FROM modules_formation WHERE formation_id = ? ORDER BY ordre ASC, id ASC',
      [formationId]
    );
    const [supports] = await db.query(
      'SELECT id, type, fichier FROM supports WHERE formation_id = ?',
      [formationId]
    );

    res.json({ formation, programme: programme || null, modules, supports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= FORMATIONS EN ATTENTE ========================= */
router.get('/formations-pending', async (req, res) => {
  const sql = `
    SELECT f.id, f.titre, f.description, f.date_debut, f.date_fin,
           f.duree, f.specialite, f.nb_places, f.status, f.formateur_id,
           u.nom AS formateur, u.email AS formateur_email
    FROM formations f
    LEFT JOIN formateurs fo ON f.formateur_id = fo.id
    LEFT JOIN users u ON fo.user_id = u.id
    WHERE f.status = 'pending_approval'
    ORDER BY f.id DESC
  `;
  try {
    const [results] = await db.query(sql);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= ACCEPTER (pending_approval → accepted) ========================= */
router.put('/formations/:id/accept', async (req, res) => {
  const formationId = parseInt(req.params.id);
  if (isNaN(formationId)) return res.status(400).json({ error: 'Formation ID invalide' });
  try {
    const [result] = await db.query(
      "UPDATE formations SET status = 'accepted' WHERE id = ? AND status = 'pending_approval'",
      [formationId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Formation introuvable ou déjà traitée' });
    res.json({ message: 'Formation acceptée ✅' });

    db.query(
      `SELECT f.titre, u.id AS formateur_user_id FROM formations f
       JOIN formateurs fo ON f.formateur_id = fo.id
       JOIN users u ON fo.user_id = u.id WHERE f.id = ?`,
      [formationId]
    ).then(([nr]) => {
      if (nr.length > 0) {
        db.query(
          'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
          [nr[0].formateur_user_id, `✅ Votre formation « ${nr[0].titre} » a été acceptée par l'administrateur. Elle sera publiée prochainement.`, 'approbation']
        ).catch(() => {});
      }
    }).catch(() => {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= PUBLIER ACCEPTÉE (accepted → published) ========================= */
router.put('/formations/:id/publish-accepted', async (req, res) => {
  const formationId = parseInt(req.params.id);
  if (isNaN(formationId)) return res.status(400).json({ error: 'Formation ID invalide' });

  const { date_debut, date_fin, prix: prixRaw } = req.body;
  if (!date_debut) return res.status(400).json({ error: 'La date de début est obligatoire pour publier.' });

  const prix = prixRaw !== undefined && prixRaw !== null && prixRaw !== '' ? parseFloat(prixRaw) : 0;

  try {
    const [result] = await db.query(
      `UPDATE formations SET status = 'published', date_debut = ?, date_fin = ?, prix = ?
       WHERE id = ? AND status = 'accepted'`,
      [date_debut, date_fin || null, prix, formationId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Formation introuvable ou non encore acceptée' });
    res.json({ message: 'Formation publiée dans le catalogue 🚀' });

    db.query('INSERT IGNORE INTO programme_formations (formation_id) VALUES (?)', [formationId]).catch(() => {});
    db.query(
      `SELECT f.titre, u.id AS formateur_user_id FROM formations f
       JOIN formateurs fo ON f.formateur_id = fo.id
       JOIN users u ON fo.user_id = u.id WHERE f.id = ?`,
      [formationId]
    ).then(([nr]) => {
      if (nr.length > 0) {
        db.query(
          'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
          [nr[0].formateur_user_id, `🚀 Votre formation « ${nr[0].titre} » est maintenant publiée dans le catalogue !`, 'publication']
        ).catch(() => {});
      }
    }).catch(() => {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= SÉANCES (admin) ========================= */
router.get('/formations/:id/seances', async (req, res) => {
  const formationId = parseInt(req.params.id);
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

router.post('/formations/:id/seances', async (req, res) => {
  const formationId = parseInt(req.params.id);
  const { date_seance, heure_debut, heure_fin, salle, module_id } = req.body;
  if (isNaN(formationId)) return res.status(400).json({ error: 'Formation ID invalide' });
  if (!date_seance || !heure_debut || !heure_fin)
    return res.status(400).json({ error: 'Date, heure début et heure fin sont obligatoires.' });
  try {
    const [result] = await db.query(
      'INSERT INTO seances (formation_id, date_seance, heure_debut, heure_fin, salle, module_id) VALUES (?, ?, ?, ?, ?, ?)',
      [formationId, date_seance, heure_debut, heure_fin, salle || null, module_id || null]
    );
    res.json({ message: 'Séance ajoutée ✅', id: result.insertId });
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

/* ========================= FORMATIONS ACCEPTÉES ========================= */
router.get('/formations-accepted', async (req, res) => {
  const sql = `
    SELECT f.id, f.titre, f.description, f.date_debut, f.date_fin,
           f.duree, f.specialite, f.nb_places, f.status, f.formateur_id,
           u.nom AS formateur, u.email AS formateur_email,
           (SELECT COUNT(*) FROM modules_formation WHERE formation_id = f.id) AS module_count
    FROM formations f
    LEFT JOIN formateurs fo ON f.formateur_id = fo.id
    LEFT JOIN users u ON fo.user_id = u.id
    WHERE f.status = 'accepted'
    ORDER BY f.id DESC
  `;
  try {
    const [results] = await db.query(sql);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= REJETER (pending_approval → draft) ========================= */
router.put('/formations/:id/reject', async (req, res) => {
  const formationId = parseInt(req.params.id);
  const { reason } = req.body;
  if (isNaN(formationId)) return res.status(400).json({ error: 'Formation ID invalide' });
  try {
    const [result] = await db.query(
      "UPDATE formations SET status = 'draft' WHERE id = ? AND status = 'pending_approval'",
      [formationId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Formation non trouvée ou déjà approuvée' });
    res.json({ message: `Formation rejetée 🔙 Raison: ${reason || 'Non spécifiée'}` });

    db.query(
      `SELECT f.titre, u.id AS formateur_user_id FROM formations f
       JOIN formateurs fo ON f.formateur_id = fo.id
       JOIN users u ON fo.user_id = u.id WHERE f.id = ?`,
      [formationId]
    ).then(([nr]) => {
      if (nr.length > 0) {
        db.query(
          'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
          [nr[0].formateur_user_id, `❌ Votre formation « ${nr[0].titre} » a été rejetée. Raison : ${reason || 'Non spécifiée'}`, 'rejet']
        ).catch(() => {});
      }
    }).catch(() => {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= PROGRAMME DE FORMATION ========================= */
router.get('/formations/:id/programme', async (req, res) => {
  const { id } = req.params;
  try {
    const [progRows] = await db.query('SELECT * FROM programme_formations WHERE formation_id = ?', [id]);
    const [modules] = await db.query(
      'SELECT * FROM modules_formation WHERE formation_id = ? ORDER BY ordre ASC, id ASC', [id]
    );
    res.json({ programme: progRows[0] || null, modules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/formations/:id/programme', async (req, res) => {
  const { id } = req.params;
  const { description_globale, objectifs, prerequis } = req.body;
  const sql = `
    INSERT INTO programme_formations (formation_id, description_globale, objectifs, prerequis)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      description_globale = VALUES(description_globale),
      objectifs           = VALUES(objectifs),
      prerequis           = VALUES(prerequis)
  `;
  try {
    await db.query(sql, [id, description_globale || null, objectifs || null, prerequis || null]);
    res.json({ message: 'Programme sauvegardé.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/formations/:id/modules', validate(moduleSchema), async (req, res) => {
  const { id } = req.params;
  const { titre, description, duree_heures, ordre } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO modules_formation (formation_id, titre, description, duree_heures, ordre) VALUES (?, ?, ?, ?, ?)',
      [id, titre.trim(), description || null, duree_heures || null, ordre ?? 0]
    );
    res.json({ id: result.insertId, message: 'Module ajouté.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/formations/:formationId/modules/:moduleId', async (req, res) => {
  const { moduleId } = req.params;
  const { titre, description, duree_heures, ordre } = req.body;
  if (!titre || !titre.trim()) return res.status(400).json({ message: 'Titre du module obligatoire.' });
  try {
    await db.query(
      'UPDATE modules_formation SET titre=?, description=?, duree_heures=?, ordre=? WHERE id=?',
      [titre.trim(), description || null, duree_heures || null, ordre ?? 0, moduleId]
    );
    res.json({ message: 'Module mis à jour.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/formations/:formationId/modules/:moduleId', async (req, res) => {
  const { moduleId } = req.params;
  try {
    await db.query('DELETE FROM modules_formation WHERE id=?', [moduleId]);
    res.json({ message: 'Module supprimé.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= QUIZ ========================= */
router.get('/formations/:id/quiz', async (req, res) => {
  const { id } = req.params;
  try {
    const [[quiz]] = await db.query('SELECT * FROM quiz WHERE formation_id = ?', [id]);
    if (!quiz) return res.json(null);
    const [questions] = await db.query(
      'SELECT * FROM questions_quiz WHERE quiz_id = ? ORDER BY ordre ASC', [quiz.id]
    );
    for (const q of questions) {
      const [reponses] = await db.query('SELECT * FROM reponses_quiz WHERE question_id = ?', [q.id]);
      q.reponses = reponses;
    }
    quiz.questions = questions;
    res.json(quiz);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/formations/:id/quiz', async (req, res) => {
  const { id } = req.params;
  const { titre = 'Quiz de validation', seuil_reussite = 70, nb_tentatives = 3, questions = [] } = req.body;
  if (!questions.length) return res.status(400).json({ error: 'Le quiz doit avoir au moins une question.' });
  try {
    await db.query('DELETE FROM quiz WHERE formation_id = ?', [id]);
    const [result] = await db.query(
      'INSERT INTO quiz (formation_id, titre, seuil_reussite, nb_tentatives) VALUES (?, ?, ?, ?)',
      [id, titre, seuil_reussite, nb_tentatives]
    );
    const quizId = result.insertId;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const [qResult] = await db.query(
        'INSERT INTO questions_quiz (quiz_id, question, ordre) VALUES (?, ?, ?)', [quizId, q.question, i]
      );
      for (const r of (q.reponses || [])) {
        await db.query(
          'INSERT INTO reponses_quiz (question_id, reponse, est_correcte) VALUES (?, ?, ?)',
          [qResult.insertId, r.reponse, r.est_correcte ? 1 : 0]
        );
      }
    }
    res.json({ message: 'Quiz sauvegardé.', quizId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/formations/:id/quiz', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM quiz WHERE formation_id = ?', [id]);
    res.json({ message: 'Quiz supprimé.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ========================= SUPPORTS ========================= */
router.post('/formations/:id/supports', uploadSupport.single('fichier'), async (req, res) => {
  const { id } = req.params;
  const { type } = req.body;
  if (!type) return res.status(400).json({ error: 'Le type de support est obligatoire.' });

  const fichier = req.file ? `/uploads/${req.file.filename}` : req.body.fichier;
  if (!fichier) return res.status(400).json({ error: 'Un fichier ou une URL est obligatoire.' });

  try {
    const [result] = await db.query(
      'INSERT INTO supports (formation_id, type, fichier) VALUES (?, ?, ?)',
      [id, type, fichier]
    );
    const nom = req.body.nom || req.file?.originalname || fichier;
    res.json({ id: result.insertId, type, fichier, nom });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/supports/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [[sup]] = await db.query('SELECT fichier FROM supports WHERE id = ?', [id]);
    if (sup && sup.fichier && sup.fichier.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', sup.fichier);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await db.query('DELETE FROM supports WHERE id = ?', [id]);
    res.json({ message: 'Support supprimé.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
