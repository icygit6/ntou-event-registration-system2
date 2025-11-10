const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',           // default XAMPP user
  password: '',           // default XAMPP password is empty
  database: 'event_registration'  // your database name
});

db.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
    return;
  }
  console.log('✅ Connected to MySQL database');
});

module.exports = db;