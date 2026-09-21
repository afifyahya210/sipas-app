import { useState, useRef, useEffect } from 'react'
import Swal from 'sweetalert2'

export default function Navbar({ currentUser, setCurrentUser, onHomeClick }) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [isRinging, setIsRinging] = useState(false) // State untuk trigger animasi lonceng
  
  const dropdownRef = useRef(null)
  const notifRef = useRef(null)

  useEffect(() => {
    if (currentUser && currentUser.id) {
      fetchNotifs()
      const interval = setInterval(fetchNotifs, 10000);
      return () => clearInterval(interval);
    }
  }, [currentUser])

  const fetchNotifs = () => {
    if (!currentUser || !currentUser.id) return;
    fetch(`${import.meta.env.VITE_API_URL}/api/notifications/${currentUser.id}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setNotifications(data);
      })
      .catch(() => {});
  }

  const markNotifsAsRead = () => {
    // Trigger animasi lonceng berdering
    setIsRinging(true);
    setTimeout(() => setIsRinging(false), 600); // Matikan class animasi setelah 0.6 detik

    setNotifOpen(!notifOpen);
    if (!notifOpen && currentUser && currentUser.id) {
      fetch(`${import.meta.env.VITE_API_URL}/api/notifications/read/${currentUser.id}`, { method: 'PUT' })
        .then(() => {
          setNotifications(notifications.map(n => ({ ...n, dibaca: 1 })));
        })
        .catch(() => {});
    }
  }

  const unreadCount = notifications.filter(n => n.dibaca === 0).length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setDropdownOpen(false)
      if (notifRef.current && !notifRef.current.contains(event.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // --- POPUP MODAL: GANTI PASSWORD ---
  const handleChangePassword = () => {
    Swal.fire({
      title: 'Ganti Password',
      html: `
        <div style="text-align: left; display: flex; flex-direction: column; gap: 12px; margin-top: 10px;">
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 4px;">Password Lama</label>
            <input id="swal-old-pwd" type="password" class="swal2-input" placeholder="Masukkan password saat ini" style="margin: 0; width: 100%; height: 42px; font-size: 14px; border-radius: 8px;">
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 4px;">Password Baru</label>
            <input id="swal-new-pwd" type="password" class="swal2-input" placeholder="Masukkan password baru" style="margin: 0; width: 100%; height: 42px; font-size: 14px; border-radius: 8px;">
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Update Password',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#94a3b8',
      preConfirm: () => {
        const oldPwd = document.getElementById('swal-old-pwd').value;
        const newPwd = document.getElementById('swal-new-pwd').value;
        if (!oldPwd || !newPwd) {
          Swal.showValidationMessage('Kedua kolom password wajib diisi!');
          return false;
        }
        return { password_lama: oldPwd, password_baru: newPwd };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const data = result.value;
        fetch(`${import.meta.env.VITE_API_URL}/api/users/${currentUser.id}/change-password`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        .then(async res => {
          const resData = await res.json();
          if (!res.ok) throw new Error(resData.message || resData.error);
          return resData;
        })
        .then(resData => Swal.fire('Berhasil!', resData.message, 'success'))
        .catch(err => Swal.fire('Gagal', err.message, 'error'));
      }
    })
  }

  // --- POPUP MODAL: GANTI / HAPUS FOTO PROFIL ---
  const handleChangePhoto = () => {
    const executePhotoUpdate = (fotoData) => {
      fetch(`${import.meta.env.VITE_API_URL}/api/users/${currentUser.id}/change-photo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foto_profil: fotoData })
      })
      .then(async res => {
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.message || resData.error);
        return resData;
      })
      .then(resData => {
        Swal.fire('Berhasil!', fotoData ? resData.message : 'Foto profil berhasil dihapus!', 'success');
        setCurrentUser({ ...currentUser, foto_profil: fotoData });
      })
      .catch(err => Swal.fire('Gagal Menyimpan', err.message, 'error'));
    };

    Swal.fire({
      title: 'Unggah Foto Profil',
      html: `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 15px; margin-top: 10px;">
          <div style="width: 100px; height: 100px; border-radius: 50%; overflow: hidden; border: 2px solid #cbd5e1; display: flex; align-items: center; justify-content: center; background: #e2e8f0; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <img id="swal-photo-preview" src="${currentUser.foto_profil || ''}" style="width: 100%; height: 100%; object-fit: cover; display: ${currentUser.foto_profil ? 'block' : 'none'};" />
            <span id="swal-photo-placeholder" style="font-size: 32px; font-weight: bold; color: #64748b; display: ${currentUser.foto_profil ? 'none' : 'block'};">${currentUser.nama ? currentUser.nama.charAt(0).toUpperCase() : 'U'}</span>
          </div>
          
          <!-- Tombol Custom "Choose File" -->
          <div>
            <button type="button" onclick="document.getElementById('swal-file-input').click()" style="background: #ffffff; border: 1px solid #cbd5e1; padding: 8px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; color: #334155; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: all 0.2s;">
              📁 Choose File
            </button>
            <input type="file" id="swal-file-input" accept="image/*" style="display: none;">
          </div>
        </div>
      `,
      didOpen: () => {
        const fileInput = document.getElementById('swal-file-input');
        const previewImg = document.getElementById('swal-photo-preview');
        const placeholder = document.getElementById('swal-photo-placeholder');

        if (fileInput) {
          fileInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = function(e) {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
                placeholder.style.display = 'none';
              }
              reader.readAsDataURL(file);
            }
          });
        }
      },
      showCancelButton: true,
      showDenyButton: !!currentUser.foto_profil,
      confirmButtonText: 'Simpan Foto',
      denyButtonText: '🗑️ Hapus Foto',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#16a34a',
      denyButtonColor: '#e11d48',
      cancelButtonColor: '#94a3b8',
      preConfirm: () => {
        const fileInput = document.getElementById('swal-file-input');
        const file = fileInput ? fileInput.files[0] : null;
        if (!file) {
          Swal.showValidationMessage('Silakan pilih gambar terlebih dahulu!');
          return false;
        }
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve({ foto_profil: e.target.result });
          reader.readAsDataURL(file);
        });
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        executePhotoUpdate(result.value.foto_profil);
      } else if (result.isDenied) {
        Swal.fire({
          title: 'Hapus Foto Profil?',
          text: "Foto akan dihapus dan kembali menggunakan inisial nama Anda.",
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#e11d48',
          cancelButtonColor: '#94a3b8',
          confirmButtonText: 'Ya, Hapus',
          cancelButtonText: 'Batal'
        }).then((confirmDel) => {
          if (confirmDel.isConfirmed) {
            executePhotoUpdate(null);
          }
        });
      }
    });
  }

  // --- POPUP MODAL: EDIT PROFIL ---
  const handleEditProfile = () => {
    setDropdownOpen(false) 
    
    Swal.fire({
      title: 'Pengaturan Profil',
      html: `
        <div style="text-align: left; display: flex; flex-direction: column; gap: 12px; margin-top: 10px;">
          
          <div style="display: flex; justify-content: center; margin-bottom: 4px;">
            <div style="width: 76px; height: 76px; border-radius: 50%; overflow: hidden; background: #e2e8f0; border: 2px solid #cbd5e1; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.08);">
               ${currentUser.foto_profil 
                  ? `<img src="${currentUser.foto_profil}" style="width:100%; height:100%; object-fit:cover;" />` 
                  : `<span style="font-size: 28px; font-weight: bold; color: #64748b;">${currentUser.nama ? currentUser.nama.charAt(0).toUpperCase() : 'U'}</span>`
               }
            </div>
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 4px;">Nama Lengkap</label>
            <input id="swal-profile-nama" class="swal2-input" value="${currentUser.nama || ''}" style="margin: 0; width: 100%; height: 42px; font-size: 14px; border-radius: 8px;">
          </div>
          
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 4px;">Username</label>
            <input id="swal-profile-username" class="swal2-input" value="${currentUser.username || ''}" style="margin: 0; width: 100%; height: 42px; font-size: 14px; border-radius: 8px;">
          </div>

          <div style="display: flex; gap: 10px; margin-top: 5px;">
             <button type="button" id="btn-swal-ganti-foto" style="flex: 1; height: 40px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; color: #16a34a; font-weight: 600; cursor: pointer; transition: all 0.2s;">🖼️ Ganti Foto</button>
             <button type="button" id="btn-swal-ganti-pwd" style="flex: 1; height: 40px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; color: #e11d48; font-weight: 600; cursor: pointer; transition: all 0.2s;">🔒 Ganti Password</button>
          </div>
        </div>
      `,
      didOpen: () => {
        const pwdBtn = document.getElementById('btn-swal-ganti-pwd');
        const fotoBtn = document.getElementById('btn-swal-ganti-foto');
        
        if (pwdBtn) {
          pwdBtn.addEventListener('click', () => {
            Swal.close(); 
            setTimeout(() => handleChangePassword(), 300); 
          });
        }
        if (fotoBtn) {
          fotoBtn.addEventListener('click', () => {
            Swal.close(); 
            setTimeout(() => handleChangePhoto(), 300); 
          });
        }
      },
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Simpan Profil',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#94a3b8',
      preConfirm: () => {
        const namaEl = document.getElementById('swal-profile-nama');
        const usernameEl = document.getElementById('swal-profile-username');
        const nama = namaEl ? namaEl.value : '';
        const username = usernameEl ? usernameEl.value : '';

        if (!nama || !username) {
          Swal.showValidationMessage('Nama dan Username tidak boleh kosong!');
          return false;
        }

        return { nama, username, foto_profil: currentUser.foto_profil };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const data = result.value;
        fetch(`${import.meta.env.VITE_API_URL}/api/users/${currentUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        .then(async res => {
          const resData = await res.json();
          if (!res.ok) throw new Error(resData.message || resData.error);
          return resData;
        })
        .then(resData => {
          Swal.fire('Berhasil!', resData.message, 'success');
          setCurrentUser({ ...currentUser, nama: data.nama, username: data.username });
        })
        .catch(err => Swal.fire('Gagal Menyimpan', err.message, 'error'));
      }
    })
  }

  // --- POPUP MODAL: LOGOUT ---
  const handleLogoutConfirm = () => {
    setDropdownOpen(false)
    Swal.fire({
      title: 'Keluar dari Sistem?',
      text: 'Anda harus login kembali untuk mengakses layanan SIPAS.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Logout',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        setCurrentUser(null)
        Swal.fire({ title: 'Berhasil Logout', text: 'Sampai jumpa kembali!', icon: 'success', timer: 1500, showConfirmButton: false })
      }
    })
  }

  return (
    <>
      {/* KEYFRAME ANIMASI LONCENG BERDERING */}
      <style>
        {`
          @keyframes bellRing {
            0% { transform: rotate(0deg) scale(1); }
            20% { transform: rotate(25deg) scale(1.15); }
            40% { transform: rotate(-20deg) scale(1.15); }
            60% { transform: rotate(15deg) scale(1.15); }
            80% { transform: rotate(-10deg) scale(1.15); }
            100% { transform: rotate(0deg) scale(1); }
          }
          .animate-bell {
            animation: bellRing 0.6s ease-in-out;
          }
        `}
      </style>

      <nav className="sipas-navbar animate-fadeIn">
        <div className="sipas-navbar-container">
          
          <div className="sipas-brand" onClick={onHomeClick} style={{ cursor: 'pointer' }}>
            <div className="sipas-logo-wrapper">
              {/* LOGO SEKOLAH ASLI ANDA DIKEMBALIKAN */}
              <img src="/logo-sipas.png" alt="Logo SIPAS" className="sipas-logo-img" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
              <div className="sipas-logo-fallback" style={{ display: 'none' }}>🏫</div>
            </div>
            <div className="sipas-brand-text">
              <span className="sipas-brand-title">SIPAS</span>
              <span className="sipas-brand-subtitle">Sistem Informasi Pinjam Aset Sekolah</span>
            </div>
          </div>

          {currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              
              {/* NOTIFIKASI DENGAN ANIMASI KLIK */}
              <div className="sipas-user-section" ref={notifRef}>
                <button 
                  className={isRinging ? 'animate-bell' : ''}
                  onClick={markNotifsAsRead}
                  style={{
                    position: 'relative', width: '38px', height: '38px', borderRadius: '50%',
                    background: notifOpen ? '#e2e8f0' : '#f1f5f9', border: '1px solid #cbd5e1', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.1rem',
                    transition: 'background 0.3s ease',
                    boxShadow: notifOpen ? 'inset 0 2px 4px rgba(0,0,0,0.1)' : '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                >
                  🔔
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute', top: '-2px', right: '-2px', background: '#ef4444',
                      color: 'white', fontSize: '0.65rem', fontWeight: 'bold', width: '18px', height: '18px',
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white'
                    }}>
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="sipas-dropdown-menu animate-fadeIn" style={{ width: '280px', right: '-40px' }}>
                    <div className="sipas-dropdown-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Notifikasi Progres</span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Terbaru</span>
                    </div>
                    <div className="sipas-dropdown-divider" />
                    <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', padding: '1rem' }}>Belum ada pemberitahuan.</p>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', background: n.dibaca === 0 ? '#f8fafc' : 'transparent' }}>
                            <p style={{ fontSize: '0.75rem', color: '#1e293b', margin: 0, lineHeight: 1.3 }}>{n.pesan}</p>
                            <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* PROFIL & DROPDOWN */}
              <div className="sipas-user-section" ref={dropdownRef}>
                <div 
                  className={`sipas-profile-pill ${dropdownOpen ? 'active' : ''}`}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <div className="sipas-avatar" style={{ padding: 0, overflow: 'hidden' }}>
                    {currentUser.foto_profil ? (
                      <img src={currentUser.foto_profil} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      currentUser.nama ? currentUser.nama.charAt(0).toUpperCase() : 'U'
                    )}
                  </div>
                  
                  <div className="sipas-user-info">
                    <span className="sipas-user-name">{currentUser.nama}</span>
                    <span className={`sipas-role-tag ${currentUser.role === 'admin' ? 'role-admin' : 'role-guru'}`}>
                      {currentUser.role === 'admin' ? 'Administrator' : 'Guru'}
                    </span>
                  </div>
                  <span className="sipas-chevron">{dropdownOpen ? '▲' : '▼'}</span>
                </div>

                {dropdownOpen && (
                  <div className="sipas-dropdown-menu animate-fadeIn">
                    <div className="sipas-dropdown-header">
                      <p className="sipas-dropdown-user">{currentUser.nama}</p>
                      <p className="sipas-dropdown-username">@{currentUser.username}</p>
                    </div>
                    <div className="sipas-dropdown-divider" />
                    
                    <button className="sipas-dropdown-item primary-item" onClick={handleEditProfile}>
                      <span className="dropdown-icon">⚙️</span> Pengaturan Profil
                    </button>

                    <div className="sipas-dropdown-divider" />

                    <button className="sipas-dropdown-item danger-item" onClick={handleLogoutConfirm}>
                      <span className="dropdown-icon">🚪</span> Keluar / Logout
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </nav>
    </>
  )
}