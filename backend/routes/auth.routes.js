const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const validate = require('../middleware/validate');
const { loginSchema, registerSchema, changePasswordSchema } = require('../validators/schemas');

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const profilePhotoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
      cb(null, 'profil-' + unique + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    /png|jpg|jpeg|gif|webp/.test(path.extname(file.originalname).toLowerCase().replace('.', ''))
      ? cb(null, true)
      : cb(new Error('Seules les images sont autorisées'));
  }
});

router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, mot_de_passe } = req.body;
  try {
    const [results] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (results.length === 0) return res.status(401).json({ message: 'Identifiants incorrects' });
    const user = results[0];
    const valid = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!valid) return res.status(401).json({ message: 'Identifiants incorrects' });
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    const baseUser = { id: user.id, nom: user.nom, email: user.email, role: user.role };
    if (user.role === 'candidat') {
      const [rows] = await db.query('SELECT id FROM candidats WHERE user_id = ?', [user.id]);
      return res.json({ token, user: { ...baseUser, candidatId: rows[0]?.id || null } });
    } else if (user.role === 'formateur') {
      const [rows] = await db.query('SELECT id FROM formateurs WHERE user_id = ?', [user.id]);
      return res.json({ token, user: { ...baseUser, formateurId: rows[0]?.id || null } });
    } else if (user.role === 'externe') {
      const [rows] = await db.query('SELECT id FROM externes WHERE user_id = ?', [user.id]);
      return res.json({ token, user: { ...baseUser, externeId: rows[0]?.id || null } });
    } else {
      res.json({ token, user: baseUser });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/register', validate(registerSchema), async (req, res) => {
  const { nom, email, mot_de_passe, role, specialite, niveau, cin, telephone, entreprise, date_naissance } = req.body;
  try {

    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length > 0) return res.status(400).json({ message: 'Email déjà utilisé ❌' });

    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
    const [result] = await db.query(
      'INSERT INTO users (nom, email, mot_de_passe, role) VALUES (?, ?, ?, ?)',
      [nom, email, hashedPassword, role]
    );
    const userId = result.insertId;

    if (role === 'candidat') {
      const [resultCin] = await db.query('SELECT * FROM candidats WHERE cin = ?', [cin]);
      if (resultCin.length > 0) return res.status(400).json({ message: 'CIN déjà utilisé ❌' });
      await db.query(
        'INSERT INTO candidats (user_id, progression, niveau, specialite, cin, telephone, entreprise, date_naissance) VALUES (?, 0, ?, ?, ?, ?, ?, ?)',
        [userId, niveau, specialite, cin, telephone || null, entreprise || null, date_naissance || null]
      );
      return res.json({ message: 'Candidat créé avec succès 🎓' });
    } else if (role === 'admin') {
      await db.query('INSERT INTO admins (user_id) VALUES (?)', [userId]);
      return res.json({ message: 'Admin créé avec succès ⚙️' });
    } else if (role === 'externe') {
      await db.query(
        'INSERT INTO externes (user_id, telephone, entreprise, specialite, date_naissance) VALUES (?, ?, ?, ?, ?)',
        [userId, telephone || null, entreprise || null, specialite || null, date_naissance || null]
      );
      return res.json({ message: 'Compte externe créé avec succès 🌐' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', (req, res) => { res.json({ message: 'Déconnexion réussie' }); });

const { verifyToken } = require('../middleware/auth.middleware');

router.get('/profile', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;
  try {
    const [users] = await db.query('SELECT id, nom, email, role, photo_profil FROM users WHERE id = ?', [userId]);
    if (!users.length) return res.status(404).json({ message: 'Utilisateur introuvable' });
    const user = users[0];
    if (role === 'candidat') {
      const [rows] = await db.query(
        'SELECT cin, niveau, specialite, telephone, entreprise, date_naissance FROM candidats WHERE user_id = ?', [userId]
      );
      return res.json({ ...user, ...(rows[0] || {}) });
    } else if (role === 'formateur') {
      const [rows] = await db.query(
        'SELECT specialite, telephone, date_naissance FROM formateurs WHERE user_id = ?', [userId]
      );
      return res.json({ ...user, ...(rows[0] || {}) });
    } else if (role === 'externe') {
      const [rows] = await db.query(
        'SELECT telephone, entreprise, specialite, date_naissance FROM externes WHERE user_id = ?', [userId]
      );
      return res.json({ ...user, ...(rows[0] || {}) });
    } else {
      res.json(user);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/profile', verifyToken, async (req, res) => {
  const { nom, email, telephone, date_naissance, specialite, cin, niveau, entreprise } = req.body;
  const userId = req.user.id;
  const role = req.user.role;
  if (!nom || !email) return res.status(400).json({ message: 'Nom et email requis' });
  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
    if (existing.length > 0) return res.status(400).json({ message: 'Email déjà utilisé par un autre compte' });
    await db.query('UPDATE users SET nom = ?, email = ? WHERE id = ?', [nom, email, userId]);
    if (role === 'candidat') {
      await db.query(
        'UPDATE candidats SET telephone = ?, date_naissance = ?, specialite = ?, cin = ?, niveau = ?, entreprise = ? WHERE user_id = ?',
        [telephone || null, date_naissance || null, specialite || null, cin || null, niveau || null, entreprise || null, userId]
      );
    } else if (role === 'formateur') {
      await db.query(
        'UPDATE formateurs SET specialite = ?, telephone = ?, date_naissance = ? WHERE user_id = ?',
        [specialite || null, telephone || null, date_naissance || null, userId]
      );
    } else if (role === 'externe') {
      await db.query(
        'UPDATE externes SET telephone = ?, entreprise = ?, specialite = ?, date_naissance = ? WHERE user_id = ?',
        [telephone || null, entreprise || null, specialite || null, date_naissance || null, userId]
      );
    }
    res.json({ message: 'Profil mis à jour avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/change-password', verifyToken, validate(changePasswordSchema), async (req, res) => {
  const { ancien_mdp, nouveau_mdp } = req.body;
  const userId = req.user.id;
  try {
    const [results] = await db.query('SELECT mot_de_passe FROM users WHERE id = ?', [userId]);
    if (!results.length) return res.status(404).json({ message: 'Utilisateur introuvable' });
    const valid = await bcrypt.compare(ancien_mdp, results[0].mot_de_passe);
    if (!valid) return res.status(401).json({ message: 'Ancien mot de passe incorrect' });
    const hashed = await bcrypt.hash(nouveau_mdp, 10);
    await db.query('UPDATE users SET mot_de_passe = ? WHERE id = ?', [hashed, userId]);
    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/profile/photo', verifyToken, profilePhotoUpload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Aucun fichier fourni' });
  const userId = req.user.id;
  const newPath = `/uploads/${req.file.filename}`;
  try {
    const [rows] = await db.query('SELECT photo_profil FROM users WHERE id = ?', [userId]);
    const old = rows[0]?.photo_profil;
    if (old) {
      const oldFile = path.join(uploadsDir, path.basename(old));
      if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
    }
    await db.query('UPDATE users SET photo_profil = ? WHERE id = ?', [newPath, userId]);
    res.json({ photo_profil: newPath });
  } catch (err) {
    console.error('[POST /profile/photo]', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/specialites', (req, res) => {
  res.json([
    { id: 1,  nom: 'Informatique' },
    { id: 2,  nom: 'Développement Web' },
    { id: 3,  nom: 'Réseaux et Télécommunications' },
    { id: 4,  nom: 'Génie Logiciel' },
    { id: 5,  nom: 'Intelligence Artificielle' },
    { id: 6,  nom: 'Génie Mécanique' },
    { id: 7,  nom: 'Génie Civil' },
    { id: 8,  nom: 'Génie Électrique' },
    { id: 9,  nom: 'Électronique' },
    { id: 10, nom: 'Finance et Comptabilité' },
    { id: 11, nom: 'Commerce et Marketing' },
    { id: 12, nom: 'Gestion des Entreprises' },
  ]);
});

module.exports = router;
