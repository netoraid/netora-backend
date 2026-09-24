const express = require('express');
const router = express.Router();
const { db } = require('../database/init');
const { requireAuth } = require('../middleware/auth');

// GET /api/video (Akses Baca Video)
router.get('/', (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM video ORDER BY id ASC').all();
    return res.json({ success: true, video: list });
  } catch (err) {
    console.error('Fetch Video Error:', err);
    return res.status(500).json({ error: 'Gagal memuat video.' });
  }
});

module.exports = router;
