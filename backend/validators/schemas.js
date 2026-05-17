const Joi = require('joi');

/* ── Auth ──────────────────────────────────────────────────────────────────── */

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email invalide',
    'any.required': 'Email obligatoire'
  }),
  mot_de_passe: Joi.string().required().messages({
    'any.required': 'Mot de passe obligatoire'
  })
});

const registerSchema = Joi.object({
  nom: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  mot_de_passe: Joi.string().min(8).required().messages({
    'string.min': 'Mot de passe trop court (minimum 8 caractères)'
  }),
  role: Joi.string().valid('candidat', 'externe', 'admin').required(),
  specialite: Joi.when('role', {
    is: Joi.valid('candidat', 'externe'),
    then: Joi.string().min(1).max(100).required().messages({ 'any.required': 'La spécialité est obligatoire' }),
    otherwise: Joi.string().max(100).optional().allow('', null)
  }),
  cin: Joi.when('role', {
    is: 'candidat',
    then: Joi.string().min(4).max(20).required().messages({ 'any.required': 'Le CIN est obligatoire' }),
    otherwise: Joi.string().optional().allow('', null)
  }),
  niveau: Joi.string().max(50).optional().allow('', null),
  telephone: Joi.string().pattern(/^[0-9+\s\-]{6,20}$/).optional().allow('', null).messages({
    'string.pattern.base': 'Numéro de téléphone invalide'
  }),
  entreprise: Joi.string().max(100).optional().allow('', null),
  date_naissance: Joi.date().max('now').optional().allow('', null)
});

const changePasswordSchema = Joi.object({
  ancien_mdp: Joi.string().required(),
  nouveau_mdp: Joi.string().min(8).required().messages({
    'string.min': 'Nouveau mot de passe trop court (minimum 8 caractères)'
  })
});

/* ── Formations ────────────────────────────────────────────────────────────── */

const formationSchema = Joi.object({
  titre: Joi.string().min(3).max(200).required(),
  description: Joi.string().max(3000).optional().allow('', null),
  date_debut: Joi.date().required(),
  date_fin: Joi.date().min(Joi.ref('date_debut')).optional().allow('', null).messages({
    'date.min': 'La date de fin doit être après la date de début'
  }),
  duree: Joi.number().positive().optional().allow('', null),
  specialite: Joi.string().min(1).max(100).required(),
  nb_places: Joi.number().integer().positive().optional().allow('', null),
  formateur_id: Joi.number().integer().positive().required(),
  prix: Joi.number().min(0).optional().allow('', null),
  status: Joi.string().valid('draft', 'pending_approval', 'accepted', 'published', 'archivée').optional(),
  photo_existante: Joi.string().optional().allow('', null)
}).options({ allowUnknown: true }); // multer ajoute des champs supplémentaires

const moduleSchema = Joi.object({
  titre: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(1000).optional().allow('', null),
  duree_heures: Joi.number().positive().optional().allow('', null),
  ordre: Joi.number().integer().min(0).optional().allow(null)
});

/* ── Inscription ───────────────────────────────────────────────────────────── */

const inscriptionCandidatSchema = Joi.object({
  candidat_id: Joi.number().integer().positive().required(),
  formation_id: Joi.number().integer().positive().required()
});

const inscriptionExterneSchema = Joi.object({
  externe_id: Joi.number().integer().positive().required(),
  formation_id: Joi.number().integer().positive().required()
});

/* ── Notation ──────────────────────────────────────────────────────────────── */

const notationCandidatSchema = Joi.object({
  candidat_id: Joi.number().integer().positive().required(),
  formation_id: Joi.number().integer().positive().required(),
  note: Joi.number().integer().min(1).max(5).required(),
  commentaire: Joi.string().max(500).optional().allow('', null)
});

const notationExterneSchema = Joi.object({
  externe_id: Joi.number().integer().positive().required(),
  formation_id: Joi.number().integer().positive().required(),
  note: Joi.number().integer().min(1).max(5).required(),
  commentaire: Joi.string().max(500).optional().allow('', null)
});

/* ── Justificatifs ─────────────────────────────────────────────────────────── */

const justificatifCandidatSchema = Joi.object({
  candidat_id: Joi.number().integer().positive().required(),
  seance_id: Joi.number().integer().positive().required(),
  motif: Joi.string().min(5).max(500).required().messages({
    'string.min': 'Le motif doit contenir au moins 5 caractères'
  })
});

const justificatifExterneSchema = Joi.object({
  externe_id: Joi.number().integer().positive().required(),
  seance_id: Joi.number().integer().positive().required(),
  motif: Joi.string().min(5).max(500).required().messages({
    'string.min': 'Le motif doit contenir au moins 5 caractères'
  })
});

/* ── Séances ───────────────────────────────────────────────────────────────── */

const seanceSchema = Joi.object({
  formation_id: Joi.number().integer().positive().required(),
  date_seance: Joi.date().required(),
  heure_debut: Joi.string().pattern(/^([0-1]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/).required().messages({
    'string.pattern.base': 'Format heure_debut invalide (HH:MM)'
  }),
  heure_fin: Joi.string().pattern(/^([0-1]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/).required().messages({
    'string.pattern.base': 'Format heure_fin invalide (HH:MM)'
  }),
  salle: Joi.string().max(100).optional().allow('', null),
  module_id: Joi.number().integer().positive().optional().allow(null)
});

/* ── Admin : formateurs ────────────────────────────────────────────────────── */

const createFormateurSchema = Joi.object({
  nom: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  mot_de_passe: Joi.string().min(8).required().messages({
    'string.min': 'Mot de passe trop court (minimum 8 caractères)'
  }),
  specialite: Joi.string().max(100).optional().allow('', null)
});

const updateFormateurSchema = Joi.object({
  nom: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  mot_de_passe: Joi.string().min(8).optional().allow('', null),
  specialite: Joi.string().max(100).optional().allow('', null)
});

/* ── Messages ──────────────────────────────────────────────────────────────── */

const messageSchema = Joi.object({
  expediteur_id: Joi.number().integer().positive().required(),
  destinataire_id: Joi.number().integer().positive().required(),
  contenu: Joi.string().min(1).max(2000).required()
});

module.exports = {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  formationSchema,
  moduleSchema,
  inscriptionCandidatSchema,
  inscriptionExterneSchema,
  notationCandidatSchema,
  notationExterneSchema,
  justificatifCandidatSchema,
  justificatifExterneSchema,
  seanceSchema,
  createFormateurSchema,
  updateFormateurSchema,
  messageSchema
};
