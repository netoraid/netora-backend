let Database;
let isNodeSqlite = false;

try {
  // Gunakan modul bawaan node:sqlite (tersedia di Node.js 22.5+ / Node 24)
  // Tanpa perlu compile C++ / Visual Studio
  const { DatabaseSync } = require('node:sqlite');
  Database = DatabaseSync;
  isNodeSqlite = true;
} catch (e) {
  Database = require('better-sqlite3');
}

const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'netora.db');
const db = new Database(dbPath);

if (isNodeSqlite) {
  // Wrapper kompatibilitas dengan better-sqlite3
  db.pragma = function (pragmaStr) {
    return db.exec(`PRAGMA ${pragmaStr};`);
  };

  const originalPrepare = db.prepare.bind(db);
  db.prepare = function (sql) {
    const stmt = originalPrepare(sql);
    const originalRun = stmt.run.bind(stmt);
    stmt.run = function (...args) {
      const res = originalRun(...args);
      return {
        changes: res.changes,
        lastInsertRowid: Number(res.lastInsertRowid)
      };
    };
    return stmt;
  };
}

// Aktifkan Foreign Keys
db.pragma('foreign_keys = ON');

function initDb() {
  // 1. Tabel Users
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      foto TEXT DEFAULT 'uploads/default.png',
      bio TEXT DEFAULT 'Siswa TKJ Antusias Belajar Jaringan',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Tabel Materi
  db.exec(`
    CREATE TABLE IF NOT EXISTS materi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      judul TEXT NOT NULL,
      kategori TEXT NOT NULL,
      isi TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Tabel Video
  db.exec(`
    CREATE TABLE IF NOT EXISTS video (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      judul TEXT NOT NULL,
      deskripsi TEXT NOT NULL,
      url_youtube TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 4. Tabel Quiz
  db.exec(`
    CREATE TABLE IF NOT EXISTS quiz (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pertanyaan TEXT NOT NULL,
      pilihan_a TEXT NOT NULL,
      pilihan_b TEXT NOT NULL,
      pilihan_c TEXT NOT NULL,
      pilihan_d TEXT NOT NULL,
      jawaban_benar TEXT NOT NULL,
      kategori TEXT NOT NULL
    )
  `);

  // 5. Tabel Nilai Quiz
  db.exec(`
    CREATE TABLE IF NOT EXISTS nilai_quiz (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      skor INTEGER NOT NULL,
      tanggal DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 6. Tabel Pengumuman
  db.exec(`
    CREATE TABLE IF NOT EXISTS pengumuman (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      judul TEXT NOT NULL,
      isi TEXT NOT NULL,
      kategori TEXT NOT NULL,
      penting INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  seedData();
}

function seedData() {
  // Seed Materi
  const countMateri = db.prepare('SELECT COUNT(*) as count FROM materi').get();
  if (countMateri.count === 0) {
    const insertMateri = db.prepare(`
      INSERT INTO materi (judul, kategori, isi) VALUES (?, ?, ?)
    `);

    insertMateri.run(
      'Dasar Jaringan Komputer & Model OSI',
      'Cisco',
      `Jaringan komputer adalah sistem yang menghubungkan beberapa komputer untuk berbagi data dan sumber daya.\n\n7 Lapisan OSI Model:\n1. Physical: Transmisi bit melalui media fisik.\n2. Data Link: Pengalamatan MAC & pembentukan frame.\n3. Network: Pengalamatan IP & Routing data.\n4. Transport: Pengiriman end-to-end (TCP/UDP).\n5. Session: Manajemen sesi komunikasi.\n6. Presentation: Enkripsi & format data.\n7. Application: Antarmuka aplikasi pengguna.`
    );

    insertMateri.run(
      'Pengenalan RouterOS & Mikrotik Basic',
      'Mikrotik',
      `MikroTik RouterOS adalah sistem operasi berbasis Linux yang diperuntukkan sebagai router jaringan.\n\nLangkah Dasar Konfigurasi MikroTik:\n1. Hubungkan port Ether1 ke sumber Internet (DHCP Client).\n2. Konfigurasi IP Address lokal pada Ether2.\n3. Buat NAT Masquerade agar client lokal bisa mengakses internet.\n4. Konfigurasi DHCP Server untuk membagikan IP otomatis ke komputer siswa.`
    );

    insertMateri.run(
      'Administrasi Linux Server & SSH',
      'Server & Linux',
      `Linux Server merupakan fondasi utama layanan infrastruktur IT modern seperti Web Server, DNS Server, dan Database.\n\nPerintah Dasar Linux:\n- sudo apt update && sudo apt upgrade\n- systemctl status nginx\n- ssh user@ip_server -p 22\n\nSelalu pastikan konfigurasi firewall (ufw) telah mengizinkan port SSH sebelum menutup akses root.`
    );

    insertMateri.run(
      'Konfigurasi VLAN pada Switch Cisco',
      'Cisco',
      `Virtual Local Area Network (VLAN) memungkinkan pembagian broadcast domain pada switch yang sama secara logis.\n\nCommand Dasar Cisco VLAN:\nSwitch# configure terminal\nSwitch(config)# vlan 10\nSwitch(config-vlan)# name GURU\nSwitch(config-vlan)# exit\nSwitch(config)# interface fastEthernet 0/1\nSwitch(config-if)# switchport mode access\nSwitch(config-if)# switchport access vlan 10`
    );

    insertMateri.run(
      'Manajemen Bandwidth Queue Tree Mikrotik',
      'Mikrotik',
      `Queue Tree digunakan untuk mengatur alokasi pemakaian bandwidth secara lebih fleksibel mendasarkan pembatasan pada Packet Mark dari IP Firewall Mangle.\n\nKeunggulan Queue Tree dibanding Simple Queue:\n- Mendukung pengelompokan hierarki parent-child.\n- Alokasi CIR (Committed Information Rate) dan MIR (Maximum Information Rate) yang presisi.\n- Cocok untuk jaringan skala menengah hingga besar.`
    );
  }

  // Seed Video
  const countVideo = db.prepare('SELECT COUNT(*) as count FROM video').get();
  if (countVideo.count === 0) {
    const insertVideo = db.prepare(`
      INSERT INTO video (judul, deskripsi, url_youtube) VALUES (?, ?, ?)
    `);

    insertVideo.run(
      'Tutorial Dasar Konfigurasi Mikrotik RB750r2 untuk Pemula',
      'Panduan langkah demi langkah menyetting Mikrotik dari kondisi reset hingga terkoneksi internet.',
      'https://www.youtube.com/embed/dQw4w9WgXcQ'
    );

    insertVideo.run(
      'Cara Setup Bandwidth Management & Hotspot Server Mikrotik',
      'Pelajari cara mengaktifkan fitur Hotspot Mikrotik lengkap dengan halaman login dan voucher.',
      'https://www.youtube.com/embed/dQw4w9WgXcQ'
    );

    insertVideo.run(
      'Konfigurasi Firewall Mangle & Load Balancing PCC Mikrotik',
      'Tutorial menggabungkan 2 Line ISP (Load Balancing) menggunakan metode PCC di RouterBOARD.',
      'https://www.youtube.com/embed/dQw4w9WgXcQ'
    );
  }

  // Seed Quiz
  const countQuiz = db.prepare('SELECT COUNT(*) as count FROM quiz').get();
  if (countQuiz.count === 0) {
    const insertQuiz = db.prepare(`
      INSERT INTO quiz (pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, jawaban_benar, kategori)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertQuiz.run(
      'Pada OSI Model, lapisan manakah yang bertanggung jawab untuk IP Addressing dan Routing?',
      'Layer 2 (Data Link)',
      'Layer 3 (Network)',
      'Layer 4 (Transport)',
      'Layer 7 (Application)',
      'B',
      'Networking'
    );

    insertQuiz.run(
      'Berapa jumlah host maksimum yang dapat digunakan pada subnet mask /24?',
      '256',
      '255',
      '254',
      '252',
      'C',
      'Networking'
    );

    insertQuiz.run(
      'Aplikasi bawaan MikroTik yang digunakan untuk meremote RouterOS secara GUI adalah...',
      'PuTTY',
      'Winbox',
      'FileZilla',
      'Cisco Packet Tracer',
      'B',
      'Mikrotik'
    );

    insertQuiz.run(
      'Port default yang digunakan untuk protokol komunikasi secure SSH adalah...',
      'Port 80',
      'Port 21',
      'Port 22',
      'Port 443',
      'C',
      'Server & Linux'
    );

    insertQuiz.run(
      'Fitur MikroTik yang berfungsi merubah IP Private menjadi IP Public saat keluar ke internet adalah...',
      'DHCP Server',
      'Bridge Interface',
      'NAT Masquerade',
      'DNS Static',
      'C',
      'Mikrotik'
    );

    insertQuiz.run(
      'Perintah Linux untuk melihat alamat IP yang terpasang pada interface jaringan adalah...',
      'ip a / ifconfig',
      'ping 127.0.0.1',
      'netstat -tuln',
      'traceroute',
      'A',
      'Server & Linux'
    );

    insertQuiz.run(
      'Protokol mana yang beroperasi secara Connectionless di Layer Transport?',
      'TCP',
      'UDP',
      'FTP',
      'HTTP',
      'B',
      'Networking'
    );

    insertQuiz.run(
      'Kabel UTP dengan urutan standar T568B digunakan untuk menghubungkan dua perangkat berbeda tipe dinamakan kabel...',
      'Crossover',
      'Straight-Through',
      'Rollover',
      'Coaxial',
      'B',
      'Networking'
    );

    insertQuiz.run(
      'Di Cisco IOS, perintah untuk berpindah dari User EXEC Mode ke Privileged EXEC Mode adalah...',
      'configure terminal',
      'enable',
      'show ip route',
      'write memory',
      'B',
      'Cisco'
    );

    insertQuiz.run(
      'Subnet mask default untuk Alamat IP Kelas C adalah...',
      '255.0.0.0',
      '255.255.0.0',
      '255.255.255.0',
      '255.255.255.255',
      'C',
      'Networking'
    );
  }

  // Seed Pengumuman
  const countPengumuman = db.prepare('SELECT COUNT(*) as count FROM pengumuman').get();
  if (countPengumuman.count === 0) {
    const insertPengumuman = db.prepare(`
      INSERT INTO pengumuman (judul, isi, kategori, penting) VALUES (?, ?, ?, ?)
    `);

    insertPengumuman.run(
      'Update Kurikulum Pembelajaran TKJ 2026',
      'Seluruh modul materi Cisco dan Mikrotik telah diperbarui sesuai standar sertifikasi MTCNA & CCNA terbaru. Selamat belajar!',
      'Kurikulum',
      1
    );

    insertPengumuman.run(
      'Pelaksanaan Quiz Kompetensi Mingguan',
      'Kuis interaktif mingguan kini tersedia. Kumpulkan skor di atas 70 untuk mendapatkan status LULUS pada riwayat profilmu.',
      'Kuis',
      0
    );

    insertPengumuman.run(
      'Tips Penggunaan Kalkulator Subnetting IP',
      'Fitur Kalkulator IP kini mendukung perhitungan lengkap mulai dari Subnet Mask, Host Range, hingga penentuan IP Public/Private.',
      'Fitur',
      0
    );
  }
}

module.exports = { db, initDb };
