import React, { useEffect, useRef, useState, FormEvent } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams, Navigate } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Award,
  Box,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Coins,
  CreditCard,
  Download,
  Flame,
  Globe,
  Home,
  Info,
  Layers,
  LogIn,
  LogOut,
  Menu,
  Plus,
  Printer,
  QrCode,
  Radio,
  Search,
  ShieldAlert,
  ShieldCheck,
  SmartphoneNfc,
  Sparkles,
  Tag,
  Target,
  Truck,
  UserCheck,
  UserRound,
  Users,
  Wallet,
  X
} from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { isWebNfcSupported, readSingleNfcTag, writeNfcTag, NTAG213_SPEC } from './lib/nfc'
import { generateQrDataUrl, generateQrSvg } from './lib/qr'
import { CELENGAN_CATALOG } from './lib/catalog'
import type { PiggyBank, Profile, SavingsEntry, SavingsGoal, PiggyBankOrder, FamilyRole } from './types'

// Format Rupiah Indonesia
const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n)

// Format Tanggal Indonesia
const dateText = (s: string) =>
  new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(s))

// Terjemahan Pesan Error Supabase
const errorText = (e: unknown) => {
  if (e instanceof Error) {
    if (e.message.includes('Invalid login credentials')) {
      return 'Email atau kata sandi tidak cocok. Silakan periksa kembali.'
    }
    if (e.message.includes('Email not confirmed')) {
      return 'Email belum dikonfirmasi. Periksa kotak masuk atau spam email Anda.'
    }
    if (e.message.includes('User already registered')) {
      return 'Email sudah terdaftar. Silakan langsung masuk ke akun Anda.'
    }
    return e.message
  }
  return 'Terjadi kesalahan sistem. Silakan coba kembali.'
}

// ------------------------------------------------------------------------------
// Komponen UI Dasar & Brand
// ------------------------------------------------------------------------------
function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className={`brand ${light ? 'brand-light' : ''}`}>
      <span className="brand-icon-box">
        <Wallet size={20} />
      </span>
      <div>
        <span>
          Chillbank<span className="brand-tag">Family</span>
        </span>
        <span className="brand-sub">Smart Celengan NFC & QR</span>
      </div>
    </Link>
  )
}

function Button({
  children,
  kind = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: 'primary' | 'secondary' | 'ghost' | 'white'; className?: string }) {
  return (
    <button className={`button button-${kind} ${className}`} {...props}>
      {children}
    </button>
  )
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
    </label>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <section className="modal">
        <div className="modal-handle-bar" />
        <div className="modal-heading">
          <h3>{title}</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Tutup">
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}

function EmptyState({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="empty-state">
      {icon}
      <b>{title}</b>
      <p>{text}</p>
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  )
}

// ------------------------------------------------------------------------------
// Modal Scanner NFC & QR Code (Global)
// ------------------------------------------------------------------------------
function ScanModal({ onClose, onScanSuccess }: { onClose: () => void; onScanSuccess: (serial: string) => void }) {
  const [tab, setTab] = useState<'nfc' | 'qr' | 'manual'>('nfc')
  const [nfcScanning, setNfcScanning] = useState(false)
  const [nfcStatus, setNfcStatus] = useState('')
  const [manualSerial, setManualSerial] = useState('')
  const [hasCamera, setHasCamera] = useState(true)
  const [cameraError, setCameraError] = useState('')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const nfcSupported = isWebNfcSupported()

  // Handle Scan NFC
  async function startNfcScan() {
    setNfcScanning(true)
    setNfcStatus('Mendengarkan tag NFC NTAG213... Dekatkan HP ke celengan.')
    try {
      const res = await readSingleNfcTag(25000)
      setNfcStatus(`Tag NFC terdeteksi: ${res.serial}`)
      setTimeout(() => {
        onScanSuccess(res.serial)
        onClose()
      }, 700)
    } catch (err: any) {
      setNfcStatus(err.message || 'Gagal membaca tag NFC.')
    } finally {
      setNfcScanning(false)
    }
  }

  // Handle Camera Start for QR
  useEffect(() => {
    if (tab === 'qr') {
      let isMounted = true
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
          if (!isMounted) {
            stream.getTracks().forEach((t) => t.stop())
            return
          }
          streamRef.current = stream
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            videoRef.current.play().catch(() => {})
          }
        })
        .catch((err) => {
          setHasCamera(false)
          setCameraError('Kamera tidak dapat diakses atau izin ditolak.')
        })

      return () => {
        isMounted = false
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop())
          streamRef.current = null
        }
      }
    }
  }, [tab])

  return (
    <Modal title="Pindai Celengan Chillbank" onClose={onClose}>
      <div className="scanner-toggle">
        <button className={tab === 'nfc' ? 'active' : ''} onClick={() => setTab('nfc')}>
          <SmartphoneNfc size={17} /> Tap NFC
        </button>
        <button className={tab === 'qr' ? 'active' : ''} onClick={() => setTab('qr')}>
          <Camera size={17} /> Kamera QR
        </button>
        <button className={tab === 'manual' ? 'active' : ''} onClick={() => setTab('manual')}>
          <Tag size={17} /> Input Serial
        </button>
      </div>

      {tab === 'nfc' && (
        <div className="nfc-tap-zone">
          <div className="nfc-pulse-ring">
            <Radio size={36} />
          </div>
          <h3>Dekatkan Smartphone ke Chip Celengan</h3>
          <p className="fine-print">
            Chip NFC NTAG213 terletak pada tutup atas atau di dekat logo celengan. Pastikan fitur NFC pada smartphone Anda sudah aktif.
          </p>

          {nfcSupported ? (
            <Button
              kind="primary"
              disabled={nfcScanning}
              onClick={startNfcScan}
              style={{ marginTop: 10 }}
            >
              <SmartphoneNfc size={18} />
              {nfcScanning ? 'Memindai NFC...' : 'Mulai Pindai NFC'}
            </Button>
          ) : (
            <div className="notice" style={{ marginTop: 10 }}>
              <CircleHelp size={20} />
              <div>
                <b>Browser tidak mendukung Web NFC API</b>
                <p>Web NFC API umumnya aktif di Google Chrome Android. Untuk iPhone / Laptop, gunakan tab <b>Kamera QR</b> di atas.</p>
              </div>
            </div>
          )}

          {nfcStatus && <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', marginTop: 8 }}>{nfcStatus}</p>}
        </div>
      )}

      {tab === 'qr' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {hasCamera ? (
            <div className="qr-camera-box">
              <video ref={videoRef} playsInline muted autoPlay />
              <div className="qr-viewfinder">
                <div className="qr-laser" />
              </div>
            </div>
          ) : (
            <div className="notice">
              <CircleHelp size={20} />
              <div>
                <b>Kamera tidak aktif</b>
                <p>{cameraError || 'Gunakan input serial manual di bawah ini.'}</p>
              </div>
            </div>
          )}

          <p className="fine-print" style={{ textAlign: 'center' }}>
            Arahkan kamera ke stiker QR Code cadangan yang tertempel pada dasar celengan fisik.
          </p>
        </div>
      )}

      {tab === 'manual' && (
        <form
          className="stack-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (manualSerial.trim()) {
              onScanSuccess(manualSerial.trim().toUpperCase())
              onClose()
            }
          }}
        >
          <Field
            label="Nomor Seri Celengan"
            placeholder="Contoh: CBF-001 atau CBF-8821"
            value={manualSerial}
            onChange={(e) => setManualSerial(e.target.value.toUpperCase())}
            required
          />
          <Button type="submit">Buka Celengan</Button>
        </form>
      )}

      <div style={{ background: 'var(--bg-page)', padding: 12, borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <b>Spesifikasi Chip:</b> {NTAG213_SPEC.chip} ({NTAG213_SPEC.userMemory} Memory, {NTAG213_SPEC.operatingFrequency})
      </div>
    </Modal>
  )
}

// ------------------------------------------------------------------------------
// Modal QR Code Generator & Cetak Stiker
// ------------------------------------------------------------------------------
function QrStickerModal({ bank, onClose }: { bank: PiggyBank; onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState('')
  const [svgString, setSvgString] = useState('')

  const url = `${window.location.origin}/c/${encodeURIComponent(bank.serial)}`

  useEffect(() => {
    generateQrDataUrl(url).then(setDataUrl)
    generateQrSvg(url).then(setSvgString)
  }, [url])

  function printSticker() {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html>
        <head>
          <title>Stiker QR Celengan - ${bank.serial}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 20px; }
            .sticker { display: inline-block; border: 2px dashed #059669; padding: 16px; border-radius: 12px; }
            img { width: 180px; height: 180px; }
            h2 { margin: 8px 0 4px; font-size: 16px; color: #064e3b; }
            p { margin: 0; font-size: 12px; color: #555; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="sticker">
            <img src="${dataUrl}" alt="QR" />
            <h2>${bank.name}</h2>
            <p>${bank.serial}</p>
            <p style="margin-top: 6px; font-size: 10px; color: #888;">CHILLBANK FAMILY • NFC NTAG213 & QR</p>
          </div>
          <script>window.onload = function() { window.print(); }<\/script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <Modal title={`Stiker QR: ${bank.name}`} onClose={onClose}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {dataUrl ? (
          <div style={{ padding: 12, background: '#ffffff', borderRadius: 16, border: '2px solid var(--primary-border)', boxShadow: 'var(--shadow-sm)' }}>
            <img src={dataUrl} alt={`QR Code ${bank.serial}`} style={{ width: 200, height: 200, display: 'block' }} />
          </div>
        ) : (
          <p>Membuat QR Code...</p>
        )}

        <div className="celengan-serial">{bank.serial}</div>
        <p className="fine-print">
          Stiker QR ini dapat dicetak dan ditempelkan di celengan fisik sebagai fallback jika smartphone keluarga belum memiliki NFC.
        </p>

        <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 8 }}>
          <Button kind="secondary" className="button-full" onClick={printSticker}>
            <Printer size={16} /> Cetak Stiker
          </Button>
          {dataUrl && (
            <a href={dataUrl} download={`qr-chillbank-${bank.serial}.png`} className="button button-primary button-full">
              <Download size={16} /> Unduh Gambar
            </a>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ------------------------------------------------------------------------------
// AppShell: Navigation & Layout
// ------------------------------------------------------------------------------
function AppShell({
  children,
  profile,
  onLogout,
  onOpenScan,
}: {
  children: React.ReactNode
  profile: Profile | null
  onLogout: () => void
  onOpenScan: () => void
}) {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => setOpen(false), [location.pathname])

  const isAdmin = profile?.role === 'admin'

  const nav = isAdmin
    ? [
        { to: '/admin', label: 'Dashboard Overview', icon: ShieldCheck, end: true },
        { to: '/admin/pesanan', label: 'Pesanan Masuk', icon: Box },
        { to: '/admin/celengan', label: 'Inventaris Celengan', icon: Wallet },
        { to: '/admin/users', label: 'Kelola Pengguna', icon: Users },
        { to: '/app/profil', label: 'Profil Admin', icon: UserRound },
      ]
    : [
        { to: '/app', label: 'Ringkasan', icon: Home, end: true },
        { to: '/app/celengan', label: 'Celengan Keluarga', icon: Wallet },
        { to: '/app/target', label: 'Target Tabungan', icon: Target },
        { to: '/app/riwayat', label: 'Mutasi Transaksi', icon: Coins },
        { to: '/app/pesanan', label: 'Pesan Celengan', icon: Box },
        { to: '/app/profil', label: 'Profil Anggota', icon: UserRound },
      ]

  const roleLabel: Record<FamilyRole, string> = {
    parent: 'Kepala Keluarga / Orang Tua',
    child: 'Anggota / Anak',
    admin: 'Administrator',
    member: 'Anggota Keluarga',
  }

  return (
    <div className="app-layout">
      {/* Desktop & Mobile Slide-in Sidebar */}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <Brand />

        <div className="side-caption">
          {isAdmin ? 'NAVIGASI ADMINISTRATOR' : 'NAVIGASI KELUARGA'}
        </div>
        <nav className="side-nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}

          <button
            type="button"
            className="side-link"
            style={{ color: 'var(--primary)', cursor: 'pointer', border: '1px dashed var(--primary-border)', marginTop: 8 }}
            onClick={onOpenScan}
          >
            <SmartphoneNfc size={18} />
            Pindai NFC / QR
          </button>

          {isAdmin && (
            <Link
              to="/"
              className="side-link"
              style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: 4 }}
            >
              <Globe size={16} />
              Pratinjau Web Publik
            </Link>
          )}
        </nav>

        <div className="sidebar-bottom">
          <div className="mini-profile">
            <span className="avatar">{(profile?.full_name || 'C').slice(0, 1).toUpperCase()}</span>
            <div className="mini-profile-text">
              <b>{profile?.full_name || 'Anggota Chillbank'}</b>
              <small>{roleLabel[profile?.role || 'parent']}</small>
            </div>
          </div>
          <button className="button button-ghost button-small button-full" onClick={onLogout}>
            <LogOut size={16} /> Keluar Akun
          </button>
        </div>
      </aside>

      {open && <button className="mobile-scrim" aria-label="Tutup Menu" onClick={() => setOpen(false)} />}

      {/* Main Content Area */}
      <main className="app-main">
        <header className="app-topbar">
          <div className="topbar-left">
            <button className="mobile-menu-btn" onClick={() => setOpen(!open)} aria-label="Buka Menu">
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
            <span className="eyebrow" style={{ margin: 0 }}>
              <span className="eyebrow-dot" /> {isAdmin ? 'Chillbank Admin Panel' : 'Chillbank Family'}
            </span>
          </div>

          <div className="topbar-right">
            <Button kind="secondary" className="button-small" onClick={onOpenScan}>
              <SmartphoneNfc size={15} /> Tap NFC
            </Button>
            <div className="online-chip">
              <span className="online-dot" /> Cloud Aktif
            </div>
          </div>
        </header>

        <div className="page-content">{children}</div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        {isAdmin ? (
          <>
            <NavLink to="/admin" end className={({ isActive }) => `bottom-tab ${isActive ? 'active' : ''}`}>
              <ShieldCheck size={20} />
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/admin/pesanan" className={({ isActive }) => `bottom-tab ${isActive ? 'active' : ''}`}>
              <Box size={20} />
              <span>Pesanan</span>
            </NavLink>

            <button className="bottom-scan-btn" onClick={onOpenScan} aria-label="Pindai Celengan">
              <SmartphoneNfc size={22} />
            </button>

            <NavLink to="/admin/celengan" className={({ isActive }) => `bottom-tab ${isActive ? 'active' : ''}`}>
              <Wallet size={20} />
              <span>Celengan</span>
            </NavLink>
            <NavLink to="/admin/users" className={({ isActive }) => `bottom-tab ${isActive ? 'active' : ''}`}>
              <Users size={20} />
              <span>Pengguna</span>
            </NavLink>
          </>
        ) : (
          <>
            <NavLink to="/app" end className={({ isActive }) => `bottom-tab ${isActive ? 'active' : ''}`}>
              <Home size={20} />
              <span>Beranda</span>
            </NavLink>
            <NavLink to="/app/celengan" className={({ isActive }) => `bottom-tab ${isActive ? 'active' : ''}`}>
              <Wallet size={20} />
              <span>Celengan</span>
            </NavLink>

            <button className="bottom-scan-btn" onClick={onOpenScan} aria-label="Pindai Celengan">
              <SmartphoneNfc size={22} />
            </button>

            <NavLink to="/app/target" className={({ isActive }) => `bottom-tab ${isActive ? 'active' : ''}`}>
              <Target size={20} />
              <span>Target</span>
            </NavLink>
            <NavLink to="/app/profil" className={({ isActive }) => `bottom-tab ${isActive ? 'active' : ''}`}>
              <UserRound size={20} />
              <span>Profil</span>
            </NavLink>
          </>
        )}
      </nav>
    </div>
  )
}

// ------------------------------------------------------------------------------
// Landing Page (Public Layout)
// ------------------------------------------------------------------------------
function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-shell">
      <header className="public-nav">
        <Brand />
        <nav className="public-nav-links">
          <a href="#fitur">Fitur Unggulan</a>
          <a href="#katalog">Celengan Fisik</a>
          <a href="#nfc-spec">NFC NTAG213</a>
          <a href="#cara-kerja">Cara Kerja</a>
        </nav>
        <div className="nav-actions">
          <Link to="/login" className="button button-ghost button-small">
            Masuk
          </Link>
          <Link to="/register" className="button button-primary button-small">
            Mulai Menabung <ChevronRight size={16} />
          </Link>
        </div>
      </header>
      {children}
      <footer style={{ borderTop: '1px solid var(--border-light)', padding: '36px 24px', background: '#ffffff', textAlign: 'center' }}>
        <Brand />
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '14px 0 8px' }}>
          © {new Date().getFullYear()} Chillbank Family. Solusi celengan fisik pintar keluarga dengan Web NFC & QR Fallback.
        </p>
        <p className="fine-print">Catatan tabungan pribadi & keluarga, bukan lembaga penyimpanan perbankan resmi.</p>
      </footer>
    </div>
  )
}

