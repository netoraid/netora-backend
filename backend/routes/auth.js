const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../database/init');

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { nama, email, password } = req.body;

  if (!nama || !email || !password) {
    return res.status(400).json({ error: 'Semua kolom wajib diisi.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password minimal 6 karakter.' });
  }

  try {
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existingUser) {
      return res.status(400).json({ error: 'Email sudah terdaftar. Silakan login.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO users (nama, email, password) VALUES (?, ?, ?)
    `).run(nama.trim(), email.toLowerCase().trim(), hashedPassword);

    req.session.userId = result.lastInsertRowid;
    return res.json({ success: true, message: 'Pendaftaran berhasil!' });
  } catch (err) {
    console.error('Register Error:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi.' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user) {
      return res.status(400).json({ error: 'Email atau password salah.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Email atau password salah.' });
    }

    req.session.userId = user.id;
    return res.json({
      success: true,
      message: 'Login berhasil!',
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        foto: user.foto
      }
    });
  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Gagal logout.' });
    }
    res.clearCookie('connect.sid');
    return res.json({ success: true, message: 'Berhasil logout.' });
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Belum terautentikasi' });
  }

  try {
    const user = db.prepare('SELECT id, nama, email, foto, bio, created_at FROM users WHERE id = ?').get(req.session.userId);
    if (!user) {
      req.session.destroy();
      return res.status(401).json({ error: 'User tidak ditemukan' });
    }
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

module.exports = router;
