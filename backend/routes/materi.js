const express = require('express');
const router = express.Router();
const { db } = require('../database/init');
const { requireAuth } = require('../middleware/auth');

// GET /api/materi (Akses Baca Materi)
router.get('/', (req, res) => {
  try {
    const list = db.prepare('SELECT id, judul, kategori, SUBSTR(isi, 1, 100) as preview, created_at FROM materi ORDER BY id ASC').all();
    return res.json({ success: true, materi: list });
  } catch (err) {
    console.error('Fetch Materi Error:', err);
    return res.status(500).json({ error: 'Gagal memuat materi.' });
  }
});

// GET /api/materi/:id (Detail Materi)
router.get('/:id', (req, res) => {
  try {
    const materi = db.prepare('SELECT * FROM materi WHERE id = ?').get(req.params.id);
    if (!materi) {
      return res.status(404).json({ error: 'Materi tidak ditemukan.' });
    }
    return res.json({ success: true, materi });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal memuat detail materi.' });
  }
});

module.exports = router;
