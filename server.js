const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const PDFDocument = require('pdfkit');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json()); 

// ================= INISIALISASI DATABASE =================
const db = new sqlite3.Database('./sipas.db', (err) => {
  if (err) {
    console.error('Gagal membuka database:', err.message);
  } else {
    console.log('Berhasil terhubung ke database SQLite SIPAS.');
    
    db.serialize(() => {

      // Tabel Notifications
      db.run(`CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        pesan TEXT NOT NULL,
        tipe TEXT DEFAULT 'info',
        dibaca INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      
      // Tabel Users
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        nama TEXT NOT NULL, 
        username TEXT UNIQUE NOT NULL, 
        password TEXT NOT NULL, 
        role TEXT DEFAULT 'guru',
        status_akun TEXT DEFAULT 'aktif',
        foto_profil TEXT
      )`);

      // Tabel Laboratorium (Ruang)
      db.run(`CREATE TABLE IF NOT EXISTS laboratories (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        nama_lab TEXT NOT NULL, 
        lokasi TEXT,
        penanggung_jawab TEXT,
        kapasitas INTEGER NOT NULL, 
        status TEXT DEFAULT 'aktif'
      )`);

      // Tabel Fasilitas / Barang Sekolah
      db.run(`CREATE TABLE IF NOT EXISTS facilities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nama_fasilitas TEXT NOT NULL,
        lokasi TEXT,
        kondisi TEXT,
        penanggung_jawab TEXT,
        jumlah_tersedia INTEGER NOT NULL
      )`);

      // Tabel Bookings (Peminjaman Ruang/Lab & Fasilitas)
      db.run(`CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        user_id INTEGER, 
        lab_id INTEGER, 
        facility_id INTEGER,
        jumlah_pinjam INTEGER,
        lokasi_penggunaan TEXT,
        tanggal TEXT, 
        jam_mulai TEXT, 
        jam_selesai TEXT, 
        keperluan TEXT, 
        status_approval TEXT DEFAULT 'menunggu',
        alasan_penolakan TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id), 
        FOREIGN KEY (lab_id) REFERENCES laboratories(id),
        FOREIGN KEY (facility_id) REFERENCES facilities(id)
      )`);

      // --- Data Dummy ---
      db.run("INSERT OR IGNORE INTO users (nama, username, password, role, status_akun) VALUES ('Pak Guru', 'guru', '123', 'guru', 'aktif')");
      db.run("INSERT OR IGNORE INTO users (nama, username, password, role, status_akun) VALUES ('Kepala Lab', 'admin', '123', 'admin', 'aktif')");

      db.get("SELECT COUNT(*) AS jumlah FROM laboratories", (err, row) => {
        if (row && row.jumlah === 0) {
          const stmt = db.prepare("INSERT INTO laboratories (nama_lab, lokasi, penanggung_jawab, kapasitas) VALUES (?, ?, ?, ?)");
          stmt.run("Lab Komputer", "Lantai 1", "Pak Andi", 30);
          stmt.run("Lab Bahasa", "Lantai 2", "Bu Siska", 25);
          stmt.run("Lab IPA", "Lantai 1", "Pak Surya", 40);
          stmt.finalize();
        }
      });

      db.get("SELECT COUNT(*) AS jumlah FROM facilities", (err, row) => {
        if (row && row.jumlah === 0) {
          const stmt = db.prepare("INSERT INTO facilities (nama_fasilitas, lokasi, kondisi, penanggung_jawab, jumlah_tersedia) VALUES (?, ?, ?, ?, ?)");
          stmt.run("Proyektor Epson", "Lemari Ruang Guru", "Baik", "Pak Budi", 5);
          stmt.run("Kamera DSLR Canon", "Gudang Multimedia", "Baik", "Bu Ratna", 3);
          stmt.run("Laptop Portable Lenovo", "Gudang IT", "Rusak Ringan", "Pak Anwar", 10);
          stmt.finalize();
        }
      });
    });
  }
});

// ================= AUTENTIKASI & USER =================

