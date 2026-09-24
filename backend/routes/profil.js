const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { db } = require('../database/init');
const { requireAuth } = require('../middleware/auth');

// Setup Storage Multer untuk Upload Foto Profil
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', '..', 'frontend', 'uploads'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'avatar-' + req.session.userId + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) {
      return cb(null, true);
    }
    cb(new Error('Hanya file gambar (jpg, png, webp, gif) yang diperbolehkan!'));
  }
});

// GET /api/profil
router.get('/', requireAuth, (req, res) => {
  try {
    const user = db.prepare('SELECT id, nama, email, foto, bio, created_at FROM users WHERE id = ?').get(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

    const riwayat = db.prepare(`
      SELECT id, skor, tanggal FROM nilai_quiz
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT 5
    `).all(req.session.userId);

    return res.json({ success: true, user, riwayat });
  } catch (err) {
    console.error('Fetch Profil Error:', err);
    return res.status(500).json({ error: 'Gagal memuat data profil.' });
  }
});

// PUT /api/profil/update (Ubah nama & bio)
router.put('/update', requireAuth, (req, res) => {
  const { nama, bio } = req.body;

  if (!nama || !nama.trim()) {
    return res.status(400).json({ error: 'Nama tidak boleh kosong.' });
  }

  try {
    db.prepare(`
      UPDATE users SET nama = ?, bio = ? WHERE id = ?
    `).run(nama.trim(), (bio || '').trim(), req.session.userId);

    return res.json({ success: true, message: 'Profil berhasil diperbarui!' });
  } catch (err) {
    console.error('Update Profil Error:', err);
    return res.status(500).json({ error: 'Gagal memperbarui profil.' });
  }
});

// PUT /api/profil/ganti-password
router.put('/ganti-password', requireAuth, (req, res) => {
  const { password_lama, password_baru } = req.body;

  if (!password_lama || !password_baru) {
    return res.status(400).json({ error: 'Password lama dan password baru wajib diisi.' });
  }

  if (password_baru.length < 6) {
    return res.status(400).json({ error: 'Password baru minimal 6 karakter.' });
  }

  try {
    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

    const isMatch = bcrypt.compareSync(password_lama, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Password lama Anda salah.' });
    }

    const newHashed = bcrypt.hashSync(password_baru, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newHashed, req.session.userId);

    return res.json({ success: true, message: 'Password berhasil diubah!' });
  } catch (err) {
    console.error('Ganti Password Error:', err);
    return res.status(500).json({ error: 'Gagal menginstal password baru.' });
  }
});

// POST /api/profil/upload-foto
router.post('/upload-foto', requireAuth, (req, res) => {
  upload.single('foto')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Ukuran file terlalu besar: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Silakan pilih file foto profil.' });
    }

    const photoPath = 'uploads/' + req.file.filename;

    try {
      db.prepare('UPDATE users SET foto = ? WHERE id = ?').run(photoPath, req.session.userId);
      return res.json({
        success: true,
        message: 'Foto profil berhasil diperbarui!',
        foto: photoPath
      });
    } catch (dbErr) {
      console.error('Save Foto Error:', dbErr);
      return res.status(500).json({ error: 'Gagal menyimpan foto profil ke database.' });
    }
  });
});

module.exports = router;
