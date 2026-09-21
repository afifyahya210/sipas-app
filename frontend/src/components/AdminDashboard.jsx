import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'

export default function AdminDashboard({
  currentUser,
  activeMenu, setActiveMenu, fetchAllUsers, fetchLabs,
  pendingUsers, allUsers, labs,
  newUserName, setNewUserName, newUserUsername, setNewUserUsername,
  newUserPassword, setNewUserPassword, newUserRole, setNewUserRole, editUserId, setEditUserId,
  newLabName, setNewLabName, newLabCapacity, setNewLabCapacity, editLabId, setEditLabId,
  handleUserApproval, handleSaveUserByAdmin, handleStartEditUser, handleResetPassword, handleDeleteUser,
  handleSaveLab, handleStartEditLab, handleDeleteLab,
  bookings, handleApproval
}) {
  
  const [facilities, setFacilities] = useState([])

  useEffect(() => { fetchFacilities() }, [])

  const fetchFacilities = () => {
    fetch(`${import.meta.env.VITE_API_URL}/api/facilities`)
      .then(res => res.json())
      .then(data => setFacilities(Array.isArray(data) ? data : []))
  }

  // --- POPUP MODAL PILIH RENTANG TANGGAL SEBELUM PREVIEW PDF ---
  const openExportPdfModal = () => {
    Swal.fire({
      title: 'Cetak Laporan PDF',
      html: `
        <div style="text-align: left; display: flex; flex-direction: column; gap: 14px; margin-top: 10px;">
          <p style="font-size: 13px; color: #64748b; margin: 0;">Silakan pilih rentang tanggal laporan yang ingin ditampilkan, atau biarkan kosong jika ingin mencetak seluruh data.</p>
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 4px;">Dari Tanggal</label>
            <input id="swal-tgl-mulai" type="date" class="swal2-input" style="margin: 0; width: 100%; height: 42px; font-size: 14px; border-radius: 8px;">
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 4px;">Sampai Tanggal</label>
            <input id="swal-tgl-selesai" type="date" class="swal2-input" style="margin: 0; width: 100%; height: 42px; font-size: 14px; border-radius: 8px;">
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Preview PDF',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#0284c7',
      cancelButtonColor: '#94a3b8',
      preConfirm: () => {
        const tglMulai = document.getElementById('swal-tgl-mulai').value;
        const tglSelesai = document.getElementById('swal-tgl-selesai').value;
        
        // Validasi opsional: Jika salah satu diisi, maka keduanya wajib diisi
        if ((tglMulai && !tglSelesai) || (!tglMulai && tglSelesai)) {
          Swal.showValidationMessage('Harap isi kedua tanggal rentang dengan lengkap, atau kosongkan keduanya!');
          return false;
        }

        return { tglMulai, tglSelesai };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const { tglMulai, tglSelesai } = result.value;
        let url = `${import.meta.env.VITE_API_URL}/api/admin/export-pdf`;
        
        if (tglMulai && tglSelesai) {
          url += `?tanggal_mulai=${tglMulai}&tanggal_selesai=${tglSelesai}`;
        }

        // Membuka tab baru di browser untuk preview PDF
        window.open(url, '_blank');
      }
    });
  };

  // Pop-up input alasan penolakan
  const promptReject = (bookingId) => {
    Swal.fire({
      title: 'Alasan Penolakan',
      input: 'textarea',
      inputPlaceholder: 'Tuliskan alasan mengapa pengajuan ini ditolak...',
      showCancelButton: true,
      confirmButtonText: 'Tolak Pengajuan',
      confirmButtonColor: '#e11d48',
      cancelButtonText: 'Batal',
      inputValidator: (value) => {
        if (!value) {
          return 'Anda wajib mengisi alasan penolakan!'
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        handleApproval(bookingId, 'ditolak', result.value);
      }
    })
  }

  // Pop-up konfirmasi pembatalan persetujuan
  const promptCancelApproval = (bookingId) => {
    Swal.fire({
      title: 'Batalkan Persetujuan?',
      text: 'Status peminjaman akan dikembalikan menjadi "menunggu".',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d97706',
      confirmButtonText: 'Ya, Batalkan',
      cancelButtonText: 'Kembali'
    }).then((result) => {
      if (result.isConfirmed) {
        handleApproval(bookingId, 'menunggu', '');
      }
    })
  }

  // --- POPUP MODAL: TAMBAH / EDIT USER ---
  const openUserModal = (userToEdit = null) => {
    if (userToEdit) {
      setEditUserId(userToEdit.id)
      setNewUserName(userToEdit.nama)
      setNewUserUsername(userToEdit.username)
      setNewUserRole(userToEdit.role)
    } else {
      setEditUserId(null)
      setNewUserName('')
      setNewUserUsername('')
      setNewUserPassword('')
      setNewUserRole('guru')
    }

    Swal.fire({
      title: userToEdit ? 'Edit Pengguna' : 'Tambah Pengguna Baru',
      html: `
        <div style="text-align: left; display: flex; flex-direction: column; gap: 12px; margin-top: 10px;">
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 4px;">Nama Lengkap</label>
            <input id="swal-input-nama" class="swal2-input" placeholder="Nama lengkap" value="${userToEdit ? userToEdit.nama : ''}" style="margin: 0; width: 100%; height: 42px; font-size: 14px; border-radius: 8px;">
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 4px;">Username</label>
            <input id="swal-input-username" class="swal2-input" placeholder="Username" value="${userToEdit ? userToEdit.username : ''}" style="margin: 0; width: 100%; height: 42px; font-size: 14px; border-radius: 8px;">
          </div>
          ${!userToEdit ? `
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 4px;">Password</label>
            <input id="swal-input-password" type="password" class="swal2-input" placeholder="••••••••" style="margin: 0; width: 100%; height: 42px; font-size: 14px; border-radius: 8px;">
          </div>
          ` : ''}
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 4px;">Role Pengguna</label>
            <select id="swal-input-role" class="swal2-input" style="margin: 0; width: 100%; height: 42px; font-size: 14px; border-radius: 8px;">
              <option value="guru" ${userToEdit && userToEdit.role === 'guru' ? 'selected' : ''}>Guru</option>
              <option value="admin" ${userToEdit && userToEdit.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: userToEdit ? 'Simpan Perubahan' : 'Tambah User',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#94a3b8',
      preConfirm: () => {
        const nama = document.getElementById('swal-input-nama').value;
        const username = document.getElementById('swal-input-username').value;
        const password = document.getElementById('swal-input-password') ? document.getElementById('swal-input-password').value : '';
        const role = document.getElementById('swal-input-role').value;

        if (!nama || !username || (!userToEdit && !password)) {
          Swal.showValidationMessage('Semua kolom wajib diisi!');
          return false;
        }
        return { nama, username, password, role };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const data = result.value;
        setNewUserName(data.nama);
        setNewUserUsername(data.username);
        if(!userToEdit) setNewUserPassword(data.password);
        setNewUserRole(data.role);
        
        handleSaveUserByAdminCustom(data, userToEdit ? userToEdit.id : null);
      }
    });
  };

  const handleSaveUserByAdminCustom = (formDataVal, idEdit) => {
    const url = idEdit ? `${import.meta.env.VITE_API_URL}/api/admin/users/${idEdit}` : `${import.meta.env.VITE_API_URL}/api/admin/users`
    const bodyData = idEdit 
      ? { nama: formDataVal.nama, username: formDataVal.username, role: formDataVal.role, status_akun: 'aktif' } 
      : { nama: formDataVal.nama, username: formDataVal.username, password: formDataVal.password, role: formDataVal.role }

    fetch(url, { method: idEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyData) })
    .then(async res => { const data = await res.json(); if (!res.ok) throw new Error(data.message); return data })
    .then(data => {
      Swal.fire({
        title: 'Berhasil!',
        text: idEdit ? 'Data pengguna berhasil diperbarui.' : 'Pengguna baru berhasil dibuat.',
        icon: 'success',
        confirmButtonColor: '#2563eb'
      }).then(() => {
        setActiveMenu('users');
        if (typeof fetchAllUsers === 'function') {
          fetchAllUsers();
        } else {
          window.location.reload();
        }
      });
    })
    .catch(err => Swal.fire('Gagal Menyimpan', err.message, 'error'))
  };

  const openLabModal = (labToEdit = null) => {
    if (labToEdit) {
      setEditLabId(labToEdit.id)
      setNewLabName(labToEdit.nama_lab)
      setNewLabCapacity(labToEdit.kapasitas)
    } else {
      setEditLabId(null)
      setNewLabName('')
      setNewLabCapacity('')
    }

    Swal.fire({
      title: labToEdit ? 'Edit Ruangan Lab' : 'Tambah Ruangan Lab Baru',
      html: `
        <div style="text-align: left; display: flex; flex-direction: column; gap: 12px; margin-top: 10px;">
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 4px;">Nama Ruangan / Lab</label>
            <input id="swal-input-labname" class="swal2-input" placeholder="Contoh: Lab Komputer 1" value="${labToEdit ? labToEdit.nama_lab : ''}" style="margin: 0; width: 100%; height: 42px; font-size: 14px; border-radius: 8px;">
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 4px;">Lokasi</label>
            <input id="swal-input-lokasi" class="swal2-input" placeholder="Contoh: Lantai 2, Gedung B" value="${labToEdit && labToEdit.lokasi ? labToEdit.lokasi : ''}" style="margin: 0; width: 100%; height: 42px; font-size: 14px; border-radius: 8px;">
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 4px;">Penanggung Jawab</label>
            <input id="swal-input-labpj" class="swal2-input" placeholder="Contoh: Pak Andi" value="${labToEdit && labToEdit.penanggung_jawab ? labToEdit.penanggung_jawab : ''}" style="margin: 0; width: 100%; height: 42px; font-size: 14px; border-radius: 8px;">
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 4px;">Kapasitas (Orang)</label>
            <input id="swal-input-kapasitas" type="number" class="swal2-input" placeholder="Contoh: 30" value="${labToEdit ? labToEdit.kapasitas : ''}" style="margin: 0; width: 100%; height: 42px; font-size: 14px; border-radius: 8px;">
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: labToEdit ? 'Update Lab' : 'Simpan Lab',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#94a3b8',
      preConfirm: () => {
        const nama_lab = document.getElementById('swal-input-labname').value;
        const lokasi = document.getElementById('swal-input-lokasi').value;
        const penanggung_jawab = document.getElementById('swal-input-labpj').value;
        const kapasitas = document.getElementById('swal-input-kapasitas').value;
        
        if (!nama_lab || !lokasi || !penanggung_jawab || !kapasitas) {
          Swal.showValidationMessage('Semua kolom wajib diisi!');
          return false;
        }
        return { nama_lab, lokasi, penanggung_jawab, kapasitas };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const data = result.value;
        setNewLabName(data.nama_lab);
        setNewLabCapacity(data.kapasitas);
        
        const url = labToEdit ? `${import.meta.env.VITE_API_URL}/api/admin/labs/${labToEdit.id}` : `${import.meta.env.VITE_API_URL}/api/admin/labs`
        fetch(url, {
          method: labToEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        })
        .then(res => res.json()).then(resData => {
          Swal.fire('Tersimpan!', resData.message, 'success').then(() => {
            setActiveMenu('labs'); 
            if (typeof fetchLabs === 'function') {
              fetchLabs(); 
            }
          });
        })
      }
    });
  };

  const openFacilityModal = (facToEdit = null) => {
    Swal.fire({
      title: facToEdit ? 'Edit Barang Inventaris' : 'Tambah Barang Inventaris Baru',
      html: `
        <div style="text-align: left; display: flex; flex-direction: column; gap: 12px; margin-top: 10px;">
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 4px;">Nama Barang / Fasilitas</label>
            <input id="swal-input-facname" class="swal2-input" placeholder="Contoh: Proyektor Epson" value="${facToEdit ? facToEdit.nama_fasilitas : ''}" style="margin: 0; width: 100%; height: 42px; font-size: 14px; border-radius: 8px;">
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 4px;">Lokasi Penyimpanan</label>
            <input id="swal-input-faclokasi" class="swal2-input" placeholder="Contoh: Lemari Ruang Guru" value="${facToEdit && facToEdit.lokasi ? facToEdit.lokasi : ''}" style="margin: 0; width: 100%; height: 42px; font-size: 14px; border-radius: 8px;">
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 4px;">Kondisi Barang</label>
            <select id="swal-input-fackondisi" class="swal2-input" style="margin: 0; width: 100%; height: 42px; font-size: 14px; border-radius: 8px;">
              <option value="Baik" ${facToEdit && facToEdit.kondisi === 'Baik' ? 'selected' : ''}>Baik</option>
              <option value="Rusak Ringan" ${facToEdit && facToEdit.kondisi === 'Rusak Ringan' ? 'selected' : ''}>Rusak Ringan</option>
              <option value="Rusak Berat" ${facToEdit && facToEdit.kondisi === 'Rusak Berat' ? 'selected' : ''}>Rusak Berat</option>
            </select>
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 4px;">Penanggung Jawab</label>
            <input id="swal-input-facpj" class="swal2-input" placeholder="Contoh: Pak Budi" value="${facToEdit && facToEdit.penanggung_jawab ? facToEdit.penanggung_jawab : ''}" style="margin: 0; width: 100%; height: 42px; font-size: 14px; border-radius: 8px;">
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 4px;">Jumlah Stok Tersedia</label>
            <input id="swal-input-stock" type="number" class="swal2-input" placeholder="Contoh: 10" value="${facToEdit ? facToEdit.jumlah_tersedia : ''}" style="margin: 0; width: 100%; height: 42px; font-size: 14px; border-radius: 8px;">
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: facToEdit ? 'Update Barang' : 'Simpan Barang',
      cancelButtonText: 'Batal',
      confirmButtonColor: facToEdit ? '#2563eb' : '#059669',
      cancelButtonColor: '#94a3b8',
      preConfirm: () => {
        const nama_fasilitas = document.getElementById('swal-input-facname').value;
        const lokasi = document.getElementById('swal-input-faclokasi').value;
        const kondisi = document.getElementById('swal-input-fackondisi').value;
        const penanggung_jawab = document.getElementById('swal-input-facpj').value;
        const jumlah_tersedia = document.getElementById('swal-input-stock').value;
        
        if (!nama_fasilitas || !lokasi || !kondisi || !penanggung_jawab || !jumlah_tersedia) {
          Swal.showValidationMessage('Semua kolom wajib diisi!');
          return false;
        }
        return { nama_fasilitas, lokasi, kondisi, penanggung_jawab, jumlah_tersedia };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const data = result.value;
        const url = facToEdit ? `${import.meta.env.VITE_API_URL}/api/admin/facilities/${facToEdit.id}` : `${import.meta.env.VITE_API_URL}/api/admin/facilities`;
        
        fetch(url, {
          method: facToEdit ? 'PUT' : 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(res => res.json()).then(resData => {
          Swal.fire('Berhasil!', resData.message, 'success').then(() => {
            setActiveMenu('facilities'); 
            fetchFacilities(); 
          });
        })
      }
    });
  };

  const handleDeleteFacility = (id) => {
    Swal.fire({
      title: 'Hapus fasilitas ini?', text: "Data tidak bisa dikembalikan!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#e11d48', confirmButtonText: 'Ya, Hapus!'
    }).then((result) => {
      if (result.isConfirmed) {
        fetch(`${import.meta.env.VITE_API_URL}/api/admin/facilities/${id}`, { method: 'DELETE' })
          .then(res => res.json()).then(data => { Swal.fire('Terhapus!', data.message, 'success'); fetchFacilities(); })
      }
    })
  }

  const labBookings = bookings.filter(b => b.nama_lab !== '-')
  const facBookings = bookings.filter(b => b.nama_fasilitas !== '-')

  const pendingLabCount = labBookings.filter(b => b.status_approval === 'menunggu').length
  const pendingFacCount = facBookings.filter(b => b.status_approval === 'menunggu').length

  return (
    <div className="admin-container">
      {activeMenu !== 'home' && (
        <div className="header-navigation">
          <button onClick={() => setActiveMenu('home')} className="sipas-btn secondary">← Kembali ke Menu Utama</button>
        </div>
      )}

      {activeMenu === 'home' && (
        <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="sipas-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', padding: '1.5rem 2.25rem' }}>
            <div className="sipas-card-header" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', color: '#059669', fontWeight: '600' }}>
                  Assalamualaikum, {currentUser?.nama || 'Admin'} ✨
                </h4>
                <h2 className="sipas-title" style={{ fontSize: '1.5rem' }}>Selamat Datang di SIPAS! 👋</h2>
                <p className="sipas-subtitle">Berikut adalah ringkasan inventaris dan peminjaman hari ini.</p>
              </div>
            </div>
          </div>

          <div className="sipas-stats-grid">
            <div className="sipas-stat-card" onClick={() => setActiveMenu('verifikasi')}>
              <div className="stat-icon" style={{ background: '#fee2e2', color: '#e11d48' }}>⏳</div>
              <div className="stat-info">
                <span className="stat-value">{pendingUsers.length}</span>
                <span className="stat-label">Admin Tertunda</span>
              </div>
            </div>

            <div className="sipas-stat-card" onClick={() => setActiveMenu('labs')}>
              <div className="stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>🏫</div>
              <div className="stat-info">
                <span className="stat-value">{labs.length}</span>
                <span className="stat-label">Total Ruangan</span>
              </div>
            </div>

            <div className="sipas-stat-card" onClick={() => setActiveMenu('facilities')}>
              <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>🎒</div>
              <div className="stat-info">
                <span className="stat-value">{facilities.length}</span>
                <span className="stat-label">Total Barang</span>
              </div>
            </div>

            <div className="sipas-stat-card" onClick={() => setActiveMenu('users')}>
              <div className="stat-icon" style={{ background: '#f3e8ff', color: '#9333ea' }}>👥</div>
              <div className="stat-info">
                <span className="stat-value">{allUsers.length}</span>
                <span className="stat-label">Total Pengguna</span>
              </div>
            </div>
          </div>

          <div className="sipas-card">
            <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#1e293b' }}>Akses Cepat & Persetujuan</h3>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
               <button onClick={() => setActiveMenu('approval_labs')} className="sipas-btn primary">
                 🏫 Cek Pengajuan Ruang {pendingLabCount > 0 ? <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px', marginLeft: '4px' }}>{pendingLabCount}</span> : ''}
               </button>
               <button onClick={() => setActiveMenu('approval_facs')} className="sipas-btn success">
                 📦 Cek Pengajuan Barang {pendingFacCount > 0 ? <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px', marginLeft: '4px' }}>{pendingFacCount}</span> : ''}
               </button>
               
               {/* Tombol Cetak Laporan PDF dengan Popup Interaktif */}
               <button onClick={openExportPdfModal} className="sipas-btn secondary" style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}>
                 🖨️ Cetak Laporan PDF
               </button>
            </div>
          </div>
        </div>
      )}

      {activeMenu === 'verifikasi' && (
        <div className="sipas-card animate-fadeIn">
          <div className="sipas-card-header">
            <div className="sipas-card-title-group">
              <div className="sipas-icon unified">⏳</div>
              <div><h2 className="sipas-title">Verifikasi Admin Baru</h2><p className="sipas-subtitle">Persetujuan pendaftaran akun administrator.</p></div>
            </div>
          </div>
          {pendingUsers.length === 0 ? (
            <div className="empty-state">✨ Tidak ada pendaftaran admin baru yang menunggu.</div>
          ) : (
            <div className="sipas-table-container">
              <table className="sipas-table">
                <thead><tr><th>Nama Lengkap</th><th>Username</th><th className="center">Aksi Keputusan</th></tr></thead>
                <tbody>
                  {pendingUsers.map((u) => (
                    <tr key={u.id}>
                      <td><strong>{u.nama}</strong></td><td>{u.username}</td>
                      <td className="center">
                        <div className="action-group">
                          <button onClick={() => handleUserApproval(u.id, 'setujui')} className="sipas-btn success sm">Setujui</button>
                          <button onClick={() => handleUserApproval(u.id, 'tolak')} className="sipas-btn danger sm">Tolak</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeMenu === 'users' && (
        <div className="sipas-card animate-fadeIn">
          <div className="sipas-card-header">
            <div className="sipas-card-title-group">
              <div className="sipas-icon unified">👥</div>
              <div><h2 className="sipas-title">Manajemen Pengguna</h2><p className="sipas-subtitle">Kelola data guru dan administrator sistem.</p></div>
            </div>
            <button onClick={() => openUserModal(null)} className="sipas-btn primary">+ Tambah User</button>
          </div>
          
          <div className="sipas-table-container">
            <table className="sipas-table">
              <thead><tr><th>Nama User</th><th>Username</th><th>Peran</th><th>Status</th><th className="center">Aksi Edit / Hapus</th></tr></thead>
              <tbody>
                {allUsers.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.nama}</strong></td><td>{u.username}</td>
                    <td><span className={`sipas-badge ${u.role === 'admin' ? 'indigo' : 'green'}`}>{u.role}</span></td>
                    <td><span className={`sipas-badge ${u.status_akun === 'aktif' ? 'green' : 'yellow'}`}>{u.status_akun}</span></td>
                    <td className="center">
                      <div className="action-group">
                        <button onClick={() => openUserModal(u)} className="sipas-btn secondary sm">Edit</button>
                        <button onClick={() => handleResetPassword(u.id, u.nama)} className="sipas-btn warning sm">Reset Pass</button>
                        <button onClick={() => handleDeleteUser(u.id)} className="sipas-btn danger sm">Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeMenu === 'labs' && (
        <div className="sipas-card animate-fadeIn">
          <div className="sipas-card-header">
            <div className="sipas-card-title-group">
              <div className="sipas-icon unified">🏫</div>
              <div><h2 className="sipas-title">Kelola Ruangan</h2><p className="sipas-subtitle">Tambah, edit, atau hapus daftar ruangan.</p></div>
            </div>
            <button onClick={() => openLabModal(null)} className="sipas-btn primary">+ Tambah Ruangan</button>
          </div>

          <div className="sipas-table-container">
            <table className="sipas-table">
              <thead>
                <tr>
                  <th>Nama Ruangan</th>
                  <th>Lokasi</th>
                  <th>PIC / Penanggung Jawab</th>
                  <th className="center">Kapasitas</th>
                  <th className="center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {labs.map((l) => (
                  <tr key={l.id}>
                    <td><strong>{l.nama_lab}</strong></td>
                    <td>{l.lokasi ? l.lokasi : '-'}</td>
                    <td>{l.penanggung_jawab ? l.penanggung_jawab : '-'}</td>
                    <td className="center">{l.kapasitas} org</td>
                    <td className="center">
                      <div className="action-group">
                        <button onClick={() => openLabModal(l)} className="sipas-btn secondary sm">Edit</button>
                        <button onClick={() => handleDeleteLab(l.id)} className="sipas-btn danger sm">Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeMenu === 'facilities' && (
        <div className="sipas-card animate-fadeIn">
          <div className="sipas-card-header">
            <div className="sipas-card-title-group">
              <div className="sipas-icon unified">🎒</div>
              <div><h2 className="sipas-title">Kelola Barang Fasilitas</h2><p className="sipas-subtitle">Tambah, edit, dan hapus daftar inventaris fasilitas.</p></div>
            </div>
            <button onClick={() => openFacilityModal(null)} className="sipas-btn primary">+ Tambah Barang</button>
          </div>

          <div className="sipas-table-container">
            <table className="sipas-table">
              <thead>
                <tr>
                  <th>Nama Barang</th>
                  <th>Lokasi</th>
                  <th>Kondisi</th>
                  <th>PIC / Penanggung Jawab</th>
                  <th className="center">Stok</th>
                  <th className="center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {facilities.map((f) => (
                  <tr key={f.id}>
                    <td><strong>{f.nama_fasilitas}</strong></td>
                    <td>{f.lokasi ? f.lokasi : '-'}</td>
                    <td>
                      <span className={`sipas-badge ${f.kondisi === 'Baik' ? 'green' : f.kondisi === 'Rusak Ringan' ? 'yellow' : 'danger'}`}>
                        {f.kondisi ? f.kondisi : '-'}
                      </span>
                    </td>
                    <td>{f.penanggung_jawab ? f.penanggung_jawab : '-'}</td>
                    <td className="center" style={{ color: '#34d399', fontWeight: 'bold' }}>{f.jumlah_tersedia}</td>
                    <td className="center">
                      <div className="action-group">
                        <button onClick={() => openFacilityModal(f)} className="sipas-btn secondary sm">Edit</button>
                        <button onClick={() => handleDeleteFacility(f.id)} className="sipas-btn danger sm">Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeMenu === 'approval_labs' && (
        <div className="sipas-card animate-fadeIn">
          <div className="sipas-card-header">
            <div className="sipas-card-title-group">
              <div className="sipas-icon unified">📋</div>
              <div><h2 className="sipas-title">Persetujuan Pengajuan Ruang</h2><p className="sipas-subtitle">Daftar pengajuan peminjaman laboratorium / kelas.</p></div>
            </div>
          </div>
          {labBookings.length === 0 ? (
            <div className="empty-state">Belum ada pengajuan ruangan.</div>
          ) : (
            <div className="sipas-table-container">
              <table className="sipas-table">
                <thead><tr><th>Peminjam</th><th>Ruangan</th><th>Tanggal</th><th>Waktu</th><th>Keperluan</th><th className="center">Status</th><th className="center">Aksi</th></tr></thead>
                <tbody>
                  {labBookings.map((b) => (
                    <tr key={b.id}>
                      <td><strong>{b.nama_peminjam}</strong></td>
                      <td>Lab: {b.nama_lab}</td>
                      <td>{b.tanggal}</td><td>{b.jam_mulai} - {b.jam_selesai}</td><td>{b.keperluan}</td>
                      <td className="center">
                        <span className={`sipas-badge ${b.status_approval === 'disetujui' ? 'green' : b.status_approval === 'ditolak' ? 'danger' : 'yellow'}`}>
                          {b.status_approval}
                        </span>
                      </td>
                      <td className="center">
                        {b.status_approval === 'menunggu' ? (
                          <div className="action-group">
                            <button onClick={() => handleApproval(b.id, 'disetujui')} className="sipas-btn success sm">Setujui</button>
                            <button onClick={() => promptReject(b.id)} className="sipas-btn danger sm">Tolak</button>
                          </div>
                        ) : b.status_approval === 'disetujui' ? (
                          <div className="action-group">
                            <button onClick={() => promptCancelApproval(b.id)} className="sipas-btn warning sm">Batalkan</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            <button onClick={() => promptCancelApproval(b.id)} className="sipas-btn warning sm">Batalkan</button>
                            {b.alasan_penolakan && (
                              <span style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic', maxWidth: '140px' }} title={b.alasan_penolakan}>
                                Alasan: {b.alasan_penolakan}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeMenu === 'approval_facs' && (
        <div className="sipas-card animate-fadeIn">
          <div className="sipas-card-header">
            <div className="sipas-card-title-group">
              <div className="sipas-icon unified">📦</div>
              <div><h2 className="sipas-title">Persetujuan Pengajuan Barang</h2><p className="sipas-subtitle">Daftar pengajuan peminjaman fasilitas sekolah.</p></div>
            </div>
          </div>
          {facBookings.length === 0 ? (
            <div className="empty-state">Belum ada pengajuan barang.</div>
          ) : (
            <div className="sipas-table-container">
              <table className="sipas-table">
                <thead><tr><th>Peminjam</th><th>Nama Barang</th><th>Lokasi Pakai</th><th>Tanggal & Waktu</th><th className="center">Status</th><th className="center">Aksi</th></tr></thead>
                <tbody>
                  {facBookings.map((b) => (
                    <tr key={b.id}>
                      <td><strong>{b.nama_peminjam}</strong></td>
                      <td>{b.nama_fasilitas} <br/><span style={{fontSize: '11px', color: '#94a3b8'}}>({b.jumlah_pinjam} unit)</span></td>
                      <td>{b.lokasi_penggunaan}</td>
                      <td>{b.tanggal} <br/><span style={{fontSize: '11px', color: '#94a3b8'}}>{b.jam_mulai} - {b.jam_selesai}</span></td>
                      <td className="center">
                        <span className={`sipas-badge ${b.status_approval === 'disetujui' ? 'green' : b.status_approval === 'ditolak' ? 'danger' : 'yellow'}`}>
                          {b.status_approval}
                        </span>
                      </td>
                      <td className="center">
                        {b.status_approval === 'menunggu' ? (
                          <div className="action-group">
                            <button onClick={() => handleApproval(b.id, 'disetujui')} className="sipas-btn success sm">Setujui</button>
                            <button onClick={() => promptReject(b.id)} className="sipas-btn danger sm">Tolak</button>
                          </div>
                        ) : b.status_approval === 'disetujui' ? (
                          <div className="action-group">
                            <button onClick={() => promptCancelApproval(b.id)} className="sipas-btn warning sm">Batalkan</button>
                          </div>
                        ) : (
                          <div style={{ style: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            <button onClick={() => promptCancelApproval(b.id)} className="sipas-btn warning sm">Batalkan</button>
                            {b.alasan_penolakan && (
                              <span style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic', maxWidth: '140px' }} title={b.alasan_penolakan}>
                                Alasan: {b.alasan_penolakan}
                              </span>
                            )}
                          </div>
                        )}
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
  )
}