app.post('/api/register', (req, res) => {
  const { nama, username, password, role } = req.body;
  const userRole = role || 'guru';
  const statusAkun = userRole === 'admin' ? 'pending' : 'aktif';

  const sql = `INSERT INTO users (nama, username, password, role, status_akun) VALUES (?, ?, ?, ?, ?)`;
  db.run(sql, [nama, username, password, userRole, statusAkun], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) return res.status(400).json({ message: "Username tersebut sudah digunakan!" });
      return res.status(500).json({ error: err.message });
    }
    if (userRole === 'admin') {
      res.json({ message: "Pendaftaran Admin berhasil! Menunggu persetujuan Admin Utama." });
    } else {
      res.json({ message: "Akun berhasil didaftarkan! Silakan login." });
    }
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get("SELECT id, nama, username, role, status_akun, foto_profil FROM users WHERE username = ? AND password = ?", [username, password], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ message: "Username atau password salah!" });
    if (user.status_akun === 'pending') return res.status(403).json({ message: "Akun Admin Anda masih menunggu persetujuan dari Admin Utama." });
    res.json({ message: "Login berhasil!", user: user });
  });
});

app.put('/api/users/:id', (req, res) => {
  const { nama, username, foto_profil } = req.body;
  const userId = req.params.id;

  const sql = "UPDATE users SET nama = ?, username = ?, foto_profil = ? WHERE id = ?";
  db.run(sql, [nama, username, foto_profil, userId], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) return res.status(400).json({ message: "Username sudah dipakai orang lain!" });
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Profil berhasil diperbarui!" });
  });
});

app.put('/api/users/:id/change-password', (req, res) => {
  const { password_lama, password_baru } = req.body;
  const userId = req.params.id;

  db.get("SELECT password FROM users WHERE id = ?", [userId], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ message: "User tidak ditemukan!" });
    
    if (user.password !== password_lama) {
      return res.status(400).json({ message: "Password lama yang Anda masukkan salah!" });
    }

    db.run("UPDATE users SET password = ? WHERE id = ?", [password_baru, userId], function(errUpdate) {
      if (errUpdate) return res.status(500).json({ error: errUpdate.message });
      res.json({ message: "Password berhasil diperbarui dengan aman!" });
    });
  });
});

app.put('/api/users/:id/change-photo', (req, res) => {
  const { foto_profil } = req.body;
  const userId = req.params.id;

  db.run("UPDATE users SET foto_profil = ? WHERE id = ?", [foto_profil, userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Foto profil berhasil diperbarui!" });
  });
});

// ================= NOTIFIKASI =================

