const express = require('express');
const router = express.Router();
const { db } = require('../database/init');
const { requireAuth } = require('../middleware/auth');

// GET /api/quiz (Ambil 10 soal acak)
router.get('/', (req, res) => {
  try {
    const list = db.prepare(`
      SELECT id, pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, kategori
      FROM quiz
      ORDER BY RANDOM()
      LIMIT 10
    `).all();
    return res.json({ success: true, quiz: list });
  } catch (err) {
    console.error('Fetch Quiz Error:', err);
    return res.status(500).json({ error: 'Gagal memuat kuis.' });
  }
});

// POST /api/quiz/submit (Kirim jawaban, simpan jika ada sesi login)
router.post('/submit', (req, res) => {
  const { jawaban } = req.body; // format: { 1: 'A', 2: 'C', ... }

  if (!jawaban || typeof jawaban !== 'object') {
    return res.status(400).json({ error: 'Format jawaban tidak valid.' });
  }

  try {
    const ids = Object.keys(jawaban).map(id => parseInt(id)).filter(id => !isNaN(id));
    if (ids.length === 0) {
      return res.status(400).json({ error: 'Tidak ada jawaban yang dikirim.' });
    }

    const placeholders = ids.map(() => '?').join(',');
    const dbQuestions = db.prepare(`SELECT id, jawaban_benar FROM quiz WHERE id IN (${placeholders})`).all(...ids);

    let benar = 0;
    const total = dbQuestions.length;

    dbQuestions.forEach(q => {
      const userAns = (jawaban[q.id] || '').toUpperCase();
      if (userAns === q.jawaban_benar.toUpperCase()) {
        benar++;
      }
    });

    const skor = total > 0 ? Math.round((benar / total) * 100) : 0;

    // Simpan skor jika user login
    let saved = false;
    if (req.session && req.session.userId) {
      db.prepare(`
        INSERT INTO nilai_quiz (user_id, skor) VALUES (?, ?)
      `).run(req.session.userId, skor);
      saved = true;
    }

    return res.json({
      success: true,
      skor,
      benar,
      total,
      lulus: skor >= 70,
      saved
    });
  } catch (err) {
    console.error('Submit Quiz Error:', err);
    return res.status(500).json({ error: 'Gagal memproses kuis.' });
  }
});

// GET /api/quiz/riwayat
router.get('/riwayat', requireAuth, (req, res) => {
  try {
    const list = db.prepare(`
      SELECT id, skor, tanggal FROM nilai_quiz
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT 10
    `).all(req.session.userId);
    return res.json({ success: true, riwayat: list });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal memuat riwayat kuis.' });
  }
});

module.exports = router;