function HomePage({ onOpenScan }: { onOpenScan: () => void }) {
  return (
    <PublicLayout>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-dot" /> PLATFORM FINANSIAL KELUARGA
          </div>
          <h1>
            Menabung Bersama, Dekat dalam <span>Satu Sentuhan.</span>
          </h1>
          <p className="hero-lead">
            Hubungkan celengan fisik keluarga ke catatan tabungan digital. Dilengkapi sensor chip NFC NTAG213 dan QR Code cadangan untuk melatih kebiasaan finansial anak dan orang tua.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="button button-primary button-large">
              Buka Akun Keluarga Gratis <ChevronRight size={18} />
            </Link>
            <Button kind="secondary" className="button-large" onClick={onOpenScan}>
              <SmartphoneNfc size={18} /> Pindai Celengan
            </Button>
          </div>
          <div className="trust-row">
            <span>
              <CheckCircle2 size={16} /> Chip NTAG213 Original
            </span>
            <span>
              <CheckCircle2 size={16} /> QR Code Fallback
            </span>
            <span>
              <CheckCircle2 size={16} /> Supabase RLS Protected
            </span>
          </div>
        </div>

        <div className="hero-visual">
          <div className="celengan-card-3d">
            <div className="celengan-slot" />
            <div className="celengan-nfc-badge">
              <SmartphoneNfc size={14} /> NFC NTAG213 INSIDE
            </div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--forest)', margin: '4px 0' }}>Chillbank Smart</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Celengan Pintar Keluarga</p>
            <div className="celengan-serial">CBF-NFC-2026</div>
          </div>
        </div>
      </section>

      {/* Fitur Unggulan */}
      <section id="fitur" style={{ padding: '60px 24px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div className="eyebrow">INOVASI TABUNGAN KELUARGA</div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Teknologi Pintar untuk Masa Depan Anak</h2>
        </div>
        <div className="stat-grid">
          <div className="stat-card">
            <span className="stat-icon">
              <SmartphoneNfc />
            </span>
            <div>
              <b>NFC NTAG213</b>
              <small>Tap smartphone ke celengan untuk mencatat saldo seketika tanpa input manual.</small>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon stat-icon-amber">
              <QrCode />
            </span>
            <div>
              <b>QR Code Fallback</b>
              <small>Pindai stiker QR beresolusi tinggi di dasar celengan untuk perangkat non-NFC.</small>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon stat-icon-blue">
              <Users />
            </span>
            <div>
              <b>Profil Keluarga</b>
              <small>Dukungan role Orang Tua dan Anak untuk memantau progres tabungan bersama.</small>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">
              <ShieldCheck />
            </span>
            <div>
              <b>Keamanan Supabase</b>
              <small>Data dilindungi Row Level Security (RLS) berstandar enkripsi enterprise.</small>
            </div>
          </div>
        </div>
      </section>

      {/* Katalog Produk Celengan */}
      <section id="katalog" style={{ padding: '60px 24px', background: '#ffffff', borderTop: '1px solid var(--border-light)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div className="eyebrow">CELENGAN FISIK CHILLBANK</div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Pilihan Celengan Pintar Keluarga</h2>
            <p style={{ color: 'var(--text-muted)' }}>Setiap celengan sudah terpasang chip NFC NTAG213 dan nomor seri terdaftar.</p>
          </div>
          <div className="catalog-grid">
            {CELENGAN_CATALOG.map((item) => (
              <div key={item.id} className="product-card">
                <div className="product-hero">
                  <span className="badge badge-emerald" style={{ position: 'absolute', top: 16, right: 16 }}>
                    {item.badge}
                  </span>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginBottom: 12 }}>
                    <Box size={42} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem' }}>{item.name}</h3>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--forest)', marginTop: 4 }}>
                    {rupiah(item.price)}
                  </div>
                </div>
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>{item.description}</p>
                    <ul className="product-features">
                      {item.features.map((f, i) => (
                        <li key={i}>
                          <CheckCircle2 size={15} /> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link to="/register" className="button button-primary button-full">
                    Pesan Celengan Sekarang
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Spesifikasi NFC NTAG213 */}
      <section id="nfc-spec" style={{ padding: '60px 24px', maxWidth: 1000, margin: '0 auto' }}>
        <div className="panel" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)', border: '1px solid var(--primary-border)' }}>
          <div className="panel-heading">
            <div>
              <div className="eyebrow">SPESIFIKASI TEKNOLOGI</div>
              <h3>Chip NFC NXP NTAG213 Original</h3>
            </div>
            <span className="badge badge-emerald">ISO/IEC 14443A</span>
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: 18, fontSize: '0.92rem' }}>
            Chillbank Family menggunakan chip NXP NTAG213 yang diakui secara global untuk keandalan transmisi data nirkabel jarak dekat (NFC).
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div style={{ background: '#ffffff', padding: 12, borderRadius: 10, border: '1px solid var(--border-light)' }}>
              <small style={{ color: 'var(--text-muted)' }}>Frekuensi Operasi</small>
              <b style={{ display: 'block', fontSize: '1rem', color: 'var(--forest)' }}>{NTAG213_SPEC.operatingFrequency}</b>
            </div>
            <div style={{ background: '#ffffff', padding: 12, borderRadius: 10, border: '1px solid var(--border-light)' }}>
              <small style={{ color: 'var(--text-muted)' }}>Kapasitas Memori</small>
              <b style={{ display: 'block', fontSize: '1rem', color: 'var(--forest)' }}>{NTAG213_SPEC.userMemory}</b>
            </div>
            <div style={{ background: '#ffffff', padding: 12, borderRadius: 10, border: '1px solid var(--border-light)' }}>
              <small style={{ color: 'var(--text-muted)' }}>Ketahanan Penulisan</small>
              <b style={{ display: 'block', fontSize: '1rem', color: 'var(--forest)' }}>{NTAG213_SPEC.writeEndurance}</b>
            </div>
            <div style={{ background: '#ffffff', padding: 12, borderRadius: 10, border: '1px solid var(--border-light)' }}>
              <small style={{ color: 'var(--text-muted)' }}>Daya Tahan Data</small>
              <b style={{ display: 'block', fontSize: '1rem', color: 'var(--forest)' }}>{NTAG213_SPEC.dataRetention}</b>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}

// ------------------------------------------------------------------------------
// Auth Page (Login & Register)
// ------------------------------------------------------------------------------
function AuthPage({
  mode,
  onAuth,
}: {
  mode: 'login' | 'register'
  onAuth: (email: string, password: string, name?: string, role?: FamilyRole) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<FamilyRole>('parent')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const routeLocation = useLocation()

  useEffect(() => {
    const state = routeLocation.state as { message?: string } | null
    if (state?.message) setMessage(state.message)
  }, [routeLocation.state])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setBusy(true)
    try {
      await onAuth(email, password, name, role)
      if (mode === 'register') {
        setMessage('Pendaftaran berhasil. Silakan masuk jika akun tidak login otomatis.')
      }
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-art">
        <Brand light />
        <div>
          <div className="eyebrow" style={{ color: '#a7f3d0' }}>
            TABUNGAN KELUARGA MODERN
          </div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, margin: '8px 0 16px' }}>
            Bangun Masa Depan Finansial Bersama Keluarga.
          </h1>
          <p style={{ opacity: 0.9, lineHeight: 1.6 }}>
            Setiap rupiah yang ditabung anak dan orang tua memiliki makna. Pantau celengan fisik langsung dari smartphone dengan teknologi NFC NTAG213.
          </p>
        </div>
        <div className="fine-print" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          Chillbank Family • Keamanan Supabase RLS Terjamin
        </div>
      </div>

      <div className="auth-form-side">
        <Link to="/" className="back-home">
          ← Kembali ke Beranda
        </Link>
        <div style={{ marginBottom: 24 }}>
          <div className="eyebrow">{mode === 'login' ? 'SELAMAT DATANG KEMBALI' : 'BUKA AKUN BARU'}</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
            {mode === 'login' ? 'Masuk ke Akun Keluarga' : 'Daftar Akun Chillbank'}
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {mode === 'login' ? 'Lanjutkan catatan tabungan celengan Anda.' : 'Pilih peran dan mulai menabung hari ini.'}
          </p>
        </div>

        {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}
        {message && <div className="form-success" style={{ marginBottom: 14 }}>{message}</div>}

        <form onSubmit={submit} className="stack-form">
          {mode === 'register' && (
            <>
              <Field
                label="Nama Lengkap"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Contoh: Ayah Budi / Faiz"
              />

              <div className="field">
                <span>Peran dalam Keluarga</span>
                <div className="auth-role-select">
                  <button
                    type="button"
                    className={`auth-role-btn ${role === 'parent' ? 'active' : ''}`}
                    onClick={() => setRole('parent')}
                  >
                    <UserCheck size={16} /> Orang Tua / Ayah / Ibu
                  </button>
                  <button
                    type="button"
                    className={`auth-role-btn ${role === 'child' ? 'active' : ''}`}
                    onClick={() => setRole('child')}
                  >
                    <Award size={16} /> Anak / Anggota
                  </button>
                </div>
              </div>
            </>
          )}

          <Field
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="nama@email.com"
          />

          <Field
            label="Kata Sandi"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="Minimal 6 karakter"
          />

          <Button disabled={busy} type="submit" className="button-full" style={{ marginTop: 8 }}>
            {busy ? 'Memproses...' : mode === 'login' ? 'Masuk Sekarang' : 'Daftarkan Akun'}
          </Button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: '0.9rem' }}>
          {mode === 'login' ? (
            <>
              Belum punya akun?{' '}
              <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                Daftar sekarang
              </Link>
            </>
          ) : (
            <>
              Sudah memiliki akun?{' '}
              <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                Masuk
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------------------
// Public NFC Tap Page (/c/:serial)
// ------------------------------------------------------------------------------
function NfcPublicPage({
  user,
  banks,
  entries,
  refresh,
}: {
  user: Profile | null
  banks: PiggyBank[]
  entries: SavingsEntry[]
  refresh: () => Promise<void>
}) {
  const { serial = '' } = useParams()
  const navigate = useNavigate()
  const [bank, setBank] = useState<{ serial: string; name: string; status: string; category?: string; color?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [claimBusy, setClaimBusy] = useState(false)
  const [showQuickEntry, setShowQuickEntry] = useState(false)
  const [quickType, setQuickType] = useState<'deposit' | 'withdrawal'>('deposit')
  const [quickAmount, setQuickAmount] = useState('')
  const [quickNote, setQuickNote] = useState('')
  const [quickBusy, setQuickBusy] = useState(false)
  const [quickErr, setQuickErr] = useState('')

  useEffect(() => {
    let alive = true
    async function lookup() {
      if (!supabase) {
        setLoading(false)
        return
      }
      try {
        const { data, error: err } = await supabase.rpc('public_bank_lookup', { p_serial: serial })
        if (!alive) return
        if (err) setError(err.message)
        else setBank(data?.[0] || null)
      } catch (e: any) {
        if (alive) setError(e.message)
      } finally {
        if (alive) setLoading(false)
      }
    }
    lookup()
    return () => {
      alive = false
    }
  }, [serial])

  const owned = banks.find((b) => b.serial.toUpperCase() === serial.toUpperCase())
  const balance = owned
    ? entries
        .filter((e) => e.piggy_bank_id === owned.id)
        .reduce((sum, e) => sum + (e.entry_type === 'deposit' ? Number(e.amount) : -Number(e.amount)), 0)
    : 0

  async function handleClaim() {
    if (!supabase || !user) return
    setClaimBusy(true)
    try {
      const { error: claimErr } = await supabase
        .from('piggy_banks')
        .update({ owner_id: user.id })
        .eq('serial', serial.toUpperCase())
        .is('owner_id', null)
      if (claimErr) throw claimErr
      await refresh()
      alert('Celengan berhasil ditautkan ke akun keluarga Anda!')
    } catch (err: any) {
      alert(`Gagal menautkan celengan: ${err.message}`)
    } finally {
      setClaimBusy(false)
    }
  }

  async function handleQuickEntrySubmit(e: FormEvent) {
    e.preventDefault()
    if (!supabase || !owned) return
    const val = Number(quickAmount)
    if (!val || val <= 0) {
      setQuickErr('Nominal harus lebih dari 0')
      return
    }
    setQuickBusy(true)
    setQuickErr('')
    try {
      const { error: rpcErr } = await supabase.rpc('add_savings_entry', {
        p_piggy_bank_id: owned.id,
        p_entry_type: quickType,
        p_amount: Math.round(val),
        p_note: quickNote,
      })
      if (rpcErr) throw rpcErr
      setShowQuickEntry(false)
      setQuickAmount('')
      setQuickNote('')
      await refresh()
      alert('Catatan tabungan berhasil disimpan!')
    } catch (err: any) {
      setQuickErr(errorText(err))
    } finally {
      setQuickBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-page)' }}>
      <header className="public-nav">
        <Brand />
        <span className="badge badge-emerald">
          <SmartphoneNfc size={14} /> NFC SMART TAG
        </span>
      </header>

      <div style={{ maxWidth: 520, margin: '40px auto', padding: '0 20px', width: '100%' }}>
        <div className="panel" style={{ textAlign: 'center', padding: '36px 24px' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <SmartphoneNfc size={36} />
          </div>

          <div className="eyebrow">CELENGAN CHILLBANK FAMILY</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '4px 0 12px' }}>
            Pindai NFC Berhasil!
          </h1>

          {loading ? (
            <p>Memeriksa nomor seri celengan di sistem...</p>
          ) : error ? (
            <div className="form-error">{error}</div>
          ) : !bank ? (
            <div>
              <p style={{ color: 'var(--text-muted)' }}>
                Celengan dengan nomor seri <b>{serial}</b> belum terdaftar di sistem.
              </p>
              <Button kind="secondary" style={{ marginTop: 16 }} onClick={() => navigate('/')}>
                Kembali ke Beranda
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: 'var(--bg-page)', padding: 16, borderRadius: 'var(--radius-lg)' }}>
                <span className="badge badge-emerald" style={{ marginBottom: 8 }}>
                  TERVERIFIKASI NTAG213
                </span>
                <h2 style={{ fontSize: '1.4rem' }}>{bank.name}</h2>
                <div className="celengan-serial">{bank.serial}</div>
              </div>

              {user && owned ? (
                <div style={{ background: 'var(--mint-bg)', border: '1px solid var(--primary-border)', padding: 18, borderRadius: 'var(--radius-md)' }}>
                  <small style={{ color: 'var(--primary)', fontWeight: 600 }}>SALDO TERCATAT CELENGAN INI</small>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--forest)', margin: '4px 0' }}>
                    {rupiah(balance)}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <Button kind="primary" className="button-full" onClick={() => setShowQuickEntry(true)}>
                      <Plus size={16} /> Catat Tabungan Sekarang
                    </Button>
                    <Button kind="secondary" onClick={() => navigate(`/app/celengan/${owned.id}`)}>
                      Rincian <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              ) : user ? (
                <div>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                    Celengan ini belum tertaut ke akun Anda. Apakah ini celengan fisik baru yang ingin Anda klaim?
                  </p>
                  <Button kind="primary" className="button-full" disabled={claimBusy} onClick={handleClaim}>
                    {claimBusy ? 'Menautkan...' : 'Tautkan ke Akun Keluarga Saya'}
                  </Button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    Masuk untuk melihat saldo dan mencatat setoran ke celengan ini.
                  </p>
                  <Link to={`/login?next=${encodeURIComponent(`/c/${serial}`)}`} className="button button-primary button-full">
                    Masuk ke Akun
                  </Link>
                  <Link to="/register" className="button button-secondary button-full">
                    Daftar Akun Baru
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Quick Entry Tap NFC */}
      {showQuickEntry && owned && (
        <Modal title={`Catat Tabungan — ${owned.name}`} onClose={() => setShowQuickEntry(false)}>
          <form className="stack-form" onSubmit={handleQuickEntrySubmit}>
            <div className="scanner-toggle">
              <button
                type="button"
                className={quickType === 'deposit' ? 'active' : ''}
                onClick={() => setQuickType('deposit')}
              >
                <ArrowDownLeft size={16} /> Setoran Tabungan
              </button>
              <button
                type="button"
                className={quickType === 'withdrawal' ? 'active' : ''}
                onClick={() => setQuickType('withdrawal')}
              >
                <ArrowUpRight size={16} /> Penarikan Uang
              </button>
            </div>

            <Field
              label="Nominal (Rupiah)"
              type="number"
              min="1"
              step="1"
              value={quickAmount}
              onChange={(e) => setQuickAmount(e.target.value)}
              required
              placeholder="Contoh: 50000"
            />

            <Field
              label="Catatan (Opsional)"
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              placeholder="Contoh: Tabungan dari uang saku"
            />

            {quickErr && <div className="form-error">{quickErr}</div>}

            <Button type="submit" disabled={quickBusy} className="button-full">
              {quickBusy ? 'Menyimpan...' : 'Simpan Transaksi'}
            </Button>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ------------------------------------------------------------------------------
// Dashboard Utama (/app)
// ------------------------------------------------------------------------------
function Dashboard({
  profile,
  banks,
  entries,
  goals,
  refresh,
  onOpenScan,
}: {
  profile: Profile
  banks: PiggyBank[]
  entries: SavingsEntry[]
  goals: SavingsGoal[]
  refresh: () => Promise<void>
  onOpenScan: () => void
}) {
  const balanceFor = (bankId: string) =>
    entries
      .filter((e) => e.piggy_bank_id === bankId)
      .reduce((s, e) => s + (e.entry_type === 'deposit' ? Number(e.amount) : -Number(e.amount)), 0)

  const totalBalance = banks.reduce((s, b) => s + balanceFor(b.id), 0)
  const deposits = entries.filter((e) => e.entry_type === 'deposit').reduce((s, e) => s + Number(e.amount), 0)
  const withdrawals = entries.filter((e) => e.entry_type === 'withdrawal').reduce((s, e) => s + Number(e.amount), 0)
  const recent = [...entries].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 5)

  // Form State Catat Tabungan
  const [showEntry, setShowEntry] = useState(false)
  const [showNoBankModal, setShowNoBankModal] = useState(false)
  const [creatingDigital, setCreatingDigital] = useState(false)
  const [entryBank, setEntryBank] = useState('')
  const [entryType, setEntryType] = useState<'deposit' | 'withdrawal'>('deposit')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleCreateDigitalBank(openEntryAfter = false) {
    if (!supabase) return
    setCreatingDigital(true)
    setError('')
    try {
      const { data: newId, error: createErr } = await supabase.rpc('member_create_digital_bank', {
        p_name: 'Tabungan Utama Keluarga',
      })
      if (createErr) throw createErr
      await refresh()
      setShowNoBankModal(false)
      if (openEntryAfter) {
        setEntryBank(newId || '')
        setShowEntry(true)
      }
    } catch (err: any) {
      alert(`Gagal membuat celengan digital: ${err.message || err}`)
    } finally {
      setCreatingDigital(false)
    }
  }

  async function submitEntry(e: FormEvent) {
    e.preventDefault()
    const targetBankId = entryBank || banks[0]?.id
    if (!supabase || !targetBankId) {
      setError('Pilih celengan terlebih dahulu')
      return
    }
    const val = Number(amount)
    if (!val || val <= 0) {
      setError('Nominal harus lebih dari 0')
      return
    }
    setBusy(true)
    setError('')
    try {
      const { error: rpcError } = await supabase.rpc('add_savings_entry', {
        p_piggy_bank_id: targetBankId,
        p_entry_type: entryType,
        p_amount: Math.round(val),
        p_note: note,
      })
      if (rpcError) throw rpcError
      setShowEntry(false)
      setAmount('')
      setNote('')
      await refresh()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> RINGKASAN KELUARGA
          </div>
          <h1>Halo, {profile.full_name?.split(' ')[0] || 'Keluarga'}! 👋</h1>
          <p>Catatan keuangan dan celengan keluarga tersimpan aman.</p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button kind="secondary" onClick={onOpenScan}>
            <SmartphoneNfc size={18} /> Pindai Celengan
          </Button>
          <Button
            onClick={() => {
              if (!banks.length) {
                setShowNoBankModal(true)
              } else {
                setEntryBank(banks[0]?.id || '')
                setShowEntry(true)
              }
            }}
          >
            <Plus size={18} /> Catat Tabungan
          </Button>
        </div>
      </div>

      {/* Saldo Akumulasi */}
      <div className="summary-card">
        <div>
          <span className="summary-label">
            <Wallet size={16} /> TOTAL SALDO TABUNGAN KELUARGA
          </span>
          <h2>{rupiah(totalBalance)}</h2>
          <p style={{ opacity: 0.9 }}>Akumulasi dari seluruh celengan aktif di akun keluarga.</p>
        </div>
        <div className="summary-meta">
          <span>
            <ArrowDownLeft size={15} /> Total Masuk: {rupiah(deposits)}
          </span>
          <span>
            <ArrowUpRight size={15} /> Total Keluar: {rupiah(withdrawals)}
          </span>
        </div>
      </div>

      {/* Statistik Cepat */}
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-icon">
            <Wallet />
          </span>
          <div>
            <small>Celengan Aktif</small>
            <b>{banks.filter((b) => b.status === 'active').length}</b>
            <span>Terhubung ke akun</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon stat-icon-amber">
            <Target />
          </span>
          <div>
            <small>Target Tabungan</small>
            <b>{goals.length}</b>
            <span>Tujuan aktif</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon stat-icon-blue">
            <Coins />
          </span>
          <div>
            <small>Total Transaksi</small>
            <b>{entries.length}</b>
            <span>Mutasi tercatat</span>
          </div>
        </div>
      </div>

      {/* Kolom Celengan & Aktivitas Terbaru */}
      <div className="dashboard-columns">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Celengan Saya</h3>
              <p>Daftar produk celengan terdaftar</p>
            </div>
            <Link to="/app/celengan" className="button button-ghost button-small">
              Semua <ChevronRight size={14} />
            </Link>
          </div>

          {banks.length ? (
            <div className="bank-list">
              {banks.slice(0, 4).map((b) => (
                <Link to={`/app/celengan/${b.id}`} className="bank-row" key={b.id}>
                  <div className="bank-icon-box">
                    <Wallet size={20} />
                  </div>
                  <div className="bank-row-main">
                    <b>{b.name}</b>
                    <small>{b.serial} • NFC NTAG213</small>
                  </div>
                  <div className="bank-row-balance">
                    <b>{rupiah(balanceFor(b.id))}</b>
                    <small>Saldo</small>
                  </div>
                  <ChevronRight size={16} color="var(--text-soft)" />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Wallet size={40} />}
              title="Belum Ada Celengan Terhubung"
              text="Aktifkan celengan digital instan secara gratis atau tautkan nomor seri celengan fisik Anda."
              action={
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Button
                    kind="primary"
                    className="button-small"
                    onClick={() => handleCreateDigitalBank(false)}
                    disabled={creatingDigital}
                  >
                    <Sparkles size={14} /> {creatingDigital ? 'Mengaktifkan...' : '⚡ Aktifkan Celengan Digital'}
                  </Button>
                  <Link to="/app/pesanan" className="button button-secondary button-small">
                    Pesan Celengan Fisik
                  </Link>
                </div>
              }
            />
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Mutasi Terbaru</h3>
              <p>Riwayat transaksi tabungan terakhir</p>
            </div>
            <Link to="/app/riwayat" className="button button-ghost button-small">
              Riwayat Lengkap <ChevronRight size={14} />
            </Link>
          </div>

          {recent.length ? (
            <div className="activity-list">
              {recent.map((e) => {
                const deposit = e.entry_type === 'deposit'
                const bank = banks.find((b) => b.id === e.piggy_bank_id)
                return (
                  <div className="activity-row" key={e.id}>
                    <span className={`activity-icon ${deposit ? 'deposit' : 'withdrawal'}`}>
                      {deposit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                    </span>
                    <div className="activity-main">
                      <b>{deposit ? 'Setoran' : 'Penarikan'}</b>
                      <small>
                        {bank?.name || 'Celengan'} • {dateText(e.created_at)}
                        {e.note ? ` • ${e.note}` : ''}
                      </small>
                    </div>
                    <strong className={deposit ? 'amount-positive' : 'amount-negative'}>
                      {deposit ? '+' : '−'}
                      {rupiah(Number(e.amount))}
                    </strong>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={<CreditCard size={40} />}
              title="Belum Ada Mutasi"
              text="Catatan transaksi setoran atau penarikan akan tampil di sini."
            />
          )}
        </section>
      </div>

      {/* Modal Belum Ada Celengan */}
      {showNoBankModal && (
        <Modal title="Mulai Catat Tabungan" onClose={() => setShowNoBankModal(false)}>
          <div style={{ textAlign: 'center', padding: '10px 4px' }}>
            <div style={{ width: 62, height: 62, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Wallet size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: 8, color: 'var(--forest)' }}>
              Belum Ada Celengan Terhubung
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 20 }}>
              Untuk mencatat setoran atau penarikan, Anda memerlukan celengan terhubung. Aktifkan celengan digital gratis sekarang dalam 1 detik!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Button
                kind="primary"
                className="button-full"
                onClick={() => handleCreateDigitalBank(true)}
                disabled={creatingDigital}
              >
                <Sparkles size={16} /> {creatingDigital ? 'Mengaktifkan...' : '⚡ Aktifkan Celengan Digital Sekarang'}
              </Button>
              <Link to="/app/celengan" className="button button-secondary button-full" onClick={() => setShowNoBankModal(false)}>
                🔗 Tautkan Nomor Seri Celengan Fisik
              </Link>
              <Link to="/app/pesanan" className="button button-ghost button-full" onClick={() => setShowNoBankModal(false)}>
                📦 Pesan Celengan Fisik Pintar
              </Link>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Form Catat Tabungan */}
      {showEntry && (
        <Modal title="Catat Setoran / Penarikan" onClose={() => setShowEntry(false)}>
          <form className="stack-form" onSubmit={submitEntry}>
            <label className="field">
              <span>Pilih Celengan</span>
              <select value={entryBank || banks[0]?.id || ''} onChange={(e) => setEntryBank(e.target.value)} required>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.serial})
                  </option>
                ))}
              </select>
            </label>

            <div className="scanner-toggle">
              <button
                type="button"
                className={entryType === 'deposit' ? 'active' : ''}
                onClick={() => setEntryType('deposit')}
              >
                <ArrowDownLeft size={16} /> Setoran Tabungan
              </button>
              <button
                type="button"
                className={entryType === 'withdrawal' ? 'active' : ''}
                onClick={() => setEntryType('withdrawal')}
              >
                <ArrowUpRight size={16} /> Penarikan Uang
              </button>
            </div>

            <Field
              label="Nominal (Rupiah)"
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              placeholder="Contoh: 20000"
            />

            <Field
              label="Catatan (Opsional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Sisa uang jajan sekolah"
            />

            {error && <div className="form-error">{error}</div>}

            <Button type="submit" disabled={busy} className="button-full">
              {busy ? 'Menyimpan...' : 'Simpan Transaksi'}
            </Button>
            <p className="fine-print">
              Catatan tabungan tersinkron secara real-time ke akun keluarga Anda.
            </p>
          </form>
        </Modal>
      )}
    </>
  )
}

// ------------------------------------------------------------------------------
// Celengan Page (/app/celengan)
// ------------------------------------------------------------------------------
function BanksPage({
  banks,
  entries,
  refresh,
  profile,
}: {
  banks: PiggyBank[]
  entries: SavingsEntry[]
  refresh: () => Promise<void>
  profile: Profile
}) {
  const [selectedBank, setSelectedBank] = useState<PiggyBank | null>(null)
  const [showQrModal, setShowQrModal] = useState<PiggyBank | null>(null)
  const [showCreateDigital, setShowCreateDigital] = useState(false)
  const [digitalName, setDigitalName] = useState('')
  const [digitalBusy, setDigitalBusy] = useState(false)
  const [entryTarget, setEntryTarget] = useState<PiggyBank | null>(null)
  const [entryType, setEntryType] = useState<'deposit' | 'withdrawal'>('deposit')
  const [entryAmount, setEntryAmount] = useState('')
  const [entryNote, setEntryNote] = useState('')
  const [entryBusy, setEntryBusy] = useState(false)
  const [entryErr, setEntryErr] = useState('')
  const [linkSerial, setLinkSerial] = useState('')
  const [linkBusy, setLinkBusy] = useState(false)
  const [linkMsg, setLinkMsg] = useState('')

  const balanceFor = (id: string) =>
    entries
      .filter((e) => e.piggy_bank_id === id)
      .reduce((s, e) => s + (e.entry_type === 'deposit' ? Number(e.amount) : -Number(e.amount)), 0)

  async function handleCreateDigitalBank(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setDigitalBusy(true)
    try {
      const { data: newId, error: err } = await supabase.rpc('member_create_digital_bank', {
        p_name: digitalName.trim() || 'Tabungan Utama',
      })
      if (err) throw err
      setShowCreateDigital(false)
      setDigitalName('')
      await refresh()
      alert('Celengan digital berhasil dibuat!')
    } catch (err: any) {
      alert(`Gagal membuat celengan: ${err.message || err}`)
    } finally {
      setDigitalBusy(false)
    }
  }

  async function handleEntrySubmit(e: FormEvent) {
    e.preventDefault()
    if (!supabase || !entryTarget) return
    const val = Number(entryAmount)
    if (!val || val <= 0) {
      setEntryErr('Nominal harus lebih dari 0')
      return
    }
    setEntryBusy(true)
    setEntryErr('')
    try {
      const { error: rpcErr } = await supabase.rpc('add_savings_entry', {
        p_piggy_bank_id: entryTarget.id,
        p_entry_type: entryType,
        p_amount: Math.round(val),
        p_note: entryNote,
      })
      if (rpcErr) throw rpcErr
      setEntryTarget(null)
      setEntryAmount('')
      setEntryNote('')
      await refresh()
      alert('Catatan tabungan berhasil disimpan!')
    } catch (err: any) {
      setEntryErr(errorText(err))
    } finally {
      setEntryBusy(false)
    }
  }

  async function handleLinkBank(e: FormEvent) {
    e.preventDefault()
    if (!supabase || !linkSerial.trim()) return
    setLinkBusy(true)
    setLinkMsg('')
    try {
      const serialClean = linkSerial.trim().toUpperCase()
      const { data, error } = await supabase
        .from('piggy_banks')
        .update({ owner_id: profile.id })
        .eq('serial', serialClean)
        .is('owner_id', null)
        .select()

      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Nomor seri tidak ditemukan atau sudah dimiliki oleh akun lain.')
      }

      setLinkMsg(`Berhasil menautkan celengan ${serialClean}!`)
      setLinkSerial('')
      await refresh()
    } catch (err: any) {
      setLinkMsg(err.message || 'Gagal menautkan celengan.')
    } finally {
      setLinkBusy(false)
    }
  }

  // Handle Write ke chip NTAG213 fisik jika browser support
  async function handleWriteNfc(bank: PiggyBank) {
    try {
      const ok = await writeNfcTag(bank.serial)
      if (ok) alert(`Tag NFC NTAG213 berhasil diprogram untuk celengan ${bank.serial}!`)
    } catch (err: any) {
      alert(`Gagal menulis NFC: ${err.message}`)
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">PRODUK CELENGAN KELUARGA</div>
          <h1>Celengan Terhubung</h1>
          <p>Koleksi celengan fisik pintar NFC NTAG213 dan kantong tabungan digital.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button onClick={() => setShowCreateDigital(true)}>
            <Sparkles size={16} /> + Buat Celengan Digital
          </Button>
        </div>
      </div>

      {banks.length ? (
        <div className="bank-cards-grid">
          {banks.map((b) => (
            <article className="celengan-card" key={b.id}>
              <div className="celengan-card-header">
                <div className="celengan-card-top">
                  <span className="badge badge-emerald">
                    <SmartphoneNfc size={13} /> {b.serial.startsWith('CBF-DGT') ? 'DIGITAL' : 'NTAG213'}
                  </span>
                  <span className="badge badge-role">{b.status}</span>
                </div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--forest)' }}>{b.name}</h3>
                <div className="celengan-serial">{b.serial}</div>
              </div>

              <div className="celengan-card-body">
                <div className="celengan-balance-box">
                  <small style={{ color: 'var(--text-muted)' }}>Saldo Terkumpul</small>
                  <b style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>{rupiah(balanceFor(b.id))}</b>
                </div>

                <div className="celengan-actions">
                  <Button kind="primary" className="button-small" onClick={() => setEntryTarget(b)}>
                    <Plus size={14} /> Catat
                  </Button>
                  <Button kind="secondary" className="button-small" onClick={() => setShowQrModal(b)}>
                    <QrCode size={15} /> QR
                  </Button>
                  <Link to={`/app/celengan/${b.id}`} className="button button-ghost button-small">
                    Rincian
                  </Link>
                </div>

                {isWebNfcSupported() && !b.serial.startsWith('CBF-DGT') && (
                  <Button kind="ghost" className="button-small" onClick={() => handleWriteNfc(b)}>
                    <SmartphoneNfc size={14} /> Tulis ke Tag NTAG213
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Wallet size={48} />}
          title="Belum Ada Celengan Tertaut"
          text="Buat celengan digital instan secara gratis atau tautkan nomor seri celengan fisik Anda di bawah."
          action={
            <Button kind="primary" className="button-small" onClick={() => setShowCreateDigital(true)}>
              <Sparkles size={14} /> Buat Celengan Digital Gratis
            </Button>
          }
        />
      )}

      {/* Panel Tautkan Celengan Baru */}
      <section className="panel" style={{ marginTop: 28 }}>
        <div className="panel-heading">
          <div>
            <h3>Tautkan Celengan Fisik</h3>
            <p>Masukkan nomor seri yang tertera pada celengan baru Anda</p>
          </div>
        </div>
        <form onSubmit={handleLinkBank} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <Field
              label="Nomor Seri Celengan"
              placeholder="Contoh: CBF-001"
              value={linkSerial}
              onChange={(e) => setLinkSerial(e.target.value.toUpperCase())}
              required
            />
          </div>
          <Button type="submit" disabled={linkBusy}>
            {linkBusy ? 'Menautkan...' : 'Klaim Celengan'}
          </Button>
        </form>
        {linkMsg && (
          <p style={{ marginTop: 10, fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>
            {linkMsg}
          </p>
        )}
      </section>

      {/* Modal Buat Celengan Digital */}
      {showCreateDigital && (
        <Modal title="Buat Celengan Digital Baru" onClose={() => setShowCreateDigital(false)}>
          <form className="stack-form" onSubmit={handleCreateDigitalBank}>
            <Field
              label="Nama Celengan / Kantong Tabungan"
              placeholder="Contoh: Tabungan Liburan, Uang Kurban, Celengan Anak"
              value={digitalName}
              onChange={(e) => setDigitalName(e.target.value)}
              required
            />
            <p className="fine-print">
              Celengan digital dapat langsung digunakan untuk mencatat tabungan keluarga, dan nomor seri akan di-generate otomatis.
            </p>
            <Button type="submit" disabled={digitalBusy} className="button-full">
              {digitalBusy ? 'Membuat...' : 'Buat Celengan Sekarang'}
            </Button>
          </form>
        </Modal>
      )}

      {/* Modal Catat Tabungan dari Card Celengan */}
      {entryTarget && (
        <Modal title={`Catat Tabungan — ${entryTarget.name}`} onClose={() => setEntryTarget(null)}>
          <form className="stack-form" onSubmit={handleEntrySubmit}>
            <div className="scanner-toggle">
              <button
                type="button"
                className={entryType === 'deposit' ? 'active' : ''}
                onClick={() => setEntryType('deposit')}
              >
                <ArrowDownLeft size={16} /> Setoran Tabungan
              </button>
              <button
                type="button"
                className={entryType === 'withdrawal' ? 'active' : ''}
                onClick={() => setEntryType('withdrawal')}
              >
                <ArrowUpRight size={16} /> Penarikan Uang
              </button>
            </div>

            <Field
              label="Nominal (Rupiah)"
              type="number"
              min="1"
              step="1"
              value={entryAmount}
              onChange={(e) => setEntryAmount(e.target.value)}
              required
              placeholder="Contoh: 25000"
            />

            <Field
              label="Catatan (Opsional)"
              value={entryNote}
              onChange={(e) => setEntryNote(e.target.value)}
              placeholder="Contoh: Hasil menyisihkan uang belanja"
            />

            {entryErr && <div className="form-error">{entryErr}</div>}

            <Button type="submit" disabled={entryBusy} className="button-full">
              {entryBusy ? 'Menyimpan...' : 'Simpan Transaksi'}
            </Button>
          </form>
        </Modal>
      )}

      {/* Modal QR Code */}
      {showQrModal && <QrStickerModal bank={showQrModal} onClose={() => setShowQrModal(null)} />}
    </>
  )
}

// ------------------------------------------------------------------------------
// Detail Celengan Page (/app/celengan/:id)
// ------------------------------------------------------------------------------
function BankDetailPage({
  banks,
  entries,
  refresh,
  profile,
}: {
  banks: PiggyBank[]
  entries: SavingsEntry[]
  refresh: () => Promise<void>
  profile: Profile
}) {
  const { id } = useParams()
  const bank = banks.find((b) => b.id === id)
  const items = entries.filter((e) => e.piggy_bank_id === id).sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
  const balance = items.reduce((s, e) => s + (e.entry_type === 'deposit' ? Number(e.amount) : -Number(e.amount)), 0)

  const [showEntry, setShowEntry] = useState(false)
  const [entryType, setEntryType] = useState<'deposit' | 'withdrawal'>('deposit')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submitEntry(e: FormEvent) {
    e.preventDefault()
    if (!supabase || !bank) return
    const val = Number(amount)
    if (!val || val <= 0) {
      setError('Nominal harus lebih dari 0')
      return
    }
    setBusy(true)
    setError('')
    try {
      const { error: rpcError } = await supabase.rpc('add_savings_entry', {
        p_piggy_bank_id: bank.id,
        p_entry_type: entryType,
        p_amount: Math.round(val),
        p_note: note,
      })
      if (rpcError) throw rpcError
      setShowEntry(false)
      setAmount('')
      setNote('')
      await refresh()
    } catch (err: any) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  if (!bank) {
    return (
      <EmptyState
        icon={<Wallet size={48} />}
        title="Celengan Tidak Ditemukan"
        text="Celengan ini mungkin belum tertaut atau telah dinonaktifkan."
      />
    )
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">{bank.serial}</div>
          <h1>{bank.name}</h1>
          <p>Rincian mutasi tabungan khusus celengan ini.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button onClick={() => setShowEntry(true)}>
            <Plus size={16} /> Catat Tabungan
          </Button>
          <Link to="/app/celengan" className="button button-secondary">
            Kembali
          </Link>
        </div>
      </div>

      <div className="summary-card">
        <div>
          <span className="summary-label">SALDO CELENGAN INI</span>
          <h2>{rupiah(balance)}</h2>
          <p>Nomor Seri: {bank.serial} • Status: {bank.status}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <Button
            kind="primary"
            className="button-small"
            onClick={() => {
              setEntryType('deposit')
              setShowEntry(true)
            }}
          >
            <ArrowDownLeft size={14} /> + Setor Tabungan
          </Button>
          <Button
            kind="secondary"
            className="button-small"
            onClick={() => {
              setEntryType('withdrawal')
              setShowEntry(true)
            }}
          >
            <ArrowUpRight size={14} /> − Tarik Tabungan
          </Button>
        </div>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Riwayat Transaksi</h3>
            <p>{items.length} mutasi tercatat</p>
          </div>
        </div>

        {items.length ? (
          <div className="activity-list">
            {items.map((e) => {
              const deposit = e.entry_type === 'deposit'
              return (
                <div className="activity-row" key={e.id}>
                  <span className={`activity-icon ${deposit ? 'deposit' : 'withdrawal'}`}>
                    {deposit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                  </span>
                  <div className="activity-main">
                    <b>{deposit ? 'Setoran' : 'Penarikan'}</b>
                    <small>
                      {dateText(e.created_at)}
                      {e.note ? ` • ${e.note}` : ''}
                    </small>
                  </div>
                  <strong className={deposit ? 'amount-positive' : 'amount-negative'}>
                    {deposit ? '+' : '−'}
                    {rupiah(Number(e.amount))}
                  </strong>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={<CreditCard size={40} />}
            title="Belum Ada Transaksi"
            text="Transaksi setoran celengan akan muncul di sini."
          />
        )}
      </section>

      {/* Modal Catat Tabungan Langsung di Detail */}
      {showEntry && (
        <Modal title={`Catat Tabungan — ${bank.name}`} onClose={() => setShowEntry(false)}>
          <form className="stack-form" onSubmit={submitEntry}>
            <div className="scanner-toggle">
              <button
                type="button"
                className={entryType === 'deposit' ? 'active' : ''}
                onClick={() => setEntryType('deposit')}
              >
                <ArrowDownLeft size={16} /> Setoran Tabungan
              </button>
              <button
                type="button"
                className={entryType === 'withdrawal' ? 'active' : ''}
                onClick={() => setEntryType('withdrawal')}
              >
                <ArrowUpRight size={16} /> Penarikan Uang
              </button>
            </div>

            <Field
              label="Nominal (Rupiah)"
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              placeholder="Contoh: 50000"
            />

            <Field
              label="Catatan (Opsional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Tabungan mingguan anak"
            />

            {error && <div className="form-error">{error}</div>}

            <Button type="submit" disabled={busy} className="button-full">
              {busy ? 'Menyimpan...' : 'Simpan Transaksi'}
            </Button>
            <p className="fine-print">
              Catatan tabungan tersinkron secara real-time ke akun keluarga Anda.
            </p>
          </form>
        </Modal>
      )}
    </>
  )
}

// ------------------------------------------------------------------------------
// Target Tabungan Page (/app/target)
// ------------------------------------------------------------------------------
function GoalsPage({
  goals,
  banks,
  entries,
  refresh,
}: {
  goals: SavingsGoal[]
  banks: PiggyBank[]
  entries: SavingsEntry[]
  refresh: () => Promise<void>
}) {
  const [show, setShow] = useState(false)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Hitung total saldo tabungan untuk perbandingan progres
  const totalBalance = entries.reduce(
    (s, e) => s + (e.entry_type === 'deposit' ? Number(e.amount) : -Number(e.amount)),
    0
  )

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sesi berakhir. Silakan login kembali.')
      const { error: insertErr } = await supabase.from('savings_goals').insert({
        user_id: user.id,
        name,
        target_amount: Math.round(Number(amount)),
        target_date: date || null,
      })
      if (insertErr) throw insertErr
      setShow(false)
      setName('')
      setAmount('')
      setDate('')
      await refresh()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  async function removeGoal(id: string) {
    if (!supabase || !confirm('Hapus target tabungan ini?')) return
    const { error } = await supabase.from('savings_goals').delete().eq('id', id)
    if (error) alert(error.message)
    else await refresh()
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">IMPIAN KELUARGA</div>
          <h1>Target Tabungan</h1>
          <p>Tentukan tujuan finansial bersama untuk anak dan keluarga.</p>
        </div>
        <Button onClick={() => setShow(true)}>
          <Plus size={18} /> Buat Target Baru
        </Button>
      </div>

      {goals.length ? (
        <div className="goal-grid">
          {goals.map((g) => {
            const target = Number(g.target_amount)
            const pct = Math.min(100, Math.round((totalBalance / target) * 100))
            const reached = totalBalance >= target

            return (
              <article className="goal-card" key={g.id}>
                <div className="goal-card-top">
                  <span className="badge badge-amber">
                    <Target size={14} /> {reached ? 'Tercapai! 🎉' : 'Dalam Progres'}
                  </span>
                  <button
                    className="modal-close-btn"
                    onClick={() => removeGoal(g.id)}
                    aria-label="Hapus target"
                  >
                    <X size={16} />
                  </button>
                </div>

                <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>{g.name}</h3>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--forest)' }}>
                  {rupiah(target)}
                </div>

                <div className="goal-progress-bar">
                  <div className="goal-progress-fill" style={{ width: `${pct}%` }} />
                </div>

                <div className="goal-foot">
                  <span>{pct}% Tercapai</span>
                  <span>{g.target_date ? `Batas: ${dateText(g.target_date)}` : 'Tanpa batas'}</span>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Target size={48} />}
          title="Belum Ada Target Tabungan"
          text="Tentukan target tabungan pertama, seperti dana liburan keluarga, sepeda baru, atau dana darurat."
          action={
            <Button kind="primary" onClick={() => setShow(true)}>
              Buat Target Tabungan
            </Button>
          }
        />
      )}

      {show && (
        <Modal title="Buat Target Tabungan" onClose={() => setShow(false)}>
          <form className="stack-form" onSubmit={submit}>
            <Field
              label="Nama Target"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              placeholder="Contoh: Liburan Akhir Tahun"
            />
            <Field
              label="Nominal Target (Rupiah)"
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              placeholder="Contoh: 1500000"
            />
            <Field
              label="Target Tanggal (Opsional)"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            {error && <div className="form-error">{error}</div>}
            <Button type="submit" disabled={busy} className="button-full">
              {busy ? 'Menyimpan...' : 'Simpan Target'}
            </Button>
          </form>
        </Modal>
      )}
    </>
  )
}

// ------------------------------------------------------------------------------
// Riwayat Transaksi Page (/app/riwayat)
// ------------------------------------------------------------------------------
function HistoryPage({ entries, banks }: { entries: SavingsEntry[]; banks: PiggyBank[] }) {
  const [filter, setFilter] = useState<'all' | 'deposit' | 'withdrawal'>('all')
  const [search, setSearch] = useState('')

  const filtered = entries
    .filter((e) => (filter === 'all' ? true : e.entry_type === filter))
    .filter((e) => (search ? (e.note || '').toLowerCase().includes(search.toLowerCase()) : true))
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">MUTASI KEUANGAN</div>
          <h1>Riwayat Transaksi</h1>
          <p>Seluruh catatan setoran dan penarikan yang pernah dilakukan.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 18, alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="scanner-toggle" style={{ width: 'auto' }}>
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
            Semua
          </button>
          <button className={filter === 'deposit' ? 'active' : ''} onClick={() => setFilter('deposit')}>
            Setoran
          </button>
          <button className={filter === 'withdrawal' ? 'active' : ''} onClick={() => setFilter('withdrawal')}>
            Penarikan
          </button>
        </div>

        <div style={{ minWidth: 220 }}>
          <input
            type="text"
            placeholder="Cari catatan transaksi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              width: '100%',
              fontSize: '0.88rem',
            }}
          />
        </div>
      </div>

      <section className="panel">
        {filtered.length ? (
          <div className="activity-list">
            {filtered.map((e) => {
              const deposit = e.entry_type === 'deposit'
              const bank = banks.find((b) => b.id === e.piggy_bank_id)
              return (
                <div className="activity-row" key={e.id}>
                  <span className={`activity-icon ${deposit ? 'deposit' : 'withdrawal'}`}>
                    {deposit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                  </span>
                  <div className="activity-main">
                    <b>{deposit ? 'Setoran' : 'Penarikan'}</b>
                    <small>
                      {bank?.name || 'Celengan'} ({bank?.serial || 'N/A'}) • {dateText(e.created_at)}
                      {e.note ? ` • ${e.note}` : ''}
                    </small>
                  </div>
                  <strong className={deposit ? 'amount-positive' : 'amount-negative'}>
                    {deposit ? '+' : '−'}
                    {rupiah(Number(e.amount))}
                  </strong>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Coins size={44} />}
            title="Tidak Ada Catatan"
            text="Transaksi yang sesuai dengan filter atau kata kunci pencarian akan tampil di sini."
          />
        )}
      </section>
    </>
  )
}

// ------------------------------------------------------------------------------
// Pesan Celengan Fisik Page (/app/pesanan)
// ------------------------------------------------------------------------------
function OrdersPage({ orders, refresh }: { orders: PiggyBankOrder[]; refresh: () => Promise<void> }) {
  const [model, setModel] = useState(CELENGAN_CATALOG[0].modelName)
  const [recipient, setRecipient] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sesi berakhir. Silakan login kembali.')
      const { error: insErr } = await supabase.from('piggy_bank_orders').insert({
        user_id: user.id,
        recipient_name: recipient,
        phone,
        address,
        product_model: model,
        quantity: Number(quantity),
        note,
        status: 'pending',
      })
      if (insErr) throw insErr
      setMessage('Pesanan berhasil dikirim. Admin akan mengonfirmasi dan memproses pengiriman.')
      setRecipient('')
      setPhone('')
      setAddress('')
      setQuantity('1')
      setNote('')
      await refresh()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  async function confirmReceived(order: PiggyBankOrder) {
    if (!supabase || !confirm('Konfirmasi bahwa paket celengan sudah Anda terima dengan baik?')) return
    const { error } = await supabase.from('piggy_bank_orders').update({ status: 'received' }).eq('id', order.id)
    if (error) alert(error.message)
    else await refresh()
  }

  const statusLabel: Record<string, string> = {
    pending: 'Menunggu Konfirmasi',
    confirmed: 'Pesanan Dikonfirmasi',
    processing: 'Sedang Disiapkan',
    shipped: 'Sedang Dikirim',
    delivered: 'Tiba — Harap Konfirmasi',
    received: 'Selesai Diterima',
    cancelled: 'Dibatalkan',
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">CELENGAN FISIK KELUARGA</div>
          <h1>Pesan Celengan Pintar</h1>
          <p>Pesan celengan fisik dengan chip NFC NTAG213 tertanam untuk anak atau keluarga.</p>
        </div>
      </div>

      <div className="dashboard-columns">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Formulir Pemesanan</h3>
              <p>Pastikan alamat pengiriman paket sudah lengkap</p>
            </div>
          </div>

          <form className="stack-form" onSubmit={submit}>
            <label className="field">
              <span>Pilihan Model Celengan</span>
              <select value={model} onChange={(e) => setModel(e.target.value)} required>
                {CELENGAN_CATALOG.map((c) => (
                  <option key={c.id} value={c.modelName}>
                    {c.modelName} — {rupiah(c.price)}
                  </option>
                ))}
              </select>
            </label>

            <Field
              label="Nama Penerima Paket"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              required
              placeholder="Contoh: Budi Santoso"
            />

            <Field
              label="Nomor Telepon / WhatsApp"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="08xxxxxxxxxx"
            />

            <label className="field">
              <span>Alamat Lengkap Pengiriman</span>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                rows={3}
                placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan, kota, kode pos"
              />
            </label>

            <Field
              label="Jumlah Unit"
              type="number"
              min="1"
              max="10"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />

            <label className="field">
              <span>Catatan Tambahan (Opsional)</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Permintaan khusus atau pesan untuk kurir"
              />
            </label>

            {error && <div className="form-error">{error}</div>}
            {message && <div className="form-success">{message}</div>}

            <Button type="submit" disabled={busy} className="button-full">
              {busy ? 'Mengirim Pesanan...' : 'Kirim Pesanan Celengan'}
            </Button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Status Pesanan Saya</h3>
              <p>Pantau perjalanan celengan hingga sampai di rumah</p>
            </div>
          </div>

          {orders.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {orders.map((o) => (
                <article
                  key={o.id}
                  style={{
                    background: 'var(--bg-page)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: 16,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <b style={{ fontSize: '0.95rem' }}>#{o.id.slice(0, 8).toUpperCase()}</b>
                    <span className="badge badge-emerald">{statusLabel[o.status] || o.status}</span>
                  </div>

                  <p style={{ fontWeight: 600, color: 'var(--forest)', fontSize: '0.9rem' }}>
                    {o.product_model || 'Chillbank Smart Classic'} ({o.quantity} unit)
                  </p>
                  <small style={{ color: 'var(--text-muted)' }}>Penerima: {o.recipient_name} ({o.phone})</small>

                  {o.tracking_number && (
                    <div style={{ marginTop: 8, padding: 8, background: '#ffffff', borderRadius: 6, fontSize: '0.82rem' }}>
                      <Truck size={14} style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--primary)' }} />
                      No. Resi Pengiriman: <b>{o.tracking_number}</b>
                    </div>
                  )}

                  {o.status === 'delivered' && (
                    <Button kind="primary" className="button-small button-full" style={{ marginTop: 10 }} onClick={() => confirmReceived(o)}>
                      Konfirmasi Celengan Diterima
                    </Button>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Box size={44} />}
              title="Belum Ada Pesanan"
              text="Isi formulir di samping untuk memesan celengan fisik pertama."
            />
          )}
        </section>
      </div>
    </>
  )
}

// ------------------------------------------------------------------------------
// Profil Anggota Page (/app/profil)
// ------------------------------------------------------------------------------
function ProfilePage({ profile, refresh }: { profile: Profile; refresh: () => Promise<void> }) {
  const [name, setName] = useState(profile.full_name || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [bio, setBio] = useState(profile.bio || '')
  const [role, setRole] = useState<FamilyRole>(profile.role || 'parent')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { error: upErr } = await supabase
        .from('profiles')
        .update({
          full_name: name,
          phone,
          bio,
          role,
        })
        .eq('id', profile.id)
      if (upErr) throw upErr
      await refresh()
      setMessage('Profil keluarga berhasil diperbarui.')
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">PENGATURAN AKUN</div>
          <h1>Profil Anggota</h1>
          <p>Informasi akun dan peran dalam keluarga.</p>
        </div>
      </div>

      <div style={{ maxWidth: 600 }}>
        <section className="panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div className="avatar" style={{ width: 56, height: 56, fontSize: '1.4rem' }}>
              {(name || 'C').slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h2 style={{ fontSize: '1.3rem' }}>{name || 'Anggota Chillbank'}</h2>
              <span className="badge badge-emerald" style={{ textTransform: 'capitalize' }}>
                {role === 'parent' ? 'Orang Tua' : role === 'child' ? 'Anak' : role}
              </span>
            </div>
          </div>

          <form className="stack-form" onSubmit={submit}>
            <Field
              label="Nama Lengkap"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <div className="field">
              <span>Peran dalam Keluarga</span>
              <select value={role} onChange={(e) => setRole(e.target.value as FamilyRole)}>
                <option value="parent">Kepala Keluarga / Orang Tua</option>
                <option value="child">Anggota / Anak</option>
                {profile.role === 'admin' && <option value="admin">Administrator</option>}
              </select>
            </div>

            <Field
              label="Nomor Telepon (Opsional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08xxxxxxxxxx"
            />

            <label className="field">
              <span>Bio / Catatan Impian Tabungan</span>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Tuliskan motivasi menabung Anda..."
              />
            </label>

            {error && <div className="form-error">{error}</div>}
            {message && <div className="form-success">{message}</div>}

            <Button type="submit" disabled={busy}>
              {busy ? 'Menyimpan...' : 'Simpan Profil'}
            </Button>
          </form>

          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-light)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span>ID Akun Supabase: </span>
            <code style={{ background: 'var(--bg-page)', padding: '2px 6px', borderRadius: 4 }}>
              {profile.id}
            </code>
          </div>
        </section>
      </div>
    </>
  )
}

// ------------------------------------------------------------------------------
// Dashboard Admin (/admin)
// ------------------------------------------------------------------------------
// ------------------------------------------------------------------------------
// 1. Dashboard Overview Admin (/admin)
// ------------------------------------------------------------------------------
function AdminDashboardPage({
  banks,
  orders,
  allUsers,
  onOpenScan,
}: {
  banks: PiggyBank[]
  orders: PiggyBankOrder[]
  allUsers: Profile[]
  onOpenScan: () => void
}) {
  const pendingOrders = orders.filter((o) => ['pending', 'confirmed', 'processing'].includes(o.status))
  const activeBanks = banks.filter((b) => b.status === 'active')
  const totalUnitsOrdered = orders.reduce((acc, o) => acc + (o.quantity || 1), 0)

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> SISTEM KONTROL PLATFORM
          </div>
          <h1>Dashboard Administrator</h1>
          <p>Ringkasan performa perangkat fisik, pesanan pelanggan, dan ekosistem akun keluarga.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button kind="secondary" onClick={onOpenScan}>
            <SmartphoneNfc size={16} /> Pindai NFC / QR
          </Button>
          <Link to="/admin/celengan" className="button button-primary">
            <Plus size={16} /> + Daftarkan Celengan
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <span className="stat-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <Wallet size={22} />
          </span>
          <div>
            <b>{banks.length} Unit</b>
            <small>Total Celengan ({activeBanks.length} Aktif)</small>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon" style={{ background: 'var(--amber-light)', color: 'var(--amber)' }}>
            <Box size={22} />
          </span>
          <div>
            <b>{pendingOrders.length} Pesanan</b>
            <small>Perlu Diproses ({orders.length} Total)</small>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}>
            <Users size={22} />
          </span>
          <div>
            <b>{allUsers.length} Pengguna</b>
            <small>Keluarga Terdaftar</small>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon" style={{ background: 'var(--rose-light)', color: 'var(--rose)' }}>
            <Truck size={22} />
          </span>
          <div>
            <b>{totalUnitsOrdered} Unit</b>
            <small>Total Fisik Dipesan</small>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 28 }}>
        <Link to="/admin/pesanan" className="panel" style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', padding: 18 }}>
          <span className="avatar" style={{ background: 'var(--amber-light)', color: 'var(--amber)' }}>
            <Box size={20} />
          </span>
          <div style={{ flex: 1 }}>
            <b style={{ display: 'block', fontSize: '0.96rem', color: 'var(--text-main)' }}>Manajemen Pesanan</b>
            <small style={{ color: 'var(--text-muted)' }}>Proses kirim & update resi kurir</small>
          </div>
          <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
        </Link>

        <Link to="/admin/celengan" className="panel" style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', padding: 18 }}>
          <span className="avatar" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <Wallet size={20} />
          </span>
          <div style={{ flex: 1 }}>
            <b style={{ display: 'block', fontSize: '0.96rem', color: 'var(--text-main)' }}>Inventaris Celengan</b>
            <small style={{ color: 'var(--text-muted)' }}>Register serial & flash chip NFC</small>
          </div>
          <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
        </Link>

        <Link to="/admin/users" className="panel" style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', padding: 18 }}>
          <span className="avatar" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}>
            <Users size={20} />
          </span>
          <div style={{ flex: 1 }}>
            <b style={{ display: 'block', fontSize: '0.96rem', color: 'var(--text-main)' }}>Kelola Pengguna</b>
            <small style={{ color: 'var(--text-muted)' }}>Atur peran & data anggota</small>
          </div>
          <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
        </Link>
      </div>

      {/* Dual Column: Recent Orders & Recent Banks */}
      <div className="dashboard-columns">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Pesanan Terbaru Masuk</h3>
              <p>Perlu segera diverifikasi dan dikirim ke pembeli</p>
            </div>
            <Link to="/admin/pesanan" className="button button-ghost button-small">
              Semua Pesanan ({orders.length}) →
            </Link>
          </div>

          {orders.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {orders.slice(0, 4).map((o) => (
                <div
                  key={o.id}
                  style={{
                    background: 'var(--bg-page)',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <b style={{ fontSize: '0.9rem' }}>{o.recipient_name}</b>
                      <span className="badge badge-amber" style={{ fontSize: '0.72rem' }}>
                        {o.quantity} unit
                      </span>
                    </div>
                    <small style={{ color: 'var(--text-muted)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {o.product_model} • {o.phone}
                    </small>
                  </div>
                  <span
                    className={`badge ${
                      o.status === 'pending'
                        ? 'badge-amber'
                        : o.status === 'shipped' || o.status === 'delivered' || o.status === 'received'
                        ? 'badge-emerald'
                        : o.status === 'cancelled'
                        ? 'badge-rose'
                        : 'badge-blue'
                    }`}
                  >
                    {o.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Box size={36} />} title="Belum Ada Pesanan" text="Pesanan celengan baru akan tampil di sini." />
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Celengan Terdaftar Terbaru</h3>
              <p>Nomor seri fisik terdaftar dalam sistem</p>
            </div>
            <Link to="/admin/celengan" className="button button-ghost button-small">
              Inventaris ({banks.length}) →
            </Link>
          </div>

          {banks.length ? (
            <div className="bank-list">
              {banks.slice(0, 4).map((b) => (
                <div className="bank-row" key={b.id}>
                  <div className="bank-icon-box">
                    <SmartphoneNfc size={20} />
                  </div>
                  <div className="bank-row-main">
                    <b>{b.name}</b>
                    <small>{b.serial} • {b.category}</small>
                  </div>
                  <span className="badge badge-emerald">{b.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Wallet size={36} />} title="Belum Ada Celengan" text="Daftarkan nomor seri celengan fisik pertama Anda." />
          )}
        </section>
      </div>
    </>
  )
}

// ------------------------------------------------------------------------------
// 2. Manajemen Pesanan Admin (/admin/pesanan)
// ------------------------------------------------------------------------------
function AdminOrdersPage({
  orders,
  refresh,
}: {
  orders: PiggyBankOrder[]
  refresh: () => Promise<void>
}) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'processing' | 'shipped' | 'done' | 'cancelled'>('all')

  async function updateOrderStatus(orderId: string, status: PiggyBankOrder['status'], tracking?: string) {
    if (!supabase) return
    const { error } = await supabase
      .from('piggy_bank_orders')
      .update({ status, tracking_number: tracking || null, updated_at: new Date().toISOString() })
      .eq('id', orderId)
    if (error) alert(error.message)
    else await refresh()
  }

  const filtered = orders.filter((o) => {
    if (filter === 'pending') return o.status === 'pending'
    if (filter === 'processing') return o.status === 'confirmed' || o.status === 'processing'
    if (filter === 'shipped') return o.status === 'shipped'
    if (filter === 'done') return o.status === 'delivered' || o.status === 'received'
    if (filter === 'cancelled') return o.status === 'cancelled'
    return true
  })

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">LOGISTIK & DISTRIBUSI</div>
          <h1>Manajemen Pesanan Celengan</h1>
          <p>Konfirmasi pesanan anggota, siapkan celengan fisik, dan input nomor resi kurir pengiriman.</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        <button
          className={`button button-small ${filter === 'all' ? 'button-primary' : 'button-secondary'}`}
          onClick={() => setFilter('all')}
        >
          Semua ({orders.length})
        </button>
        <button
          className={`button button-small ${filter === 'pending' ? 'button-primary' : 'button-secondary'}`}
          onClick={() => setFilter('pending')}
        >
          Menunggu ({orders.filter((o) => o.status === 'pending').length})
        </button>
        <button
          className={`button button-small ${filter === 'processing' ? 'button-primary' : 'button-secondary'}`}
          onClick={() => setFilter('processing')}
        >
          Disiapkan ({orders.filter((o) => o.status === 'confirmed' || o.status === 'processing').length})
        </button>
        <button
          className={`button button-small ${filter === 'shipped' ? 'button-primary' : 'button-secondary'}`}
          onClick={() => setFilter('shipped')}
        >
          Dikirim ({orders.filter((o) => o.status === 'shipped').length})
        </button>
        <button
          className={`button button-small ${filter === 'done' ? 'button-primary' : 'button-secondary'}`}
          onClick={() => setFilter('done')}
        >
          Selesai ({orders.filter((o) => o.status === 'delivered' || o.status === 'received').length})
        </button>
        <button
          className={`button button-small ${filter === 'cancelled' ? 'button-primary' : 'button-secondary'}`}
          onClick={() => setFilter('cancelled')}
        >
          Batal ({orders.filter((o) => o.status === 'cancelled').length})
        </button>
      </div>

      {filtered.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map((o) => (
            <AdminOrderItem key={o.id} order={o} onUpdate={updateOrderStatus} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Box size={44} />}
          title="Tidak Ada Pesanan pada Kategori Ini"
          text="Semua pesanan dengan status yang dipilih akan muncul di sini."
        />
      )}
    </>
  )
}

function AdminOrderItem({
  order,
  onUpdate,
}: {
  order: PiggyBankOrder
  onUpdate: (id: string, status: PiggyBankOrder['status'], tracking?: string) => Promise<void>
}) {
  const [status, setStatus] = useState(order.status)
  const [tracking, setTracking] = useState(order.tracking_number || '')
  const [busy, setBusy] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  const cleanPhone = order.phone.replace(/[^0-9]/g, '')
  const waNumber = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone

  return (
    <div
      style={{
        background: 'var(--bg-page)',
        padding: 18,
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-light)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div>
          <b>#{order.id.slice(0, 8).toUpperCase()} • {order.recipient_name}</b>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 8 }}>
            {dateText(order.created_at)}
          </span>
        </div>
        <span className="badge badge-amber">{order.quantity} unit</span>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
        <small style={{ color: 'var(--text-muted)' }}>
          📞 {order.phone}
        </small>
        {waNumber.length >= 10 && (
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            Chat WhatsApp ↗
          </a>
        )}
      </div>

      <small style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
        📍 Alamat: {order.address}
      </small>

      <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--forest)' }}>
        📦 {order.product_model}
      </p>

      {order.note && (
        <small style={{ display: 'block', marginTop: 4, background: '#ffffff', padding: '6px 10px', borderRadius: 6, border: '1px dashed var(--border-light)' }}>
          Catatan: {order.note}
        </small>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14, alignItems: 'flex-end' }}>
        <label className="field" style={{ flex: 1, minWidth: 160 }}>
          <span>Status Pesanan</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as PiggyBankOrder['status'])}>
            <option value="pending">Menunggu Konfirmasi</option>
            <option value="confirmed">Pesanan Dikonfirmasi</option>
            <option value="processing">Sedang Disiapkan</option>
            <option value="shipped">Sedang Dikirim</option>
            <option value="delivered">Tiba di Tujuan</option>
            <option value="received">Selesai Diterima</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
        </label>

        <label className="field" style={{ flex: 1, minWidth: 160 }}>
          <span>No. Resi JNE / J&T / SiCepat</span>
          <input
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="Nomor resi pengiriman"
          />
        </label>

        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            await onUpdate(order.id, status, tracking)
            setBusy(false)
            setSavedMsg(true)
            setTimeout(() => setSavedMsg(false), 2500)
          }}
        >
          {busy ? 'Menyimpan...' : savedMsg ? 'Tersimpan ✓' : 'Perbarui Status'}
        </Button>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------------------
// 3. Inventaris Celengan & NFC Chip (/admin/celengan)
// ------------------------------------------------------------------------------
function makeAutoSerial(cat: string) {
  const isCard = cat.includes('card')
  const prefix = isCard ? 'CRD' : 'CBF'
  const year = new Date().getFullYear()
  const randNum = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}-${year}-${randNum}`
}

function AdminInventoryPage({
  banks,
  orders,
  allUsers,
  refresh,
}: {
  banks: PiggyBank[]
  orders: PiggyBankOrder[]
  allUsers: Profile[]
  refresh: () => Promise<void>
}) {
  const [category, setCategory] = useState('chillbank-classic')
  const [serial, setSerial] = useState(() => makeAutoSerial('chillbank-classic'))
  const [name, setName] = useState('Celengan Chillbank')
  const [selectedTarget, setSelectedTarget] = useState('')
  const [owner, setOwner] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [search, setSearch] = useState('')
  const [nfcWritingId, setNfcWritingId] = useState<string | null>(null)

  function handleAutoGenerateSerial(cat = category) {
    setSerial(makeAutoSerial(cat))
  }

  function handleSelectTarget(val: string) {
    setSelectedTarget(val)
    if (!val) {
      setOwner('')
      setName('Celengan Chillbank')
      return
    }

    if (val.startsWith('order:')) {
      const orderId = val.replace('order:', '')
      const ord = orders.find((o) => o.id === orderId)
      if (ord) {
        setOwner(ord.user_id) // Tetap simpan UUID unik pengguna pemesan
        setName(`Celengan ${ord.recipient_name}`) // Nama identitas dari pemesan
        if (ord.product_model) {
          const matched = CELENGAN_CATALOG.find((c) =>
            ord.product_model?.toLowerCase().includes(c.name.toLowerCase())
          )
          if (matched) {
            setCategory(matched.id)
            setSerial(makeAutoSerial(matched.id))
          }
        }
      }
    } else if (val.startsWith('user:')) {
      const uid = val.replace('user:', '')
      const usr = allUsers.find((u) => u.id === uid)
      if (usr) {
        setOwner(usr.id) // Tetap simpan UUID unik
        setName(`Celengan ${usr.full_name || 'Keluarga'}`)
      }
    }
  }

  async function submitBank(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setMsg('')
    setErr('')
    try {
      const { data, error: rpcErr } = await supabase.rpc('admin_create_bank', {
        p_serial: serial.trim().toUpperCase(),
        p_name: name.trim(),
        p_owner_id: owner.trim() || null,
        p_category: category,
        p_color: 'emerald',
        p_nfc_uid: null,
      })
      if (rpcErr) throw rpcErr
      setMsg(`Celengan & Kartu ${serial} berhasil didaftarkan! (ID: ${data})`)
      // Otomatis generate nomor seri baru untuk kartu berikutnya
      setSerial(makeAutoSerial(category))
      setSelectedTarget('')
      setOwner('')
      setName('Celengan Chillbank')
      await refresh()
    } catch (e: any) {
      setErr(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleWriteNfcTag(bankSerial: string) {
    if (!isWebNfcSupported()) {
      alert('Perangkat/browser ini belum mendukung Web NFC. Silakan gunakan Google Chrome di smartphone Android.')
      return
    }
    setNfcWritingId(bankSerial)
    try {
      const ok = await writeNfcTag(bankSerial)
      if (ok) alert(`Berhasil memprogram chip NFC NTAG213 untuk nomor seri ${bankSerial}!`)
    } catch (e: any) {
      alert(`Gagal menulis NFC: ${e?.message || 'Pastikan chip NTAG213 berada di dekat antena HP'}`)
    } finally {
      setNfcWritingId(null)
    }
  }

  const filteredBanks = banks.filter(
    (b) =>
      b.serial.toLowerCase().includes(search.toLowerCase()) ||
      b.name.toLowerCase().includes(search.toLowerCase())
  )

  const pendingOrders = orders.filter((o) => ['pending', 'confirmed', 'processing'].includes(o.status))
  const otherOrders = orders.filter((o) => !['pending', 'confirmed', 'processing'].includes(o.status))

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">HARDWARE & INVENTARIS FISIK</div>
          <h1>Inventaris Celengan & Registrasi Kartu NFC</h1>
          <p>Registrasi produk fisik dengan nomor seri otomatis, penautan akun pemesan (UUID), dan pilihan 7 model perangkat.</p>
        </div>
      </div>

      <div className="dashboard-columns">
        {/* Form Pendaftaran Cepat */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Registrasi Celengan & Kartu Baru</h3>
              <p>Serial otomatis & penautan instan ke pemesan</p>
            </div>
          </div>

          <form className="stack-form" onSubmit={submitBank}>
            {/* 1. Pilih Pemesan / User Member */}
            <div className="field">
              <span>Pilih Pemesan / Member (Otomatis Isi Nama & UUID)</span>
              <select value={selectedTarget} onChange={(e) => handleSelectTarget(e.target.value)}>
                <option value="">-- Belum Ditautkan (Stok Baru / Siap Jual) --</option>
                {pendingOrders.length > 0 && (
                  <optgroup label="📦 Pesanan Menunggu Diproses">
                    {pendingOrders.map((o) => (
                      <option key={`order-${o.id}`} value={`order:${o.id}`}>
                        #{o.id.slice(0, 6).toUpperCase()} • {o.recipient_name} ({o.product_model || 'Celengan'})
                      </option>
                    ))}
                  </optgroup>
                )}
                {otherOrders.length > 0 && (
                  <optgroup label="📋 Riwayat Pesanan Lainnya">
                    {otherOrders.map((o) => (
                      <option key={`order-${o.id}`} value={`order:${o.id}`}>
                        #{o.id.slice(0, 6).toUpperCase()} • {o.recipient_name}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="👥 Daftar User Terdaftar (Keluarga)">
                  {allUsers.map((u) => (
                    <option key={`user-${u.id}`} value={`user:${u.id}`}>
                      {u.full_name || 'Member Chillbank'} ({u.role}) — {u.phone || u.id.slice(0, 8)}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Status UUID yang tertaut */}
            {owner ? (
              <div style={{ background: 'var(--primary-light)', padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--forest)' }}>
                ✓ <b>UUID Pemilik Tertaut:</b> <code>{owner}</code>
                <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: 2 }}>
                  Nama di atas adalah identitas visual; chip NFC dan database tetap menyimpan UUID unik ini.
                </small>
              </div>
            ) : (
              <div style={{ background: 'var(--bg-page)', padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                ℹ️ Celengan didaftarkan tanpa pemilik (siap dihubungkan kemudian hari oleh anggota).
              </div>
            )}

            {/* 2. Nama Identitas Celengan */}
            <Field
              label="Nama Identitas Celengan (Bisa Disesuaikan)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Contoh: Celengan Budi Santoso"
            />

            {/* 3. Serial Number Otomatis */}
            <div>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Nomor Seri Unik (Otomatis Dibuat)
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                <input
                  value={serial}
                  onChange={(e) => setSerial(e.target.value.toUpperCase())}
                  required
                  minLength={3}
                  maxLength={40}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    fontFamily: 'monospace',
                  }}
                />
                <Button
                  type="button"
                  kind="secondary"
                  onClick={() => handleAutoGenerateSerial(category)}
                  title="Generate nomor seri baru"
                >
                  <Sparkles size={16} /> Acak Serial
                </Button>
              </div>
            </div>

            {/* 4. Model Produk (7 Model) */}
            <div className="field">
              <span>Model Perangkat Fisik (7 Varian Model)</span>
              <select
                value={category}
                onChange={(e) => {
                  const newCat = e.target.value
                  setCategory(newCat)
                  handleAutoGenerateSerial(newCat)
                }}
              >
                <option value="chillbank-classic">1. Chillbank Smart Classic (Tabung ABS Minimalis)</option>
                <option value="chillbank-wooden">2. Chillbank Wooden Family Edition (Kayu Pinus Solid)</option>
                <option value="chillbank-junior">3. Chillbank Junior Kids Edition (Karakter Edukasi)</option>
                <option value="chillbank-card">4. Chillbank Smart Savings Card (Kartu Tipis Tap ATM)</option>
                <option value="chillbank-acrylic">5. Chillbank Acrylic Crystal Vault (Akrilik Transparan)</option>
                <option value="chillbank-leather">6. Chillbank Executive Leather Safe (Dompet Kulit)</option>
                <option value="chillbank-titanium">7. Chillbank Titanium Safe Edition (Brankas Logam)</option>
              </select>
            </div>

            {err && <div className="form-error">{err}</div>}
            {msg && <div className="form-success">{msg}</div>}

            <Button type="submit" disabled={busy} className="button-full">
              {busy ? 'Mendaftarkan Perangkat...' : 'Daftarkan Celengan / Kartu Baru'}
            </Button>
          </form>
        </section>

        {/* Daftar Celengan */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Daftar Inventaris ({banks.length})</h3>
              <p>Perangkat terdaftar & kontrol pemrograman NFC</p>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <input
              placeholder="Cari nomor seri, model, atau nama..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-page)',
              }}
            />
          </div>

          <div className="bank-list" style={{ maxHeight: 560, overflowY: 'auto' }}>
            {filteredBanks.map((b) => (
              <div className="bank-row" key={b.id} style={{ alignItems: 'flex-start' }}>
                <div className="bank-icon-box" style={{ marginTop: 2 }}>
                  <SmartphoneNfc size={20} />
                </div>
                <div className="bank-row-main">
                  <b>{b.name}</b>
                  <small style={{ display: 'block', margin: '2px 0' }}>
                    <code style={{ fontWeight: 700 }}>{b.serial}</code> • {b.category}
                  </small>
                  <small style={{ color: 'var(--text-muted)' }}>
                    Pemilik UUID: {b.owner_id ? <code>{b.owner_id.slice(0, 8)}...</code> : 'Belum Ditautkan'}
                  </small>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  <span className="badge badge-emerald">{b.status}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button
                      kind="ghost"
                      className="button-small"
                      title="Tulis URL ke Chip NFC NTAG213"
                      disabled={nfcWritingId === b.serial}
                      onClick={() => handleWriteNfcTag(b.serial)}
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    >
                      <Radio size={13} /> {nfcWritingId === b.serial ? 'Menulis...' : 'Tulis NFC'}
                    </Button>
                    <Link
                      to={`/c/${encodeURIComponent(b.serial)}`}
                      target="_blank"
                      className="button button-ghost button-small"
                      title="Buka Halaman Celengan"
                      style={{ padding: '4px 8px' }}
                    >
                      <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
            {!filteredBanks.length && (
              <EmptyState icon={<Wallet size={36} />} title="Celengan Tidak Ditemukan" text="Coba gunakan kata kunci pencarian lain." />
            )}
          </div>
        </section>
      </div>
    </>
  )
}

// ------------------------------------------------------------------------------
// 4. Manajemen Pengguna Platform (/admin/users)
// ------------------------------------------------------------------------------
function AdminUsersPage({
  users,
  currentUserId,
  refresh,
}: {
  users: Profile[]
  currentUserId: string
  refresh: () => Promise<void>
}) {
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const roleLabels: Record<FamilyRole, string> = {
    admin: 'Administrator',
    parent: 'Kepala Keluarga / Orang Tua',
    child: 'Anggota / Anak',
    member: 'Anggota Keluarga',
  }

  async function handleRoleChange(userId: string, newRole: FamilyRole) {
    if (!supabase) return
    setUpdatingId(userId)
    setMsg('')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)
      if (error) throw error
      setMsg(`Berhasil mengubah peran pengguna menjadi ${roleLabels[newRole]}.`)
      await refresh()
    } catch (err: any) {
      alert(`Gagal mengubah peran: ${err.message}`)
    } finally {
      setUpdatingId(null)
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.id.toLowerCase().includes(search.toLowerCase()) ||
      (u.phone && u.phone.includes(search))
  )

  const adminCount = users.filter((u) => u.role === 'admin').length
  const parentCount = users.filter((u) => u.role === 'parent').length
  const childCount = users.filter((u) => u.role === 'child' || u.role === 'member').length

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">MANAJEMEN HAK AKSES</div>
          <h1>Manajemen Pengguna & Anggota</h1>
          <p>Daftar seluruh akun keluarga terdaftar dan pengaturan peran administrator.</p>
        </div>
      </div>

      {/* KPI Pengguna */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <span className="stat-icon" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}>
            <Users size={20} />
          </span>
          <div>
            <b>{users.length} Akun</b>
            <small>Total Terdaftar di Sistem</small>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <ShieldCheck size={20} />
          </span>
          <div>
            <b>{adminCount} Admin</b>
            <small>Pengelola Platform</small>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon" style={{ background: 'var(--amber-light)', color: 'var(--amber)' }}>
            <UserRound size={20} />
          </span>
          <div>
            <b>{parentCount} Orang Tua</b>
            <small>Kepala Keluarga</small>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon" style={{ background: 'var(--rose-light)', color: 'var(--rose)' }}>
            <Sparkles size={20} />
          </span>
          <div>
            <b>{childCount} Anak / Anggota</b>
            <small>Penabung Cilik</small>
          </div>
        </div>
      </div>

      {msg && <div className="form-success" style={{ marginBottom: 16 }}>{msg}</div>}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Daftar Pengguna ({users.length})</h3>
            <p>Atur hak akses akun langsung dari tabel</p>
          </div>
          <input
            placeholder="Cari nama, ID, atau no. telepon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              minWidth: 240,
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredUsers.map((u) => (
            <div
              key={u.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-page)',
                border: '1px solid var(--border-light)',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span className="avatar" style={{ width: 44, height: 44, fontSize: '1.1rem' }}>
                  {(u.full_name || 'U').slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <b>{u.full_name || 'Pengguna Tanpa Nama'}</b>
                    {u.id === currentUserId && (
                      <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
                        Anda
                      </span>
                    )}
                  </div>
                  <small style={{ color: 'var(--text-muted)', display: 'block' }}>
                    ID: <code>{u.id.slice(0, 8)}...</code> {u.phone ? `• ${u.phone}` : ''}
                  </small>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <select
                  value={u.role || 'parent'}
                  disabled={updatingId === u.id}
                  onChange={(e) => handleRoleChange(u.id, e.target.value as FamilyRole)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    background: '#ffffff',
                    fontWeight: 600,
                    fontSize: '0.86rem',
                  }}
                >
                  <option value="admin">Administrator</option>
                  <option value="parent">Kepala Keluarga / Orang Tua</option>
                  <option value="child">Anggota / Anak</option>
                  <option value="member">Anggota Keluarga</option>
                </select>
                {updatingId === u.id && <small style={{ color: 'var(--primary)' }}>Menyimpan...</small>}
              </div>
            </div>
          ))}
          {!filteredUsers.length && (
            <EmptyState icon={<Users size={36} />} title="Pengguna Tidak Ditemukan" text="Coba cari dengan kata kunci lain." />
          )}
        </div>
      </section>
    </>
  )
}

// ------------------------------------------------------------------------------
// Root App Component & Authentication Handler
// ------------------------------------------------------------------------------
// ------------------------------------------------------------------------------
// Root App Component & Authentication Handler
// ------------------------------------------------------------------------------
export default function App() {
  const [sessionReady, setSessionReady] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [banks, setBanks] = useState<PiggyBank[]>([])
  const [entries, setEntries] = useState<SavingsEntry[]>([])
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [orders, setOrders] = useState<PiggyBankOrder[]>([])
  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [globalError, setGlobalError] = useState('')
  const [showScanner, setShowScanner] = useState(false)

  const location = useLocation()
  const navigate = useNavigate()
  const loadSeq = useRef(0)

  async function loadData(uid?: string): Promise<Profile | null> {
    const seq = ++loadSeq.current
    if (!supabase || !uid) {
      setProfile(null)
      setBanks([])
      setEntries([])
      setGoals([])
      setOrders([])
      setAllUsers([])
      setGlobalError('')
      setDataLoading(false)
      return null
    }

    setDataLoading(true)
    setGlobalError('')
    try {
      const readProfile = () =>
        supabase!.from('profiles').select('id,full_name,role,phone,bio,avatar_color').eq('id', uid).maybeSingle()

      let { data: p } = await readProfile()
      if (!p) {
        const { error: re } = await supabase.rpc('ensure_my_profile')
        if (re) console.warn('ensure_my_profile:', re.message)
        const r = await readProfile()
        p = r.data
      }

      const isAdmin = p?.role === 'admin'

      const [{ data: b }, { data: e }, { data: g }, { data: o }, { data: u }] = await Promise.all([
        supabase.from('piggy_banks').select('*').order('created_at', { ascending: false }),
        isAdmin
          ? Promise.resolve({ data: [] })
          : supabase.from('savings_entries').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(300),
        isAdmin
          ? Promise.resolve({ data: [] })
          : supabase.from('savings_goals').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('piggy_bank_orders').select('*').order('created_at', { ascending: false }),
        isAdmin
          ? supabase.from('profiles').select('*').order('created_at', { ascending: false })
          : Promise.resolve({ data: [] }),
      ])

      if (seq !== loadSeq.current) return (p as Profile) || null
      setProfile(p as Profile | null)
      setBanks((b || []) as PiggyBank[])
      setEntries((e || []) as SavingsEntry[])
      setGoals((g || []) as SavingsGoal[])
      setOrders((o || []) as PiggyBankOrder[])
      setAllUsers((u || []) as Profile[])
      return (p as Profile) || null
    } catch (e: any) {
      if (seq === loadSeq.current) {
        setGlobalError(e?.message || 'Gagal memuat profil')
      }
      return null
    } finally {
      if (seq === loadSeq.current) {
        setDataLoading(false)
      }
    }
  }

  useEffect(() => {
    if (!supabase) {
      setSessionReady(true)
      return
    }
    let alive = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return
      const uid = data.session?.user.id || null
      setUserId(uid)
      await loadData(uid || undefined)
      if (alive) setSessionReady(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user.id || null
      if (!session) {
        setUserId(null)
        setProfile(null)
        setDataLoading(false)
        return
      }
      setUserId(uid)
      void loadData(uid || undefined)
    })

    return () => {
      alive = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!sessionReady) return
    const protectedRoute = location.pathname.startsWith('/app') || location.pathname.startsWith('/admin')
    if (protectedRoute && !userId) {
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`, { replace: true })
    }
  }, [sessionReady, userId, location.pathname])

  async function refresh() {
    await loadData(userId || undefined)
  }

  async function handleAuth(mode: 'login' | 'register', email: string, pass: string, name?: string, role?: FamilyRole) {
    if (!supabase) throw new Error('Supabase belum dikonfigurasi.')
    const cleanEmail = email.trim().toLowerCase()
    const cleanPass = pass.trim()

    if (mode === 'register') {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPass,
        options: {
          data: {
            full_name: name?.trim() || 'Anggota Chillbank',
            role: role || 'parent',
          },
        },
      })
      if (error) throw error
      if (data.session && data.user) {
        setUserId(data.user.id)
        const loaded = await loadData(data.user.id)
        navigate(loaded?.role === 'admin' ? '/admin' : '/app', { replace: true })
        return
      }
      navigate('/login', {
        replace: true,
        state: { message: 'Pendaftaran berhasil. Silakan periksa email Anda jika konfirmasi email aktif.' },
      })
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass,
      })
      if (error) throw error
      setUserId(data.user.id)
      const loaded = await loadData(data.user.id)
      const params = new URLSearchParams(location.search)
      const next = params.get('next')
      if (next && next.startsWith('/') && !next.startsWith('/login')) {
        navigate(next, { replace: true })
      } else {
        navigate(loaded?.role === 'admin' ? '/admin' : '/app', { replace: true })
      }
    }
  }

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut()
    setUserId(null)
    setProfile(null)
    navigate('/')
  }

  function handleScanSuccess(serial: string) {
    navigate(`/c/${encodeURIComponent(serial.toUpperCase())}`)
  }

  if (!sessionReady) {
    return (
      <div className="loading-screen">
        <div className="avatar" style={{ width: 64, height: 64, animation: 'pulse 1.5s infinite' }}>
          <Wallet size={30} />
        </div>
        <p>Menyiapkan Chillbank Family...</p>
      </div>
    )
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage onOpenScan={() => setShowScanner(true)} />} />
        <Route
          path="/login"
          element={
            userId && profile ? (
              <Navigate replace to={profile.role === 'admin' ? '/admin' : '/app'} />
            ) : (
              <AuthPage mode="login" onAuth={(e, p) => handleAuth('login', e, p)} />
            )
          }
        />
        <Route
          path="/register"
          element={
            userId && profile ? (
              <Navigate replace to={profile.role === 'admin' ? '/admin' : '/app'} />
            ) : (
              <AuthPage mode="register" onAuth={(e, p, n, r) => handleAuth('register', e, p, n, r)} />
            )
          }
        />

        {/* Public Tap NFC / QR Scan Landing */}
        <Route
          path="/c/:serial"
          element={<NfcPublicPage user={profile} banks={banks} entries={entries} refresh={refresh} />}
        />

        {/* Authenticated Routes */}
        <Route
          path="/app"
          element={
            <Protected profile={profile} userId={userId} loading={dataLoading}>
              {profile?.role === 'admin' ? (
                <Navigate replace to="/admin" />
              ) : (
                <AppShell profile={profile!} onLogout={handleLogout} onOpenScan={() => setShowScanner(true)}>
                  <Dashboard
                    profile={profile!}
                    banks={banks}
                    entries={entries}
                    goals={goals}
                    refresh={refresh}
                    onOpenScan={() => setShowScanner(true)}
                  />
                </AppShell>
              )}
            </Protected>
          }
        />

        <Route
          path="/app/celengan"
          element={
            <Protected profile={profile} userId={userId} loading={dataLoading}>
              <AppShell profile={profile!} onLogout={handleLogout} onOpenScan={() => setShowScanner(true)}>
                <BanksPage banks={banks} entries={entries} refresh={refresh} profile={profile!} />
              </AppShell>
            </Protected>
          }
        />

        <Route
          path="/app/celengan/:id"
          element={
            <Protected profile={profile} userId={userId} loading={dataLoading}>
              <AppShell profile={profile!} onLogout={handleLogout} onOpenScan={() => setShowScanner(true)}>
                <BankDetailPage banks={banks} entries={entries} refresh={refresh} profile={profile!} />
              </AppShell>
            </Protected>
          }
        />

        <Route
          path="/app/target"
          element={
            <Protected profile={profile} userId={userId} loading={dataLoading}>
              {profile?.role === 'admin' ? (
                <Navigate replace to="/admin" />
              ) : (
                <AppShell profile={profile!} onLogout={handleLogout} onOpenScan={() => setShowScanner(true)}>
                  <GoalsPage goals={goals} banks={banks} entries={entries} refresh={refresh} />
                </AppShell>
              )}
            </Protected>
          }
        />

        <Route
          path="/app/riwayat"
          element={
            <Protected profile={profile} userId={userId} loading={dataLoading}>
              {profile?.role === 'admin' ? (
                <Navigate replace to="/admin" />
              ) : (
                <AppShell profile={profile!} onLogout={handleLogout} onOpenScan={() => setShowScanner(true)}>
                  <HistoryPage entries={entries} banks={banks} />
                </AppShell>
              )}
            </Protected>
          }
        />

        <Route
          path="/app/pesanan"
          element={
            <Protected profile={profile} userId={userId} loading={dataLoading}>
              {profile?.role === 'admin' ? (
                <Navigate replace to="/admin/pesanan" />
              ) : (
                <AppShell profile={profile!} onLogout={handleLogout} onOpenScan={() => setShowScanner(true)}>
                  <OrdersPage
                    orders={orders.filter((o) => o.user_id === userId)}
                    refresh={refresh}
                  />
                </AppShell>
              )}
            </Protected>
          }
        />

        <Route
          path="/app/profil"
          element={
            <Protected profile={profile} userId={userId} loading={dataLoading}>
              <AppShell profile={profile!} onLogout={handleLogout} onOpenScan={() => setShowScanner(true)}>
                <ProfilePage profile={profile!} refresh={refresh} />
              </AppShell>
            </Protected>
          }
        />

        {/* Dedicated Admin Routes */}
        <Route
          path="/admin"
          element={
            <Protected profile={profile} userId={userId} loading={dataLoading}>
              {profile?.role !== 'admin' ? (
                <Navigate replace to="/app" />
              ) : (
                <AppShell profile={profile!} onLogout={handleLogout} onOpenScan={() => setShowScanner(true)}>
                  <AdminDashboardPage
                    banks={banks}
                    orders={orders}
                    allUsers={allUsers}
                    onOpenScan={() => setShowScanner(true)}
                  />
                </AppShell>
              )}
            </Protected>
          }
        />

        <Route
          path="/admin/pesanan"
          element={
            <Protected profile={profile} userId={userId} loading={dataLoading}>
              {profile?.role !== 'admin' ? (
                <Navigate replace to="/app" />
              ) : (
                <AppShell profile={profile!} onLogout={handleLogout} onOpenScan={() => setShowScanner(true)}>
                  <AdminOrdersPage orders={orders} refresh={refresh} />
                </AppShell>
              )}
            </Protected>
          }
        />

        <Route
          path="/admin/celengan"
          element={
            <Protected profile={profile} userId={userId} loading={dataLoading}>
              {profile?.role !== 'admin' ? (
                <Navigate replace to="/app" />
              ) : (
                <AppShell profile={profile!} onLogout={handleLogout} onOpenScan={() => setShowScanner(true)}>
                  <AdminInventoryPage
                    banks={banks}
                    orders={orders}
                    allUsers={allUsers}
                    refresh={refresh}
                  />
                </AppShell>
              )}
            </Protected>
          }
        />

        <Route
          path="/admin/users"
          element={
            <Protected profile={profile} userId={userId} loading={dataLoading}>
              {profile?.role !== 'admin' ? (
                <Navigate replace to="/app" />
              ) : (
                <AppShell profile={profile!} onLogout={handleLogout} onOpenScan={() => setShowScanner(true)}>
                  <AdminUsersPage
                    users={allUsers}
                    currentUserId={userId!}
                    refresh={refresh}
                  />
                </AppShell>
              )}
            </Protected>
          }
        />

        <Route
          path="*"
          element={
            <PublicLayout>
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Halaman Tidak Ditemukan</h1>
                <p style={{ color: 'var(--text-muted)', margin: '8px 0 20px' }}>
                  Halaman yang Anda tuju mungkin sudah dipindahkan atau nomor seri celengan keliru.
                </p>
                <Link to="/" className="button button-primary">
                  Kembali ke Beranda
                </Link>
              </div>
            </PublicLayout>
          }
        />
      </Routes>

      {/* Global Interactive Scanner Modal (NFC + QR) */}
      {showScanner && (
        <ScanModal onClose={() => setShowScanner(false)} onScanSuccess={handleScanSuccess} />
      )}
    </>
  )
}

function Protected({
  children,
  profile,
  userId,
  loading,
}: {
  children: React.ReactNode
  profile: Profile | null
  userId: string | null
  loading?: boolean
  error?: string
}) {
  if (!userId) {
    return <div className="loading-screen">Mengalihkan ke halaman login...</div>
  }

  // Jika data masih dalam proses pengambilan atau profil belum siap, selalu tampilkan animasi loading halus tanpa error flash
  if (loading || !profile) {
    return (
      <div className="loading-screen">
        <div className="avatar" style={{ width: 58, height: 58, animation: 'pulse 1.5s infinite' }}>
          <Wallet size={28} />
        </div>
        <p style={{ fontWeight: 600, color: 'var(--primary)', marginTop: 8 }}>Memuat akun Chillbank...</p>
      </div>
    )
  }

  return <>{children}</>
}