app.get('/api/notifications/:userId', (req, res) => {
  const userId = req.params.userId;
  db.all("SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 10", [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.put('/api/notifications/read/:userId', (req, res) => {
  const userId = req.params.userId;
  db.run("UPDATE notifications SET dibaca = 1 WHERE user_id = ?", [userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Notifikasi ditandai dibaca" });
  });
});

// ================= LABORATORIUM & FASILITAS (PUBLIC) =================

app.get('/api/labs', (req, res) => {
  db.all("SELECT * FROM laboratories", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/facilities', (req, res) => {
  db.all("SELECT * FROM facilities", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/labs/:id/schedule', (req, res) => {
  const labId = req.params.id;
  const tanggal = req.query.tanggal; 
  const query = `
    SELECT b.jam_mulai, b.jam_selesai, b.keperluan, u.nama as nama_peminjam, b.status_approval 
    FROM bookings b JOIN users u ON b.user_id = u.id
    WHERE b.lab_id = ? AND b.tanggal = ? AND b.status_approval = 'disetujui'
  `;
  db.all(query, [labId, tanggal], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/facilities/:id/schedule', (req, res) => {
  const facilityId = req.params.id;
  const tanggal = req.query.tanggal;
  const query = `
    SELECT b.jam_mulai, b.jam_selesai, b.jumlah_pinjam, b.lokasi_penggunaan, u.nama as nama_peminjam, b.status_approval 
    FROM bookings b JOIN users u ON b.user_id = u.id
    WHERE b.facility_id = ? AND b.tanggal = ? AND b.status_approval = 'disetujui'
  `;
  db.all(query, [facilityId, tanggal], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ================= BOOKINGS (PEMINJAMAN DENGAN LIMIT) =================

app.post('/api/bookings', (req, res) => {
  const { user_id, lab_id, facility_id, jumlah_pinjam, lokasi_penggunaan, tanggal, jam_mulai, jam_selesai, keperluan } = req.body;
  
  let checkLimitQuery;
  let limitParams;

  if (lab_id) {
    checkLimitQuery = `
      SELECT COUNT(id) as total_booking 
      FROM bookings 
      WHERE user_id = ? 
        AND lab_id = ? 
        AND strftime('%Y-%W', tanggal) = strftime('%Y-%W', ?) 
        AND status_approval != 'ditolak'
    `;
    limitParams = [user_id, lab_id, tanggal];
  } else {
    checkLimitQuery = `
      SELECT COUNT(id) as total_booking 
      FROM bookings 
      WHERE user_id = ? 
        AND facility_id = ? 
        AND strftime('%Y-%W', tanggal) = strftime('%Y-%W', ?) 
        AND status_approval != 'ditolak'
    `;
    limitParams = [user_id, facility_id, tanggal];
  }

  db.get(checkLimitQuery, limitParams, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    if (row && row.total_booking >= 7) {
      return res.status(400).json({
        message: 'Limit Kuota Tercapai: Anda sudah memiliki 7 pengajuan aktif untuk fasilitas/ruangan ini di minggu yang sama.'
      });
    }

    if (lab_id) {
      const checkOverlapSql = `
        SELECT * FROM bookings WHERE lab_id = ? AND tanggal = ? AND status_approval = 'disetujui'
        AND ((jam_mulai <= ? AND jam_selesai >= ?) OR (jam_mulai <= ? AND jam_selesai >= ?) OR (jam_mulai >= ? AND jam_selesai <= ?))
      `;
      db.all(checkOverlapSql, [lab_id, tanggal, jam_mulai, jam_mulai, jam_selesai, jam_selesai, jam_mulai, jam_selesai], (errOverlap, rows) => {
        if (errOverlap) return res.status(500).json({ error: errOverlap.message });
        if (rows.length > 0) return res.status(400).json({ message: "Maaf, jadwal gagal disimpan! Lab sudah dibooking dan disetujui pada jam tersebut." });
        executeInsert();
      });
    } else {
      executeInsert();
    }
  });

  function executeInsert() {
    const insertSql = `INSERT INTO bookings (user_id, lab_id, facility_id, jumlah_pinjam, lokasi_penggunaan, tanggal, jam_mulai, jam_selesai, keperluan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(insertSql, [user_id, lab_id || null, facility_id || null, jumlah_pinjam || null, lokasi_penggunaan || null, tanggal, jam_mulai, jam_selesai, keperluan], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      const newBookingId = this.lastID;
      db.all("SELECT id FROM users WHERE role = 'admin'", [], (errAdm, admins) => {
        if (admins) {
          admins.forEach(adm => {
            db.run("INSERT INTO notifications (user_id, pesan, tipe) VALUES (?, ?, ?)", [adm.id, `Ada pengajuan peminjaman baru yang perlu ditinjau.`, 'info']);
          });
        }
      });

      res.json({ message: "Peminjaman berhasil diajukan!", booking_id: newBookingId });
    });
  }
});

app.get('/api/bookings', (req, res) => {
  const userId = req.query.user_id; 
  let sql = `
    SELECT b.id, 
           COALESCE(l.nama_lab, '-') as nama_lab, 
           COALESCE(l.penanggung_jawab, '-') as pic_lab,
           COALESCE(f.nama_fasilitas, '-') as nama_fasilitas, 
           COALESCE(f.penanggung_jawab, '-') as pic_fasilitas,
           b.jumlah_pinjam, b.lokasi_penggunaan, b.tanggal, b.jam_mulai, b.jam_selesai, b.keperluan, b.status_approval, b.alasan_penolakan, u.nama as nama_peminjam
    FROM bookings b
    LEFT JOIN laboratories l ON b.lab_id = l.id
    LEFT JOIN facilities f ON b.facility_id = f.id
    JOIN users u ON b.user_id = u.id
  `;
  const params = [];
  if (userId) { sql += ` WHERE b.user_id = ?`; params.push(userId); }
  sql += ` ORDER BY b.id DESC`;
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.put('/api/bookings/:id', (req, res) => {
  const { status_approval, alasan_penolakan } = req.body;
  const bookingId = req.params.id;

  const sql = `UPDATE bookings SET status_approval = ?, alasan_penolakan = ? WHERE id = ?`;
  db.run(sql, [status_approval, alasan_penolakan || null, bookingId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    db.get("SELECT user_id, keperluan FROM bookings WHERE id = ?", [bookingId], (errBook, booking) => {
      if (booking) {
        let pesanNotif = '';
        if (status_approval === 'ditolak') {
          pesanNotif = `Pengajuan pinjaman ("${booking.keperluan}") ditolak ❌. Alasan: ${alasan_penolakan}`;
        } else if (status_approval === 'disetujui') {
          pesanNotif = `Pengajuan pinjaman ("${booking.keperluan}") telah disetujui 🎉.`;
        } else {
          pesanNotif = `Status pengajuan pinjaman ("${booking.keperluan}") dikembalikan ke status menunggu.`;
        }
        db.run("INSERT INTO notifications (user_id, pesan, tipe) VALUES (?, ?, ?)", [booking.user_id, pesanNotif, status_approval]);
      }
    });

    res.json({ message: `Status berhasil diperbarui!` });
  });
});

// ================= ADMIN: VERIFIKASI AKUN =================

app.get('/api/admin/pending-users', (req, res) => {
  db.all("SELECT id, nama, username, role FROM users WHERE status_akun = 'pending'", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.put('/api/admin/approve-user/:id', (req, res) => {
  if (req.body.aksi === 'setujui') {
    db.run("UPDATE users SET status_akun = 'aktif' WHERE id = ?", [req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Akun admin berhasil disetujui dan diaktifkan!" });
    });
  } else {
    db.run("DELETE FROM users WHERE id = ?", [req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Pendaftaran akun ditolak dan dihapus." });
    });
  }
});

// ================= ADMIN: KELOLA LAB (CRUD) =================

app.post('/api/admin/labs', (req, res) => {
  db.run("INSERT INTO laboratories (nama_lab, lokasi, penanggung_jawab, kapasitas) VALUES (?, ?, ?, ?)", [req.body.nama_lab, req.body.lokasi, req.body.penanggung_jawab, req.body.kapasitas], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Lab berhasil ditambahkan!" });
  });
});

app.put('/api/admin/labs/:id', (req, res) => {
  db.run("UPDATE laboratories SET nama_lab = ?, lokasi = ?, penanggung_jawab = ?, kapasitas = ? WHERE id = ?", [req.body.nama_lab, req.body.lokasi, req.body.penanggung_jawab, req.body.kapasitas, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Lab berhasil diperbarui!" });
  });
});

app.delete('/api/admin/labs/:id', (req, res) => {
  db.run("DELETE FROM laboratories WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Lab berhasil dihapus!" });
  });
});

// ================= ADMIN: KELOLA FASILITAS (CRUD) =================

app.post('/api/admin/facilities', (req, res) => {
  db.run("INSERT INTO facilities (nama_fasilitas, lokasi, kondisi, penanggung_jawab, jumlah_tersedia) VALUES (?, ?, ?, ?, ?)", [req.body.nama_fasilitas, req.body.lokasi, req.body.kondisi, req.body.penanggung_jawab, req.body.jumlah_tersedia], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Fasilitas berhasil ditambahkan!", id: this.lastID });
  });
});

app.put('/api/admin/facilities/:id', (req, res) => {
  db.run("UPDATE facilities SET nama_fasilitas = ?, lokasi = ?, kondisi = ?, penanggung_jawab = ?, jumlah_tersedia = ? WHERE id = ?", [req.body.nama_fasilitas, req.body.lokasi, req.body.kondisi, req.body.penanggung_jawab, req.body.jumlah_tersedia, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Data fasilitas berhasil diperbarui!" });
  });
});

app.delete('/api/admin/facilities/:id', (req, res) => {
  db.run("DELETE FROM facilities WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Fasilitas berhasil dihapus!" });
  });
});

// ================= ADMIN: KELOLA USERS (CRUD) =================

app.get('/api/admin/users', (req, res) => {
  db.all("SELECT id, nama, username, role, status_akun FROM users", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/admin/users', (req, res) => {
  db.run("INSERT INTO users (nama, username, password, role, status_akun) VALUES (?, ?, ?, ?, 'aktif')", [req.body.nama, req.body.username, req.body.password, req.body.role || 'guru'], function(err) {
    if (err) return res.status(err.message.includes('UNIQUE') ? 400 : 500).json({ message: err.message.includes('UNIQUE') ? "Username sudah digunakan!" : err.message });
    res.json({ message: "Pengguna baru berhasil ditambahkan!" });
  });
});

app.put('/api/admin/users/:id', (req, res) => {
  db.run("UPDATE users SET nama = ?, username = ?, role = ?, status_akun = ? WHERE id = ?", [req.body.nama, req.body.username, req.body.role, req.body.status_akun, req.params.id], function(err) {
    if (err) return res.status(src = err.message.includes('UNIQUE') ? 400 : 500).json({ message: err.message.includes('UNIQUE') ? "Username sudah digunakan user lain!" : err.message });
    res.json({ message: "Data pengguna berhasil diperbarui!" });
  });
});

app.put('/api/admin/users/reset-password/:id', (req, res) => {
  db.run("UPDATE users SET password = ? WHERE id = ?", [req.body.password_baru, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Password pengguna berhasil direset!" });
  });
});

app.delete('/api/admin/users/:id', (req, res) => {
  db.run("DELETE FROM users WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "User berhasil dihapus!" });
  });
});

// ================= EKSPOR LAPORAN PDF (PREVIEW INLINE DI BROWSER) =================

app.get('/api/admin/export-pdf', (req, res) => {
  const { tanggal_mulai, tanggal_selesai } = req.query;

  let query = `
    SELECT b.id, u.nama as nama_peminjam, l.nama_lab, f.nama_fasilitas, 
           b.jumlah_pinjam, b.lokasi_penggunaan, b.tanggal, b.jam_mulai, 
           b.jam_selesai, b.keperluan, b.status_approval 
    FROM bookings b
    LEFT JOIN laboratories l ON b.lab_id = l.id
    LEFT JOIN facilities f ON b.facility_id = f.id
    JOIN users u ON b.user_id = u.id
  `;
  
  const params = [];
  if (tanggal_mulai && tanggal_selesai) {
    query += ` WHERE b.tanggal BETWEEN ? AND ?`;
    params.push(tanggal_mulai, tanggal_selesai);
  }
  query += ` ORDER BY b.tanggal ASC, b.jam_mulai ASC`;

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Inisialisasi PDF Landscape (A4 Landscape: lebar ~841 pt, tinggi ~595 pt)
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=laporan-peminjaman-sipas.pdf');
    
    doc.pipe(res);
    
    // --- KOP / HEADER LAPORAN DENGAN NAMA INSTITUSI ---
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1e293b').text('LAPORAN REKAPITULASI PEMINJAMAN ASET SEKOLAH (SIPAS)', { align: 'center' });
    doc.moveDown(0.1);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#0284c7').text('SMP IT INSAN HARAPAN TANGERANG SELATAN', { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(9).font('Helvetica').fillColor('#64748b');
    
    let infoPeriode = 'Periode Laporan: Keseluruhan Data';
    if (tanggal_mulai && tanggal_selesai) {
      infoPeriode = `Periode Laporan: ${tanggal_mulai} s/d ${tanggal_selesai}`;
    }
    doc.text(infoPeriode, { align: 'center' });
    doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} | Pukul: ${new Date().toLocaleTimeString('id-ID')}`, { align: 'center' });
    doc.moveDown(1.2);
    
    let y = doc.y; 
    const startX = 40;
    const pageWidth = 761; // 841 - (40 * 2 margin)

    const colWidths = [28, 95, 110, 90, 75, 90, 183, 90];

    const drawLine = (yPos) => {
      doc.strokeColor('#cbd5e1').lineWidth(0.8).moveTo(startX, yPos).lineTo(startX + pageWidth, yPos).stroke();
    };

    const drawVerticalLines = (yStart, yEnd) => {
      let x = startX;
      doc.strokeColor('#cbd5e1').lineWidth(0.8);
      colWidths.forEach(w => {
        doc.moveTo(x, yStart).lineTo(x, yEnd).stroke();
        x += w;
      });
      doc.moveTo(startX + pageWidth, yStart).lineTo(startX + pageWidth, yEnd).stroke();
    };

    const drawHeaderRow = (yPos) => {
      doc.rect(startX, yPos, pageWidth, 26).fill('#e0f2fe');
      doc.fillColor('#0369a1').font('Helvetica-Bold').fontSize(8.5);
      
      let x = startX;
      const headers = ['NO', 'RUANGAN', 'BARANG / ITEM', 'OLEH', 'DURASI', 'LOKASI', 'KEPERLUAN', 'STATUS'];
      
      headers.forEach((h, i) => {
        doc.text(h, x + 4, yPos + 8, { width: colWidths[i] - 8, align: i === 0 ? 'center' : 'left' });
        x += colWidths[i];
      });

      doc.rect(startX, yPos, pageWidth, 26).stroke('#0284c7');
      drawVerticalLines(yPos, yPos + 26);
    };

    drawLine(y);
    drawHeaderRow(y);
    y += 26;
    drawLine(y);

    if (rows.length === 0) {
      const emptyRowHeight = 45;
      const rowStartY = y;
      y += emptyRowHeight;
      drawLine(y);
      drawVerticalLines(rowStartY, y);

      doc.font('Helvetica-Oblique').fontSize(9.5).fillColor('#64748b')
         .text('Belum ada data peminjaman yang tercatat pada rentang tanggal tersebut.', startX, rowStartY + 16, { align: 'center', width: pageWidth });
    } else {
      rows.forEach((r, index) => {
        const no = (index + 1).toString();
        const ruangan = r.nama_lab !== '-' ? r.nama_lab : '-';
        const barang = r.nama_fasilitas !== '-' ? `${r.nama_fasilitas} (${r.jumlah_pinjam} unit)` : '-';
        const oleh = r.nama_peminjam;
        const durasi = `${r.tanggal}\n${r.jam_mulai} - ${r.jam_selesai}`;
        const lokasi = r.lokasi_penggunaan || '-';
        const keperluan = r.keperluan || '-';
        const status = r.status_approval.toUpperCase();

        const colHeights = [
          doc.heightOfString(no, { width: colWidths[0] - 8, lineSpacing: 4 }),
          doc.heightOfString(ruangan, { width: colWidths[1] - 8, lineSpacing: 4 }),
          doc.heightOfString(barang, { width: colWidths[2] - 8, lineSpacing: 4 }),
          doc.heightOfString(oleh, { width: colWidths[3] - 8, lineSpacing: 4 }),
          doc.heightOfString(durasi, { width: colWidths[4] - 8, lineSpacing: 4 }),
          doc.heightOfString(lokasi, { width: colWidths[5] - 8, lineSpacing: 4 }),
          doc.heightOfString(keperluan, { width: colWidths[6] - 8, lineSpacing: 4 }),
          doc.heightOfString(status, { width: colWidths[7] - 8, lineSpacing: 4 })
        ];
        
        const rowHeight = Math.max(...colHeights) + 14;

        if (y + rowHeight > 540) {
          doc.addPage();
          y = 40;
          drawLine(y);
          drawHeaderRow(y);
          y += 26;
          drawLine(y);
        }

        const rowStartY = y;

        if (index % 2 === 0) {
          doc.rect(startX, rowStartY, pageWidth, rowHeight).fill('#f8fafc');
        }

        doc.font('Helvetica').fontSize(8.5);
        let x = startX;
        const rowData = [no, ruangan, barang, oleh, durasi, lokasi, keperluan, status];

        rowData.forEach((dataTxt, i) => {
          if (i === 7) {
            doc.fillColor(status === 'DISETUJUI' ? '#16a34a' : status === 'DITOLAK' ? '#dc2626' : '#d97706')
               .font('Helvetica-Bold');
          } else {
            doc.fillColor('#334155').font('Helvetica');
          }

          doc.text(dataTxt, x + 4, rowStartY + 7, { width: colWidths[i] - 8, align: i === 0 ? 'center' : 'left', lineSpacing: 4 });
          x += colWidths[i];
        });

        y += rowHeight;
        drawLine(y);
        drawVerticalLines(rowStartY, y);
      });
    }

    doc.end();
  });
});

// --- ENDPOINT BATALKAN PENGAJUAN (GURU) ---
app.delete('/api/bookings/:id', (req, res) => {
  const id = req.params.id;
  db.run(`DELETE FROM bookings WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Pengajuan berhasil dibatalkan.' });
  });
});

app.listen(port, () => console.log(`Backend menyala di http://localhost:${port}`));