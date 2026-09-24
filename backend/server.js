const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

// Inisialisasi Database dan Seed Data otomatis
const { initDb } = require('./database/init');
initDb();

// Direktori Frontend & Uploads
const frontendDir = path.join(__dirname, '..', 'frontend');
const uploadsDir = path.join(frontendDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const frontendAssetsDir = path.join(frontendDir, 'assets');
if (!fs.existsSync(frontendAssetsDir)) {
  fs.mkdirSync(frontendAssetsDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware Parsing Body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware Session
app.use(
  session({
    secret: 'netora_cyberpunk_secret_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 Jam
      httpOnly: true,
      sameSite: 'lax'
    }
  })
);

// Serve Static Files dari folder frontend
app.use(express.static(frontendDir));
app.use('/assets', express.static(frontendAssetsDir));

// Registrasi Route API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/materi', require('./routes/materi'));
app.use('/api/video', require('./routes/video'));
app.use('/api/quiz', require('./routes/quiz'));
app.use('/api/pengumuman', require('./routes/pengumuman'));
app.use('/api/profil', require('./routes/profil'));

// Route Utama Langsung Membuka Landing Page (Beranda)
app.get('/', (req, res) => {
  res.redirect('/beranda.html');
});

// Jalankan Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Server NETORA v2 Berjalan di http://localhost:${PORT}`);
  console.log(`====================================================`);
});
