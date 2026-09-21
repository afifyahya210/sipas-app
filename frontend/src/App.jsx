import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import './sipas.css'
import LoginRegister from './components/LoginRegister'
import Navbar from './components/Navbar'
import AdminDashboard from './components/AdminDashboard'
import GuruDashboard from './components/GuruDashboard'

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('sipas_user')
    return savedUser ? JSON.parse(savedUser) : null
  })

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('sipas_user', JSON.stringify(currentUser))
    } else {
      localStorage.removeItem('sipas_user')
    }
  }, [currentUser])

  const [adminActiveMenu, setAdminActiveMenu] = useState('home')

  const [labs, setLabs] = useState([])
  const [bookings, setBookings] = useState([])
  const [pendingUsers, setPendingUsers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  
  const [isRegistering, setIsRegistering] = useState(false)
  const [usernameInput, setUsernameInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [namaInput, setNamaInput] = useState('')
  const [roleInput, setRoleInput] = useState('guru')

  const [newLabName, setNewLabName] = useState('')
  const [newLabCapacity, setNewLabCapacity] = useState('')
  const [editLabId, setEditLabId] = useState(null)

  const [newUserName, setNewUserName] = useState('')
  const [newUserUsername, setNewUserUsername] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState('guru')
  const [editUserId, setEditUserId] = useState(null)

  const [selectedLab, setSelectedLab] = useState(null)
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0])
  const [labSchedules, setLabSchedules] = useState([])
  
  const [formData, setFormData] = useState({ tanggal: '', jam_mulai: '', jam_selesai: '', keperluan: '' })

  useEffect(() => { fetchLabs() }, [])

  useEffect(() => {
    if (currentUser) {
      fetchBookings()
      if (currentUser.role === 'admin') { fetchPendingUsers(); fetchAllUsers(); }
    }
  }, [currentUser])

  useEffect(() => { if (selectedLab) fetchLabSchedule(selectedLab.id, scheduleDate) }, [selectedLab, scheduleDate])

  const fetchLabs = () => fetch(import.meta.env.VITE_API_URL + '/api/labs').then(res => res.json()).then(setLabs)
  
  const fetchBookings = () => {
    let url = import.meta.env.VITE_API_URL + '/api/bookings'
    if (currentUser && currentUser.role !== 'admin') url += `?user_id=${currentUser.id}`
    fetch(url).then(res => res.json()).then(data => setBookings(Array.isArray(data) ? data : [])).catch(() => setBookings([]))
  }
  
  const fetchPendingUsers = () => fetch(import.meta.env.VITE_API_URL + '/api/admin/pending-users').then(res => res.json()).then(setPendingUsers)
  const fetchAllUsers = () => fetch(import.meta.env.VITE_API_URL + '/api/admin/users').then(res => res.json()).then(setAllUsers)
  const fetchLabSchedule = (labId, tanggal) => fetch(`http://localhost:3000/api/labs/${labId}/schedule?tanggal=${tanggal}`).then(res => res.json()).then(setLabSchedules)

  const handleLogin = (e) => {
    e.preventDefault()
    fetch(import.meta.env.VITE_API_URL + '/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: usernameInput, password: passwordInput })
    })
    .then(async res => { const data = await res.json(); if (!res.ok) throw new Error(data.message); return data })
    .then(data => {
      setCurrentUser(data.user); 
      setUsernameInput(''); 
      setPasswordInput('');
      setAdminActiveMenu('home');
      setSelectedLab(null);
    })
    .catch(err => Swal.fire('Gagal Login', err.message, 'error'))
  }

  const handleRegister = (e) => {
    e.preventDefault()
    fetch(import.meta.env.VITE_API_URL + '/api/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nama: namaInput, username: usernameInput, password: passwordInput, role: roleInput })
    })
    .then(async res => { const data = await res.json(); if (!res.ok) throw new Error(data.message); return data })
    .then(data => {
      Swal.fire('Berhasil!', data.message, 'success');
      setIsRegistering(false); setNamaInput(''); setUsernameInput(''); setPasswordInput('');
    })
    .catch(err => Swal.fire('Gagal Mendaftar', err.message, 'error'))
  }

  const handleDeleteUser = (id) => {
    Swal.fire({
      title: 'Hapus user ini?', text: "Data pengguna akan dihapus permanen!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#e11d48', confirmButtonText: 'Ya, Hapus!'
    }).then((result) => {
      if (result.isConfirmed) fetch(`http://localhost:3000/api/admin/users/${id}`, { method: 'DELETE' }).then(res => res.json()).then(data => { Swal.fire('Terhapus!', data.message, 'success'); fetchAllUsers(); })
    })
  }

  const handleResetPassword = async (id, namaUser) => {
    const { value: passwordBaru } = await Swal.fire({
      title: `Reset Password ${namaUser}`, input: 'text', inputLabel: 'Masukkan password baru', showCancelButton: true, confirmButtonColor: '#3b82f6',
      inputValidator: (value) => { if (!value) return 'Password tidak boleh kosong!' }
    })
    if (passwordBaru) {
      fetch(`http://localhost:3000/api/admin/users/reset-password/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password_baru: passwordBaru }) })
      .then(res => res.json()).then(data => Swal.fire('Berhasil!', data.message, 'success'))
    }
  }

  const handleUserApproval = (userId, aksi) => {
    fetch(`http://localhost:3000/api/admin/approve-user/${userId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aksi }) })
    .then(res => res.json()).then(data => { Swal.fire('Selesai!', data.message, 'success'); fetchPendingUsers(); fetchAllUsers(); })
  }

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleApproval = (id, newStatus, alasan = '') => {
    fetch(`http://localhost:3000/api/bookings/${id}`, { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ status_approval: newStatus, alasan_penolakan: alasan }) 
    })
    .then(res => res.json())
    .then(data => { 
      Swal.fire('Diperbarui!', data.message, 'success'); 
      fetchBookings(); 
    })
  }

  const handleCancelBooking = (booking) => {
    if (booking.status_approval === 'disetujui') {
      return Swal.fire(
        'Tidak Bisa Dibatalkan', 
        'Pengajuan tidak bisa dibatalkan karena sudah disetujui Admin. Silakan hubungi Admin atau PIC terkait.', 
        'error'
      );
    }

    Swal.fire({
      title: 'Batalkan Pengajuan?',
      text: "Apakah Anda yakin ingin membatalkan pengajuan ini? Data akan dihapus.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48', 
      cancelButtonColor: '#94a3b8',  
      confirmButtonText: 'Ya, Batalkan!',
      cancelButtonText: 'Tutup'
    }).then((result) => {
      if (result.isConfirmed) {
        fetch(`http://localhost:3000/api/bookings/${booking.id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
          Swal.fire('Dibatalkan!', data.message, 'success');
          fetchBookings();
        })
        .catch(err => Swal.fire('Error', 'Terjadi kesalahan saat membatalkan.', 'error'));
      }
    });
  }

  if (!currentUser) {
    return (
      <LoginRegister 
        isRegistering={isRegistering} setIsRegistering={setIsRegistering} 
        handleLogin={handleLogin} handleRegister={handleRegister} 
        usernameInput={usernameInput} setUsernameInput={setUsernameInput} 
        passwordInput={passwordInput} setPasswordInput={setPasswordInput} 
        namaInput={namaInput} setNamaInput={setNamaInput} 
        roleInput={roleInput} setRoleInput={setRoleInput} 
      />
    )
  }

  const isAdmin = currentUser.role === 'admin';

  return (
    // Bagian style inline backgroundColor: '#f8fafc' dihapus agar CSS gradasi bawaan Anda kembali berfungsi
    <div className="min-h-screen text-slate-800 font-sans" style={{ display: 'flex', flexDirection: 'column' }}>
      
      {/* NAVBAR */}
      <Navbar currentUser={currentUser} setCurrentUser={setCurrentUser} onHomeClick={() => setSelectedLab(null)} />
      
      {/* KONTEN UTAMA */}
      <div style={{ flexGrow: 1, width: '100%', paddingBottom: '3rem' }}>
        <div className="max-w-5xl mx-auto px-6 space-y-8 mt-8">
          {isAdmin ? (
            <AdminDashboard 
              currentUser={currentUser}
              activeMenu={adminActiveMenu}            
              setActiveMenu={setAdminActiveMenu}      
              fetchAllUsers={fetchAllUsers}
              fetchLabs={fetchLabs}        
              pendingUsers={pendingUsers} allUsers={allUsers} labs={labs} 
              newUserName={newUserName} setNewUserName={setNewUserName} 
              newUserUsername={newUserUsername} setNewUserUsername={setNewUserUsername}
              newUserPassword={newUserPassword} setNewUserPassword={setNewUserPassword} 
              newUserRole={newUserRole} setNewUserRole={setNewUserRole} 
              editUserId={editUserId} setEditUserId={setEditUserId}
              newLabName={newLabName} setNewLabName={setNewLabName} 
              newLabCapacity={newLabCapacity} setNewLabCapacity={setNewLabCapacity} 
              editLabId={editLabId} setEditLabId={setEditLabId}
              
              handleUserApproval={handleUserApproval} 
              handleResetPassword={handleResetPassword} 
              handleDeleteUser={handleDeleteUser} 
              bookings={bookings} 
              handleApproval={handleApproval} 
            />
          ) : (
            <GuruDashboard 
              labs={labs} selectedLab={selectedLab} setSelectedLab={setSelectedLab} 
              scheduleDate={scheduleDate} setScheduleDate={setScheduleDate} 
              labSchedules={labSchedules} formData={formData} setFormData={setFormData}
              handleInputChange={handleInputChange} currentUser={currentUser} fetchBookings={fetchBookings} 
            />
          )}

          {!isAdmin && (
            <div className="sipas-card animate-fadeIn">
              <div className="sipas-card-header">
                <div><h2 className="sipas-title">Riwayat Peminjaman Saya</h2><p className="sipas-subtitle">Pantau status persetujuan peminjaman fasilitas.</p></div>
              </div>
              {bookings.length === 0 ? (
                <div className="empty-state">Belum ada data peminjaman.</div>
              ) : (
                <div className="sipas-table-container">
                  <table className="sipas-table">
                    <thead>
                      <tr>
                        <th>Item / Ruang</th>
                        <th>Penanggung Jawab (PIC)</th>
                        <th>Tanggal & Waktu</th>
                        <th>Keperluan</th>
                        <th className="center">Status & Keterangan</th>
                        <th className="center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b) => (
                        <tr key={b.id}>
                          <td>{b.nama_lab !== '-' ? `Lab: ${b.nama_lab}` : `${b.nama_fasilitas} (${b.jumlah_pinjam} unit)`}</td>
                          <td>
                            <span style={{ fontWeight: '500', color: '#334155' }}>
                              {b.nama_lab !== '-' ? b.pic_lab : b.pic_fasilitas}
                            </span>
                          </td>
                          <td>{b.tanggal} <br/><span style={{fontSize: '11px', color: '#94a3b8'}}>{b.jam_mulai} - {b.jam_selesai}</span></td>
                          <td>{b.keperluan}</td>
                          <td className="center">
                            <span className={`sipas-badge ${b.status_approval === 'disetujui' ? 'green' : b.status_approval === 'ditolak' ? 'danger' : 'yellow'}`}>
                              {b.status_approval}
                            </span>
                            {b.status_approval === 'ditolak' && b.alasan_penolakan && (
                              <div style={{ fontSize: '11px', color: '#e11d48', marginTop: '4px', fontStyle: 'italic' }}>
                                Alasan: {b.alasan_penolakan}
                              </div>
                            )}
                          </td>
                          <td className="center">
                            <button 
                              onClick={() => handleCancelBooking(b)} 
                              className="sipas-btn danger" 
                              style={{ 
                                padding: '5px 10px', 
                                fontSize: '11px',
                                opacity: b.status_approval === 'disetujui' ? 0.6 : 1,
                                cursor: 'pointer'
                              }}
                            >
                              Batalkan
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FOOTER PADA HALAMAN DASHBOARD */}
      <footer style={{ 
        background: 'rgba(255, 255, 255, 0.85)', 
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(226, 232, 240, 0.5)', 
        padding: '1.25rem 1rem', 
        textAlign: 'center',
        boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.05)'
      }}>
        <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 6px 0' }}>
          Created & Designed by <strong>TIM IT SMP IT Insan Harapan Tangerang Selatan</strong>
        </p>
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
          &copy; {new Date().getFullYear()} SIPAS. All rights reserved.
        </p>
      </footer>

    </div>
  )
}