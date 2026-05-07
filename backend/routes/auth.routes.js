const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

router.post('/login', (req, res) => {
  const { email, mot_de_passe } = req.body;
  const sql = 'SELECT * FROM users WHERE email = ?';
  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).send(err);
    if (results.length === 0) return res.status(401).json({ message: 'Identifiants incorrects' });
    const user = results[0];
    const valid = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!valid) return res.status(401).json({ message: 'Identifiants incorrects' });
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    const baseUser = { id: user.id, nom: user.nom, email: user.email, role: user.role };
    if (user.role === 'etudiant') {
      db.query('SELECT id FROM etudiants WHERE user_id = ?', [user.id], (err2, rows) => {
        if (err2) return res.status(500).json(err2);
        res.json({ token, user: { ...baseUser, etudiantId: rows[0]?.id || null } });
      });
    } else if (user.role === 'formateur') {
      db.query('SELECT id FROM formateurs WHERE user_id = ?', [user.id], (err2, rows) => {
        if (err2) return res.status(500).json(err2);
        res.json({ token, user: { ...baseUser, formateurId: rows[0]?.id || null } });
      });
    } else if (user.role === 'externe') {
      db.query('SELECT id FROM externes WHERE user_id = ?', [user.id], (err2, rows) => {
        if (err2) return res.status(500).json(err2);
        res.json({ token, user: { ...baseUser, externeId: rows[0]?.id || null } });
      });
    } else {
      res.json({ token, user: baseUser });
    }
  });
});

router.post('/register', async (req, res) => {
  const { nom, email, mot_de_passe, role, specialite, niveau, cin, telephone, entreprise, date_naissance } = req.body;
  try {
    if (!nom || !email || !mot_de_passe || !role) return res.status(400).json({ message: "Champs manquants ❌" });
      if (['etudiant', 'formateur', 'externe'].includes(role) && !specialite)
        return res.status(400).json({ message: "La spécialité est obligatoire ❌" });
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, users) => {
      if (err) return res.status(500).send(err);
      if (users.length > 0) return res.status(400).json({ message: "Email déjà utilisé ❌" });
      const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
      db.query('INSERT INTO users (nom, email, mot_de_passe, role) VALUES (?, ?, ?, ?)',
        [nom, email, hashedPassword, role], (err2, result) => {
          if (err2) return res.status(500).send(err2);
          const userId = result.insertId;
          if (role === 'etudiant') {
            if (!cin) return res.status(400).json({ message: "CIN obligatoire ❌" });
            db.query('SELECT * FROM etudiants WHERE cin = ?', [cin], (err3, resultCin) => {
              if (err3) return res.status(500).send(err3);
              if (resultCin.length > 0) return res.status(400).json({ message: "CIN déjà utilisé ❌" });
              db.query(
                `INSERT INTO etudiants (user_id, progression, niveau, specialite, cin, telephone, date_naissance) VALUES (?, 0, ?, ?, ?, ?, ?)`,
                [userId, niveau, specialite, cin, telephone || null, date_naissance || null],
                (err4) => { if (err4) return res.status(500).send(err4); return res.json({ message: "Étudiant créé avec succès 🎓" }); }
              );
            });
          } else if (role === 'formateur') {
            db.query('INSERT INTO formateurs (user_id, specialite, telephone, date_naissance) VALUES (?, ?, ?, ?)',
              [userId, specialite || null, telephone || null, date_naissance || null],
              (err5) => { if (err5) return res.status(500).send(err5); return res.json({ message: "Formateur créé avec succès 👨‍🏫" }); }
            );
          } else if (role === 'admin') {
            db.query('INSERT INTO admins (user_id) VALUES (?)', [userId],
              (err6) => { if (err6) return res.status(500).send(err6); return res.json({ message: "Admin créé avec succès ⚙️" }); }
            );
          } else if (role === 'externe') {
            db.query('INSERT INTO externes (user_id, telephone, entreprise, specialite, date_naissance) VALUES (?, ?, ?, ?, ?)',
              [userId, telephone || null, entreprise || null, specialite || null, date_naissance || null],
              (err7) => { if (err7) return res.status(500).send(err7); return res.json({ message: "Compte externe créé avec succès 🌐" }); }
            );
          }
        }
      );
    });
  } catch (error) { console.error(error); res.status(500).send(error); }
});

router.post('/logout', (req, res) => { res.json({ message: 'Déconnexion réussie' }); });

const { verifyToken } = require('../middleware/auth.middleware');

