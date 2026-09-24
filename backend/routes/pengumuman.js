const express = require('express');
const router = express.Router();
const { db } = require('../database/init');
const { requireAuth } = require('../middleware/auth');

// GET /api/pengumuman (Akses Baca Pengumuman)
router.get('/', (req, res) => {
  try {
    const list = db.prepare(`
      SELECT * FROM pengumuman
      ORDER BY penting DESC, created_at DESC
    `).all();
    return res.json({ success: true, pengumuman: list });
  } catch (err) {
    console.error('Fetch Pengumuman Error:', err);
    return res.status(500).json({ error: 'Gagal memuat pengumuman.' });
  }
});

// GET /api/pengumuman/:id (Detail Pengumuman)
router.get('/:id', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM pengumuman WHERE id = ?').get(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Pengumuman tidak ditemukan.' });
    }
    return res.json({ success: true, pengumuman: item });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal memuat pengumuman.' });
  }
});

module.exports = router;
