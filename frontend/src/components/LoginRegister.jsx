import React from 'react'
import logoImage from '../assets/logo-sipas.png'

export default function LoginRegister({
  isRegistering, setIsRegistering,
  handleLogin, handleRegister,
  usernameInput, setUsernameInput,
  passwordInput, setPasswordInput,
  namaInput, setNamaInput,
  roleInput, setRoleInput
}) {
  return (
    <div className="login-page-wrapper">
      <div className="login-glass-card">
        
        {/* LOGO GAMBAR */}
        <div className="login-logo overflow-hidden flex items-center justify-center">
          <img src={logoImage} alt="Logo SIPAS" className="w-full h-full object-contain" />
        </div>
        
        <h2 className="login-title">
          {isRegistering ? 'Buat Akun Baru' : 'Selamat Datang'}
        </h2>
        <p className="login-subtitle">
          {isRegistering 
            ? 'Daftarkan diri Anda untuk mengakses SIPAS.' 
            : 'Sistem Informasi Peminjaman Aset Sekolah (SIPAS)'}
        </p>

        <form onSubmit={isRegistering ? handleRegister : handleLogin}>
          {isRegistering && (
            <div className="login-form-group animate-fadeIn">
              <label>Nama Lengkap</label>
              <input 
                type="text" 
                className="login-input" 
                placeholder="Masukkan nama lengkap"
                value={namaInput} 
                onChange={(e) => setNamaInput(e.target.value)} 
                required 
              />
            </div>
          )}

          <div className="login-form-group">
            <label>Username</label>
            <input 
              type="text" 
              className="login-input" 
              placeholder="Masukkan username"
              value={usernameInput} 
              onChange={(e) => setUsernameInput(e.target.value)} 
              required 
            />
          </div>

          <div className="login-form-group">
            <label>Password</label>
            <input 
              type="password" 
              className="login-input" 
              placeholder="••••••••"
              value={passwordInput} 
              onChange={(e) => setPasswordInput(e.target.value)} 
              required 
            />
          </div>

          {isRegistering && (
            <div className="login-form-group animate-fadeIn">
              <label>Daftar Sebagai</label>
              <select 
                className="login-input" 
                value={roleInput} 
                onChange={(e) => setRoleInput(e.target.value)}
              >
                <option value="guru">Guru</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          )}

          <button type="submit" className="login-btn-submit">
            {isRegistering ? 'Daftar Sekarang' : 'Masuk Sistem'}
          </button>
        </form>

        <div className="login-toggle-text">
          {isRegistering ? 'Sudah memiliki akun?' : 'Belum memiliki akun?'}
          <span 
            className="login-toggle-link"
            onClick={() => {
              setIsRegistering(!isRegistering)
              setUsernameInput('')
              setPasswordInput('')
              setNamaInput('')
            }}
          >
            {isRegistering ? 'Masuk di sini' : 'Daftar sekarang'}
          </span>
        </div>

      </div>
    </div>
  )
}