router.get('/profile', verifyToken, (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;
  db.query('SELECT id, nom, email, role FROM users WHERE id = ?', [userId], (err, users) => {
    if (err) return res.status(500).json(err);
    if (!users.length) return res.status(404).json({ message: 'Utilisateur introuvable' });
    const user = users[0];
    if (role === 'etudiant') {
      db.query('SELECT cin, niveau, specialite, telephone, date_naissance FROM etudiants WHERE user_id = ?', [userId], (err2, rows) => {
        if (err2) return res.status(500).json(err2);
        res.json({ ...user, ...(rows[0] || {}) });
      });
    } else if (role === 'formateur') {
      db.query('SELECT specialite, telephone, date_naissance FROM formateurs WHERE user_id = ?', [userId], (err2, rows) => {
        if (err2) return res.status(500).json(err2);
        res.json({ ...user, ...(rows[0] || {}) });
      });
    } else if (role === 'externe') {
      db.query('SELECT telephone, entreprise, specialite, date_naissance FROM externes WHERE user_id = ?', [userId], (err2, rows) => {
        if (err2) return res.status(500).json(err2);
        res.json({ ...user, ...(rows[0] || {}) });
      });
    } else { res.json(user); }
  });
});

router.put('/profile', verifyToken, (req, res) => {
  const { nom, email, telephone, date_naissance, specialite, cin, niveau, entreprise } = req.body;
  const userId = req.user.id;
  const role = req.user.role;
  if (!nom || !email) return res.status(400).json({ message: 'Nom et email requis' });
  db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId], (err, existing) => {
    if (err) return res.status(500).json(err);
    if (existing.length > 0) return res.status(400).json({ message: 'Email déjà utilisé par un autre compte' });
    db.query('UPDATE users SET nom = ?, email = ? WHERE id = ?', [nom, email, userId], (err2) => {
      if (err2) return res.status(500).json(err2);
      if (role === 'etudiant') {
        db.query('UPDATE etudiants SET telephone = ?, date_naissance = ?, specialite = ?, cin = ?, niveau = ? WHERE user_id = ?',
          [telephone || null, date_naissance || null, specialite || null, cin || null, niveau || null, userId],
          (err3) => { if (err3) return res.status(500).json(err3); res.json({ message: 'Profil mis à jour avec succès' }); }
        );
      } else if (role === 'formateur') {
        db.query('UPDATE formateurs SET specialite = ?, telephone = ?, date_naissance = ? WHERE user_id = ?',
          [specialite || null, telephone || null, date_naissance || null, userId],
          (err3) => { if (err3) return res.status(500).json(err3); res.json({ message: 'Profil mis à jour avec succès' }); }
        );
      } else if (role === 'externe') {
        db.query('UPDATE externes SET telephone = ?, entreprise = ?, specialite = ?, date_naissance = ? WHERE user_id = ?',
          [telephone || null, entreprise || null, specialite || null, date_naissance || null, userId],
          (err3) => { if (err3) return res.status(500).json(err3); res.json({ message: 'Profil mis à jour avec succès' }); }
        );
      } else { res.json({ message: 'Profil mis à jour avec succès' }); }
    });
  });
});

router.put('/change-password', verifyToken, async (req, res) => {
  const { ancien_mdp, nouveau_mdp } = req.body;
  const userId = req.user.id;
  if (!ancien_mdp || !nouveau_mdp) return res.status(400).json({ message: 'Champs requis' });
  if (nouveau_mdp.length < 6) return res.status(400).json({ message: 'Nouveau mot de passe trop court (min 6 caractères)' });
  db.query('SELECT mot_de_passe FROM users WHERE id = ?', [userId], async (err, results) => {
    if (err) return res.status(500).json(err);
    if (!results.length) return res.status(404).json({ message: 'Utilisateur introuvable' });
    const valid = await bcrypt.compare(ancien_mdp, results[0].mot_de_passe);
    if (!valid) return res.status(401).json({ message: 'Ancien mot de passe incorrect' });
    const hashed = await bcrypt.hash(nouveau_mdp, 10);
    db.query('UPDATE users SET mot_de_passe = ? WHERE id = ?', [hashed, userId], (err2) => {
      if (err2) return res.status(500).json(err2);
      res.json({ message: 'Mot de passe modifié avec succès' });
    });
  });
});

// 🔹 Liste des spécialités (publique, utilisée dans le formulaire d'inscription)
router.get('/specialites', (req, res) => {
  const specialites = [
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
  ];
  res.json(specialites);
});

module.exports = router;