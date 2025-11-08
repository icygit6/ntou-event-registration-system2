const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',       // default in XAMPP
  password: '',       // leave empty if no MySQL password
  database: 'ntou_event_system'
});

db.connect(err => {
  if (err) throw err;
  console.log('✅ MySQL Connected!');
});

module.exports = db;
