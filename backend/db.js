const mysql = require('mysql2');
require('dotenv').config();
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_formations'
});

db.connect((err) => {
  if (err) {
    console.error('Erreur MySQL :', err);
  } else {
    console.log('Connexion MySQL réussie');
  }
});

module.exports = db;
