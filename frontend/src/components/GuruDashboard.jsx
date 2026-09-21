import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'

export default function GuruDashboard({ 
  labs, selectedLab, setSelectedLab, scheduleDate, setScheduleDate, 
  labSchedules, formData, setFormData, handleInputChange, currentUser, fetchBookings 
}) {
  const [activeTab, setActiveTab] = useState('home') // 'home', 'book_lab', 'book_fac'
  
  // State Fasilitas
  const [facilities, setFacilities] = useState([])
  const [selectedFacility, setSelectedFacility] = useState(null)
  const [facilitySchedules, setFacilitySchedules] = useState([])
  
  // --- KONSTANTA BATAS WAKTU BOOKING (HARI INI s/d H+7) ---
  const getLocalDate = (daysToAdd = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const minDateStr = getLocalDate(0); // Hari Ini
  const maxDateStr = getLocalDate(7); // Batas Maksimal: Hari Ini + 7 Hari

  // Inisialisasi State Tanggal Peminjaman Default ke Hari Ini
  const [viewDate, setViewDate] = useState(minDateStr)
  useEffect(() => {
    if (!scheduleDate) setScheduleDate(minDateStr);
  }, []);

  // State Penguncian Form (Terkunci sampai Cek Ketersediaan diklik)
  const [isLabChecked, setIsLabChecked] = useState(false)
  const [isFacChecked, setIsFacChecked] = useState(false)

  // State untuk form peminjaman barang
  const [facFormData, setFacFormData] = useState({
    jumlah_pinjam: 1, lokasi_penggunaan: '', jam_mulai: '', jam_selesai: '', keperluan: ''
  })

  // Fetch daftar fasilitas saat komponen dimuat
  useEffect(() => {
    fetch('${import.meta.env.VITE_API_URL}/api/facilities')
      .then(res => res.json())
      .then(data => setFacilities(Array.isArray(data) ? data : []))
  }, [])

  const handleFacInputChange = (e) => {
    setFacFormData({ ...facFormData, [e.target.name]: e.target.value })
  }

  // --- HANDLER CEK KETERSEDIAAN LAB ---
  const handleCheckLab = () => {
    if (!selectedLab) return Swal.fire('Perhatian', 'Silakan pilih Ruangan Laboratorium terlebih dahulu!', 'warning');
    if (!scheduleDate) return Swal.fire('Perhatian', 'Silakan pilih Tanggal pemakaian!', 'warning');
    
    setIsLabChecked(true);
  }

  // --- HANDLER CEK KETERSEDIAAN BARANG ---
  const handleCheckFacility = () => {
    if (!selectedFacility) return Swal.fire('Perhatian', 'Silakan pilih Barang Inventaris terlebih dahulu!', 'warning');
    if (!viewDate) return Swal.fire('Perhatian', 'Silakan pilih Tanggal pemakaian!', 'warning');

    fetch(`${import.meta.env.VITE_API_URL}/api/facilities/${selectedFacility.id}/schedule?tanggal=${viewDate}`)
      .then(res => res.json())
      .then(data => {
        setFacilitySchedules(Array.isArray(data) ? data : []);
        setIsFacChecked(true); 
      })
      .catch(() => setFacilitySchedules([]));
  }

  // --- SUBMIT PEMINJAMAN LAB ---
  const handleSubmitLabBooking = (e) => {
    e.preventDefault()
    const dataToSend = {
      user_id: currentUser.id,
      lab_id: selectedLab.id,
      facility_id: null,
      jumlah_pinjam: 0,
      lokasi_penggunaan: selectedLab.nama_lab,
      tanggal: scheduleDate, 
      jam_mulai: formData.jam_mulai,
      jam_selesai: formData.jam_selesai,
      keperluan: formData.keperluan
    }

    fetch('${import.meta.env.VITE_API_URL}/api/bookings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataToSend)
    })
    .then(async res => { const data = await res.json(); if (!res.ok) throw new Error(data.message); return data })
    .then(() => {
      Swal.fire('Berhasil Mengajukan!', 'Pengajuan peminjaman ruangan telah dikirim ke Admin.', 'success')
      if (setFormData) setFormData({ tanggal: '', jam_mulai: '', jam_selesai: '', keperluan: '' })
      setIsLabChecked(false) 
      fetchBookings()
      setActiveTab('home')
    })
    .catch(err => Swal.fire('Gagal', err.message, 'error'))
  }

  // --- SUBMIT PEMINJAMAN BARANG ---
  const handleSubmitFacilityBooking = (e) => {
    e.preventDefault()
    const dataToSend = {
      user_id: currentUser.id,
      lab_id: null,
      facility_id: selectedFacility.id,
      jumlah_pinjam: facFormData.jumlah_pinjam,
      lokasi_penggunaan: facFormData.lokasi_penggunaan,
      tanggal: viewDate, 
      jam_mulai: facFormData.jam_mulai,
      jam_selesai: facFormData.jam_selesai,
      keperluan: facFormData.keperluan
    }

    fetch('${import.meta.env.VITE_API_URL}/api/bookings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataToSend)
    })
    .then(async res => { const data = await res.json(); if (!res.ok) throw new Error(data.message); return data })
    .then(() => {
      Swal.fire('Berhasil Mengajukan!', 'Pengajuan peminjaman barang inventaris telah dikirim ke Admin.', 'success')
      setFacFormData({ jumlah_pinjam: 1, lokasi_penggunaan: '', jam_mulai: '', jam_selesai: '', keperluan: '' })
      setIsFacChecked(false) 
      fetchBookings()
      setActiveTab('home')
    })
    .catch(err => Swal.fire('Gagal', err.message, 'error'))
  }

  return (
    <div className="admin-container animate-fadeIn">
      
      {/* TOMBOL KEMBALI */}
      {activeTab !== 'home' && (
        <div className="header-navigation" style={{ marginBottom: '15px' }}>
          <button onClick={() => { setActiveTab('home'); setSelectedLab(null); setSelectedFacility(null); setIsLabChecked(false); setIsFacChecked(false); }} className="sipas-btn secondary">
            ← Kembali ke Menu Utama
          </button>
        </div>
      )}

      {/* ================= 1. MENU UTAMA (HOME GURU) ================= */}
      {activeTab === 'home' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="sipas-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', padding: '1.5rem 2.25rem' }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', color: '#059669', fontWeight: '600' }}>
              Assalamualaikum, {currentUser?.nama || 'Guru'} ✨
            </h4>
            <h2 className="sipas-title" style={{ fontSize: '1.5rem' }}>Selamat Datang di Portal Layanan SIPAS</h2>
            <p className="sipas-subtitle">Silakan pilih menu di bawah ini untuk mengajukan peminjaman ruangan laboratorium atau inventaris sekolah.</p>
          </div>

          <div className="admin-menu-grid">
            <div className="admin-menu-card" onClick={() => setActiveTab('book_lab')}>
              <div className="sipas-icon-wrapper"><div className="sipas-icon unified">🏫</div></div>
              <div>
                <h3 className="sipas-title">Pinjam Ruangan Lab</h3>
                <p className="sipas-subtitle">{labs.length} Lab Tersedia</p>
              </div>
            </div>

            <div className="admin-menu-card" onClick={() => setActiveTab('book_fac')}>
              <div className="sipas-icon-wrapper"><div className="sipas-icon unified">🎒</div></div>
              <div>
                <h3 className="sipas-title">Pinjam Barang / Alat</h3>
                <p className="sipas-subtitle">{facilities.length} Inventaris Aktif</p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ================= 2. FORM & JADWAL LAB ================= */}
      {activeTab === 'book_lab' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1.8fr)', gap: '20px', alignItems: 'start' }}>
          
          {/* SISI KIRI: PEMILIHAN & JADWAL RUANGAN */}
          <div className="sipas-card animate-fadeIn" style={{ alignSelf: 'start', height: '580px', display: 'flex', flexDirection: 'column', padding: '1.25rem', boxSizing: 'border-box' }}>
            
            <div style={{ flexShrink: 0 }}>
              <div className="sipas-card-header" style={{ marginBottom: '10px', paddingBottom: '0' }}>
                <div>
                  <h3 className="sipas-title" style={{ fontSize: '1.05rem' }}>🔍 Cek Ketersediaan</h3>
                  <p className="sipas-subtitle" style={{ fontSize: '0.75rem' }}>Pilih ruangan dan tanggal.</p>
                </div>
              </div>

              <div className="sipas-form-group" style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '0.75rem' }}>Pilih Ruangan</label>
                <select 
                  className="sipas-input" 
                  value={selectedLab ? selectedLab.id : ''}
                  onChange={(e) => {
                    const found = labs.find(l => l.id.toString() === e.target.value);
                    setSelectedLab(found || null);
                    setIsLabChecked(false); 
                  }}
                  style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                >
                  <option value="">-- Pilih Lab --</option>
                  {labs.map(l => (
                    <option key={l.id} value={l.id}>{l.nama_lab} (Kapasitas: {l.kapasitas})</option>
                  ))}
                </select>
                <div style={{ minHeight: '34px', marginTop: '8px' }}>
                  {selectedLab && (
                    <div style={{ display: 'inline-flex', gap: '15px', background: '#ecfdf5', border: '1px solid #d1fae5', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', color: '#047857', fontWeight: '600' }}>
                      <span>👤 PIC: {selectedLab.penanggung_jawab || 'Belum diatur'}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="sipas-form-group" style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.75rem' }}>Tanggal Pakai</label>
                <input 
                  type="date" 
                  className="sipas-input" 
                  value={scheduleDate} 
                  min={minDateStr}
                  max={maxDateStr}
                  onChange={(e) => {
                    setScheduleDate(e.target.value);
                    setIsLabChecked(false); 
                  }} 
                  style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                />
              </div>

              <button onClick={handleCheckLab} className="sipas-btn primary" style={{ width: '100%', marginBottom: '15px' }}>
                Cek Ketersediaan
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', borderTop: '2px dashed #e2e8f0', paddingTop: '15px' }}>
              {!isLabChecked ? (
                <div style={{ margin: 'auto 0', padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>
                  👆 Silakan pilih ruangan dan tanggal, lalu klik <strong>Cek Ketersediaan</strong> untuk melihat jadwal.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px', flexShrink: 0 }}>
                    Jadwal Terisi (Hari Ini)
                  </div>
                  <div className="sipas-table-container" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                    <table className="sipas-table" style={{ fontSize: '0.75rem', minWidth: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '0.5rem' }}>Jam</th>
                          <th style={{ padding: '0.5rem' }}>Detail / Peminjam</th>
                        </tr>
                      </thead>
                      <tbody>
                        {labSchedules.length === 0 ? (
                          <tr>
                            <td colSpan="2" style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>
                              Belum ada jadwal terisi, ruangan kosong! ✅
                            </td>
                          </tr>
                        ) : (
                          labSchedules.map((sch, i) => (
                            <tr key={i}>
                              <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}><strong>{sch.jam_mulai} - {sch.jam_selesai}</strong></td>
                              <td style={{ padding: '0.5rem' }}>
                                <div style={{ fontWeight: 600, color: '#1e293b' }}>{sch.keperluan}</div>
                                <div style={{ fontSize: '0.65rem', color: '#059669' }}>👤 {sch.nama_peminjam}</div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SISI KANAN: FORMULIR PENGAJUAN LAB */}
          <div className="sipas-card animate-fadeIn" style={{ alignSelf: 'start', height: '580px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            <div style={{ flexShrink: 0 }}>
              <div className="sipas-card-header" style={{ marginBottom: '15px' }}>
                <div className="sipas-card-title-group">
                  <div className="sipas-icon unified">🏫</div>
                  <div>
                    <h2 className="sipas-title" style={{ fontSize: '1.1rem' }}>Formulir Reservasi Lab</h2>
                    <p className="sipas-subtitle" style={{ fontSize: '0.75rem' }}>Lengkapi data untuk meminjam ruangan.</p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
              {!isLabChecked ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#94a3b8', border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '2rem', textAlign: 'center', background: '#f8fafc' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🔒</div>
                  <h3 style={{ fontSize: '1rem', color: '#475569', marginBottom: '5px' }}>Formulir Terkunci</h3>
                  <p style={{ fontSize: '0.8rem', margin: 0 }}>Silakan lakukan <strong>Cek Ketersediaan</strong> di panel sebelah kiri terlebih dahulu untuk membuka formulir ini.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmitLabBooking} className="sipas-form animate-fadeIn">
                  
                  <div style={{ flex: '1 1 100%', width: '100%', boxSizing: 'border-box', background: '#f0fdf4', padding: '15px', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
                    <div>
                      <p style={{ fontSize: '0.7rem', color: '#166534', margin: '0 0 4px 0', textTransform: 'uppercase', fontWeight: 'bold' }}>Ruangan Terpilih</p>
                      <p style={{ fontSize: '1rem', color: '#14532d', margin: 0, fontWeight: 'bold' }}>{selectedLab.nama_lab}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '0.7rem', color: '#166534', margin: '0 0 4px 0', textTransform: 'uppercase', fontWeight: 'bold' }}>Tanggal Pemakaian</p>
                      <p style={{ fontSize: '1rem', color: '#14532d', margin: 0, fontWeight: 'bold' }}>{scheduleDate}</p>
                    </div>
                  </div>

                  <div style={{ flex: '1 1 100%', display: 'flex', gap: '15px', width: '100%' }}>
                    <div className="sipas-form-group" style={{ flex: '1 1 48%' }}>
                      <label>Jam Mulai</label>
                      <input type="time" name="jam_mulai" className="sipas-input" value={formData.jam_mulai} onChange={handleInputChange} required />
                    </div>

                    <div className="sipas-form-group" style={{ flex: '1 1 48%' }}>
                      <label>Jam Selesai</label>
                      <input type="time" name="jam_selesai" className="sipas-input" value={formData.jam_selesai} onChange={handleInputChange} required />
                    </div>
                  </div>

                  <div className="sipas-form-group" style={{ flex: '1 1 100%' }}>
                    <label>Keperluan Peminjaman</label>
                    <input type="text" name="keperluan" className="sipas-input" placeholder="Contoh: Praktikum Biologi Kelas 11" value={formData.keperluan} onChange={handleInputChange} required />
                  </div>

                  <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                    <button type="submit" className="sipas-btn success" style={{ padding: '12px 24px', fontSize: '0.95rem' }}>🚀 Kirim Pengajuan Ruang</button>
                  </div>
                </form>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ================= 3. FORM & JADWAL BARANG ================= */}
      {activeTab === 'book_fac' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1.8fr)', gap: '20px', alignItems: 'start' }}>
          
          {/* SISI KIRI: PEMILIHAN & JADWAL BARANG */}
          <div className="sipas-card animate-fadeIn" style={{ alignSelf: 'start', height: '580px', display: 'flex', flexDirection: 'column', padding: '1.25rem', boxSizing: 'border-box' }}>
            
            <div style={{ flexShrink: 0 }}>
              <div className="sipas-card-header" style={{ marginBottom: '10px', paddingBottom: '0' }}>
                <div>
                  <h3 className="sipas-title" style={{ fontSize: '1.05rem' }}>🔍 Cek Ketersediaan</h3>
                  <p className="sipas-subtitle" style={{ fontSize: '0.75rem' }}>Pilih barang dan tanggal.</p>
                </div>
              </div>

              <div className="sipas-form-group" style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '0.75rem' }}>Pilih Barang Inventaris</label>
                <select 
                  className="sipas-input" 
                  value={selectedFacility ? selectedFacility.id : ''}
                  onChange={(e) => {
                    const found = facilities.find(f => f.id.toString() === e.target.value);
                    setSelectedFacility(found || null);
                    setIsFacChecked(false); 
                  }}
                  style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                >
                  <option value="">-- Pilih Barang --</option>
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>{f.nama_fasilitas} (Stok: {f.jumlah_tersedia})</option>
                  ))}
                </select>
                <div style={{ minHeight: '34px', marginTop: '8px' }}>
                  {selectedFacility && (
                    <div style={{ display: 'inline-flex', gap: '15px', background: '#ecfdf5', border: '1px solid #d1fae5', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', color: '#047857', fontWeight: '600', flexWrap: 'wrap' }}>
                      <span>👤 PIC: {selectedFacility.penanggung_jawab || 'Belum diatur'}</span>
                      <span>📍 Lokasi: {selectedFacility.lokasi || 'Belum diatur'}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="sipas-form-group" style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.75rem' }}>Tanggal Pakai</label>
                <input 
                  type="date" 
                  className="sipas-input" 
                  value={viewDate} 
                  min={minDateStr}
                  max={maxDateStr}
                  onChange={(e) => {
                    setViewDate(e.target.value);
                    setIsFacChecked(false); 
                  }} 
                  style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                />
              </div>

              <button onClick={handleCheckFacility} className="sipas-btn primary" style={{ width: '100%', marginBottom: '15px' }}>
                Cek Ketersediaan
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', borderTop: '2px dashed #e2e8f0', paddingTop: '15px' }}>
              {!isFacChecked ? (
                <div style={{ margin: 'auto 0', padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>
                  👆 Silakan pilih barang dan tanggal, lalu klik <strong>Cek Ketersediaan</strong> untuk melihat jadwal.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px', flexShrink: 0 }}>
                    Jadwal Terisi (Hari Ini)
                  </div>
                  <div className="sipas-table-container" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                    <table className="sipas-table" style={{ fontSize: '0.75rem', minWidth: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '0.5rem' }}>Jam & Unit</th>
                          <th style={{ padding: '0.5rem' }}>Detail / Peminjam</th>
                        </tr>
                      </thead>
                      <tbody>
                        {facilitySchedules.length === 0 ? (
                          <tr>
                            <td colSpan="2" style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>
                              Belum ada yang pinjam! ✅
                            </td>
                          </tr>
                        ) : (
                          facilitySchedules.map((sch, i) => (
                            <tr key={i}>
                              <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>
                                <strong>{sch.jam_mulai} - {sch.jam_selesai}</strong><br/>
                                <span style={{ color: '#059669', fontSize: '0.65rem' }}>({sch.jumlah_pinjam} unit)</span>
                              </td>
                              <td style={{ padding: '0.5rem' }}>
                                <div style={{ fontWeight: 600, color: '#1e293b' }}>{sch.lokasi_penggunaan}</div>
                                <div style={{ fontSize: '0.65rem', color: '#059669' }}>👤 {sch.nama_peminjam}</div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SISI KANAN: FORMULIR PENGAJUAN BARANG */}
          <div className="sipas-card animate-fadeIn" style={{ alignSelf: 'start', height: '580px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            <div style={{ flexShrink: 0 }}>
              <div className="sipas-card-header" style={{ marginBottom: '15px' }}>
                <div className="sipas-card-title-group">
                  <div className="sipas-icon unified">🎒</div>
                  <div>
                    <h2 className="sipas-title" style={{ fontSize: '1.1rem' }}>Formulir Reservasi Barang</h2>
                    <p className="sipas-subtitle" style={{ fontSize: '0.75rem' }}>Lengkapi data untuk meminjam inventaris.</p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
              {!isFacChecked ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#94a3b8', border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '2rem', textAlign: 'center', background: '#f8fafc' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🔒</div>
                  <h3 style={{ fontSize: '1rem', color: '#475569', marginBottom: '5px' }}>Formulir Terkunci</h3>
                  <p style={{ fontSize: '0.8rem', margin: 0 }}>Silakan lakukan <strong>Cek Ketersediaan</strong> di panel sebelah kiri terlebih dahulu untuk membuka formulir ini.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmitFacilityBooking} className="sipas-form animate-fadeIn">
                  
                  <div style={{ flex: '1 1 100%', width: '100%', boxSizing: 'border-box', background: '#f0fdf4', padding: '15px', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
                    <div>
                      <p style={{ fontSize: '0.7rem', color: '#166534', margin: '0 0 4px 0', textTransform: 'uppercase', fontWeight: 'bold' }}>Barang Terpilih</p>
                      <p style={{ fontSize: '1rem', color: '#14532d', margin: 0, fontWeight: 'bold' }}>{selectedFacility.nama_fasilitas}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '0.7rem', color: '#166534', margin: '0 0 4px 0', textTransform: 'uppercase', fontWeight: 'bold' }}>Tanggal Pemakaian</p>
                      <p style={{ fontSize: '1rem', color: '#14532d', margin: 0, fontWeight: 'bold' }}>{viewDate}</p>
                    </div>
                  </div>

                  <div style={{ flex: '1 1 100%', display: 'flex', gap: '15px', width: '100%' }}>
                    <div className="sipas-form-group" style={{ flex: '1 1 48%' }}>
                      <label>Jumlah Unit Dipinjam</label>
                      <input type="number" name="jumlah_pinjam" min="1" max={selectedFacility.jumlah_tersedia} className="sipas-input" value={facFormData.jumlah_pinjam} onChange={handleFacInputChange} required />
                    </div>

                    <div className="sipas-form-group" style={{ flex: '1 1 48%' }}>
                      <label>Lokasi Penggunaan</label>
                      <input type="text" name="lokasi_penggunaan" className="sipas-input" placeholder="Contoh: Ruang Kelas X-A" value={facFormData.lokasi_penggunaan} onChange={handleFacInputChange} required />
                    </div>
                  </div>

                  <div style={{ flex: '1 1 100%', display: 'flex', gap: '15px', width: '100%' }}>
                    <div className="sipas-form-group" style={{ flex: '1 1 48%' }}>
                      <label>Jam Mulai</label>
                      <input type="time" name="jam_mulai" className="sipas-input" value={facFormData.jam_mulai} onChange={handleFacInputChange} required />
                    </div>

                    <div className="sipas-form-group" style={{ flex: '1 1 48%' }}>
                      <label>Jam Selesai</label>
                      <input type="time" name="jam_selesai" className="sipas-input" value={facFormData.jam_selesai} onChange={handleFacInputChange} required />
                    </div>
                  </div>

                  <div className="sipas-form-group" style={{ flex: '1 1 100%' }}>
                    <label>Keperluan Peminjaman</label>
                    <input type="text" name="keperluan" className="sipas-input" placeholder="Contoh: Mengajar presentasi materi" value={facFormData.keperluan} onChange={handleFacInputChange} required />
                  </div>

                  <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                    <button type="submit" className="sipas-btn success" style={{ padding: '12px 24px', fontSize: '0.95rem' }}>🚀 Kirim Pengajuan Barang</button>
                  </div>
                </form>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  )
}