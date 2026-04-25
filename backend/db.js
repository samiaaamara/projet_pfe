const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gestion_formations'
});

db.connect((err) => {
  if (err) { console.error('Erreur MySQL :', err); }
  else { console.log('Connexion MySQL réussie'); }
});

module.exports = db;
