const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 🟢 Register User
app.post('/register', (req, res) => {
  const { nickname, email_or_phone, password } = req.body;
  if (!nickname || !email_or_phone || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }

  const sql = 'INSERT INTO users (nickname, email_or_phone, password) VALUES (?, ?, ?)';
  db.query(sql, [nickname, email_or_phone, password], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'User registered successfully!' });
  });
});

// 🟣 Login User
app.post('/login', (req, res) => {
  const { email_or_phone, password } = req.body;
  const sql = 'SELECT * FROM users WHERE email_or_phone = ? AND password = ?';
  db.query(sql, [email_or_phone, password], (err, results) => {
    if (err) throw err;
    if (results.length > 0) {
      res.json({ message: 'Login successful!' });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });
});

// 🟢 Start Server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
