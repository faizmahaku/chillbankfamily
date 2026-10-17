import React, { useEffect, useRef, useState, FormEvent } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpRight, Banknote, ChartNoAxesCombined, CheckCircle2, ChevronRight, CircleHelp, Coins, CreditCard, Home, LogIn, LogOut, Menu, Plus, ShieldCheck, SmartphoneNfc, Target, UserRound, Wallet, X } from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import type { PiggyBank, Profile, SavingsEntry, SavingsGoal, PiggyBankOrder } from './types'

const rupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
const dateText = (s: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(s))
const errorText = (e: unknown) => {
  if (e instanceof Error) {
    if (e.message.includes('Invalid login credentials')) {
      return 'Email atau kata sandi salah. Pastikan akun sudah didaftarkan dan password sudah sesuai.'
    }
    if (e.message.includes('Email not confirmed')) {
      return 'Email belum dikonfirmasi. Periksa kotak masuk/spam email Anda atau matikan Confirm Email di Supabase.'
    }
    return e.message
  }
  return 'Terjadi kesalahan. Coba lagi.'
}
function ConfigNotice() {
  return <div className="notice"><CircleHelp size={20}/><div><b>Supabase belum dikonfigurasi</b><p>Buat file <code>.env.local</code> dari <code>.env.example</code>, isi URL dan publishable/anon key Supabase, lalu jalankan ulang aplikasi.</p></div></div>
}
function Brand({ light = false }: { light?: boolean }) {
  return <Link to="/" className={`brand ${light ? 'brand-light' : ''}`}><span className="brand-mark"><Wallet size={21}/></span><span>Nabungin<span className="brand-dot">.</span></span></Link>
}
function Button({ children, kind = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: 'primary' | 'secondary' | 'ghost' }) {
  return <button className={`button button-${kind}`} {...props}>{children}</button>
}
function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="field"><span>{label}</span><input {...props}/></label>
}
function AppShell({ children, profile, onLogout }: { children: React.ReactNode; profile: Profile | null; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  useEffect(() => setOpen(false), [location.pathname])
  const nav = [
    { to: '/app', label: 'Ringkasan', icon: Home, end: true },
    { to: '/app/celengan', label: 'Celengan saya', icon: Wallet },
    { to: '/app/pesanan', label: 'Pesan celengan', icon: CreditCard },
    { to: '/app/target', label: 'Target tabungan', icon: Target },
    { to: '/app/riwayat', label: 'Riwayat', icon: ChartNoAxesCombined },
    { to: '/app/profil', label: 'Profil', icon: UserRound },
  ]
  return <div className="app-layout">
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <Brand/>
      <div className="side-caption">MENU UTAMA</div>
      <nav className="side-nav">{nav.map(item => <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}><item.icon size={18}/>{item.label}</NavLink>)}
      {profile?.role === 'admin' && <><div className="side-caption side-caption-gap">ADMINISTRASI</div><NavLink to="/admin" className={({isActive}) => `side-link ${isActive ? 'active' : ''}`}><ShieldCheck size={18}/>Dashboard admin</NavLink></>}
      </nav>
      <div className="sidebar-bottom"><div className="mini-profile"><span className="avatar">{(profile?.full_name || 'N').slice(0,1).toUpperCase()}</span><div><b>{profile?.full_name || 'Anggota'}</b><small>{profile?.role === 'admin' ? 'Administrator' : 'Anggota Nabungin'}</small></div></div><button className="side-link logout-link" onClick={onLogout}><LogOut size={18}/>Keluar akun</button></div>
    </aside>
    {open && <button className="mobile-scrim" aria-label="Tutup menu" onClick={() => setOpen(false)}/>}
    <main className="app-main"><header className="app-topbar"><button className="mobile-menu" onClick={() => setOpen(!open)} aria-label="Buka menu">{open ? <X/> : <Menu/>}</button><div className="breadcrumb">Ruang tabungan <ChevronRight size={14}/> <span>{location.pathname.split('/').filter(Boolean).slice(-1)[0] || 'Dashboard'}</span></div><div className="topbar-right"><span className="online-dot"/> Data tersinkron</div></header><div className="page-content">{children}</div></main>
  </div>
}
function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="public-shell"><header className="public-nav"><Brand/><nav><a href="#cara-kerja">Cara kerja</a><a href="#fitur">Fitur</a></nav><div className="nav-actions"><Link className="nav-login" to="/login">Masuk</Link><Link className="button button-primary button-small" to="/register">Mulai menabung <ChevronRight size={16}/></Link></div></header>{children}<footer className="footer"><Brand/><span>© {new Date().getFullYear()} Nabungin. Catatan tabungan pribadi, bukan rekening bank.</span><Link to="/login">Masuk anggota</Link></footer></div>
}
function HomePage() {
  return <PublicLayout><section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot"/> KEBIASAAN KECIL, TUJUAN BESAR</div><h1>Menabung jadi lebih <span>berarti.</span></h1><p className="hero-lead">Celengan fisik yang terhubung ke catatan tabungan digital. Tempelkan HP, catat progres, dan dekatkan diri pada tujuanmu.</p><div className="hero-actions"><Link className="button button-primary button-large" to="/register">Buat akun gratis <ChevronRight size={18}/></Link><a className="text-link" href="#cara-kerja">Lihat cara kerja <ArrowDownLeft size={16}/></a></div><div className="trust-row"><span><CheckCircle2 size={16}/> Progres tersimpan</span><span><CheckCircle2 size={16}/> Akses lewat NFC</span></div></div><div className="hero-visual"><div className="visual-orbit orbit-one"/><div className="visual-orbit orbit-two"/><div className="coin coin-one">Rp</div><div className="coin coin-two">+</div><div className="can-shadow"/><div className="saving-can"><div className="can-lid"/><div className="can-slot"/><div className="can-label"><span className="can-spark">✳</span><b>nabungin<span>.</span></b><small>SEDIKIT DEMI SEDIKIT</small><div className="can-progress"><i/></div><small>GOAL IN PROGRESS</small></div><div className="can-nfc"><SmartphoneNfc size={18}/><span>NFC</span></div></div><div className="floating-card float-top"><span className="float-icon"><Target size={17}/></span><div><small>Target baru</small><b>Liburan impian</b></div><span className="float-check"><CheckCircle2 size={18}/></span></div><div className="floating-card float-bottom"><span className="float-icon green"><Coins size={18}/></span><div><small>Progres tabungan</small><b>Terus bertumbuh ✨</b></div></div></div></section><section className="stats-strip"><div><b>01</b><span>Celengan dengan identitas unik</span></div><div><b>02</b><span>Catatan tabungan dalam satu tempat</span></div><div><b>03</b><span>Target yang mudah dipantau</span></div></section><section className="section how-section" id="cara-kerja"><div className="section-heading"><div className="eyebrow">MUDAH DIMULAI</div><h2>Dari celengan ke <span>progres nyata.</span></h2><p>Tiga langkah sederhana untuk memulai perjalanan menabung.</p></div><div className="steps-grid"><article className="step-card"><div className="step-number">01</div><div className="step-icon"><Wallet/></div><h3>Miliki celengan</h3><p>Setiap celengan memiliki nomor unik dan tag NFC untuk membuka halaman digitalnya.</p></article><article className="step-card"><div className="step-number">02</div><div className="step-icon"><SmartphoneNfc/></div><h3>Tempelkan HP</h3><p>Buka halaman celengan melalui NFC atau pindai QR cadangan yang tersedia.</p></article><article className="step-card"><div className="step-number">03</div><div className="step-icon"><ChartNoAxesCombined/></div><h3>Catat progres</h3><p>Masuk ke akun, catat setoran, atur target, dan lihat perkembangan tabunganmu.</p></article></div></section><section className="feature-band" id="fitur"><div><div className="eyebrow eyebrow-light">SATU TEMPAT UNTUK TUJUANMU</div><h2>Setiap rupiah punya <span>cerita.</span></h2><p>Mulai dari target sederhana sampai rencana besar. Kamu yang menentukan tujuan, Nabungin membantu mencatat perjalanannya.</p><Link className="button button-white" to="/register">Mulai perjalanan <ChevronRight size={17}/></Link></div><div className="feature-list"><div><span><Target/></span><div><b>Target tabungan</b><small>Tentukan nominal dan tanggal tujuan.</small></div></div><div><span><ChartNoAxesCombined/></span><div><b>Riwayat tercatat</b><small>Lihat setoran dan penarikan sebelumnya.</small></div></div><div><span><ShieldCheck/></span><div><b>Privasi akun</b><small>Data tabungan hanya untuk pemilik akun.</small></div></div></div></section><section className="cta-section"><div className="cta-icon"><Coins size={27}/></div><h2>Mulai dari langkah kecil hari ini.</h2><p>Buat akun, tentukan tujuan, dan bangun kebiasaan menabungmu.</p><Link className="button button-primary button-large" to="/register">Buat akun Nabungin <ChevronRight size={18}/></Link></section></PublicLayout>
}
function AuthPage({ mode, onAuth }: { mode: 'login' | 'register'; onAuth: (email: string, password: string, name?: string) => Promise<void> }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const routeLocation = useLocation()
  useEffect(()=>{const state=routeLocation.state as {message?:string}|null;if(state?.message)setMessage(state.message)},[routeLocation.state])
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setMessage(''); setBusy(true)
    try { await onAuth(email, password, name); if (mode === 'register') setMessage('Pendaftaran berhasil. Jika konfirmasi email aktif, buka email untuk memverifikasi akun, lalu masuk.'); }
    catch (err) { setError(errorText(err)) } finally { setBusy(false) }
  }
  return <div className="auth-layout"><div className="auth-art"><Brand light/><div className="auth-art-copy"><div className="eyebrow eyebrow-light">SEDIKIT DEMI SEDIKIT</div><h1>Tujuan besar dimulai dari <span>hari ini.</span></h1><p>Bangun kebiasaan menabung yang terasa lebih terarah.</p><div className="auth-art-illustration"><div className="auth-circle"/><div className="auth-mini-can"><div className="mini-slot"/><Coins size={35}/><b>nabungin.</b></div><div className="auth-spark spark-a">✳</div><div className="auth-spark spark-b">✦</div></div></div><div className="auth-art-foot">Celengan fisik. Catatan digital. Tujuan nyata.</div></div><div className="auth-form-side"><Link to="/" className="back-home">← Kembali ke beranda</Link><div className="auth-form-wrap"><div className="auth-mobile-brand"><Brand/></div><div className="form-kicker">{mode === 'login' ? 'SELAMAT DATANG KEMBALI' : 'MULAI PERJALANANMU'}</div><h2>{mode === 'login' ? 'Masuk ke akunmu' : 'Buat akun baru'}</h2><p className="form-intro">{mode === 'login' ? 'Lanjutkan progres tabungan yang sudah kamu mulai.' : 'Satu akun untuk menyimpan target dan catatan tabunganmu.'}</p>{!isSupabaseConfigured && <ConfigNotice/>}{error && <div className="form-error">{error}</div>}{message && <div className="form-success">{message}</div>}<form onSubmit={submit} className="auth-form">{mode === 'register' && <Field label="Nama lengkap" value={name} onChange={e=>setName(e.target.value)} required autoComplete="name" placeholder="Nama kamu"/>}<Field label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" placeholder="nama@email.com"/><Field label="Kata sandi" type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} autoComplete={mode==='login'?'current-password':'new-password'} placeholder="Minimal 6 karakter"/><Button disabled={busy || !isSupabaseConfigured} type="submit">{busy ? 'Memproses...' : mode === 'login' ? <><LogIn size={18}/> Masuk ke akun</> : <>Buat akun <ChevronRight size={18}/></>}</Button></form><div className="auth-switch">{mode === 'login' ? <>Belum punya akun? <Link to="/register">Daftar sekarang</Link></> : <>Sudah punya akun? <Link to="/login">Masuk</Link></>}</div><p className="auth-legal">Dengan melanjutkan, kamu memahami bahwa saldo di aplikasi merupakan catatan manual, bukan saldo rekening bank.</p></div></div></div>
}
function Dashboard({ profile, banks, entries, goals, refresh }: { profile: Profile; banks: PiggyBank[]; entries: SavingsEntry[]; goals: SavingsGoal[]; refresh: () => Promise<void> }) {
  const balanceFor = (bankId: string) => entries.filter(e => e.piggy_bank_id === bankId).reduce((s,e)=>s+(e.entry_type==='deposit'?Number(e.amount):-Number(e.amount)),0)
  const total = banks.reduce((s,b)=>s+balanceFor(b.id),0)
  const deposits = entries.filter(e=>e.entry_type==='deposit').reduce((s,e)=>s+Number(e.amount),0)
  const withdrawals = entries.filter(e=>e.entry_type==='withdrawal').reduce((s,e)=>s+Number(e.amount),0)
  const recent = [...entries].sort((a,b)=>+new Date(b.created_at)-+new Date(a.created_at)).slice(0,5)
  const [showEntry, setShowEntry] = useState(false)
  const [entryBank, setEntryBank] = useState('')
  const [entryType, setEntryType] = useState<'deposit'|'withdrawal'>('deposit')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submitEntry(e: FormEvent) {
    e.preventDefault(); if (!supabase || !entryBank) return
    setBusy(true); setError('')
    try {
      const { error: rpcError } = await supabase.rpc('add_savings_entry', { p_piggy_bank_id: entryBank, p_entry_type: entryType, p_amount: Math.round(Number(amount)), p_note: note })
      if (rpcError) throw rpcError
      setShowEntry(false); setAmount(''); setNote(''); await refresh()
    } catch(err) { setError(errorText(err)) } finally { setBusy(false) }
  }
  return <><div className="page-heading"><div><div className="eyebrow">RINGKASAN TABUNGAN</div><h1>Halo, {profile.full_name?.split(' ')[0] || 'Teman'}! <span>✳</span></h1><p>Setiap langkah kecil membawamu lebih dekat pada tujuan.</p></div><Button onClick={()=>{setEntryBank(banks[0]?.id||'');setShowEntry(true)}} disabled={!banks.length}><Plus size={18}/> Catat tabungan</Button></div><div className="summary-card"><div className="summary-card-copy"><span className="summary-label"><Wallet size={16}/> TOTAL SALDO TERCATAT</span><h2>{rupiah(total)}</h2><p>Akumulasi catatan dari seluruh celenganmu.</p><div className="summary-meta"><span><ArrowDownLeft size={15}/> Setoran {rupiah(deposits)}</span><span><ArrowUpRight size={15}/> Penarikan {rupiah(withdrawals)}</span></div></div><div className="summary-graphic"><div className="graphic-ring ring-a"/><div className="graphic-ring ring-b"/><div className="graphic-coin"><Coins size={45}/></div><span className="graphic-spark">✳</span></div></div><div className="stat-grid"><div className="stat-card"><span className="stat-icon"><Wallet/></span><div><small>Celengan aktif</small><b>{banks.filter(b=>b.status==='active').length}</b><span>Terhubung ke akunmu</span></div></div><div className="stat-card"><span className="stat-icon stat-icon-gold"><Target/></span><div><small>Target tabungan</small><b>{goals.length}</b><span>Tujuan yang kamu buat</span></div></div><div className="stat-card"><span className="stat-icon stat-icon-blue"><ChartNoAxesCombined/></span><div><small>Total transaksi</small><b>{entries.length}</b><span>Catatan tersimpan</span></div></div></div><div className="dashboard-columns"><section className="panel"><div className="panel-heading"><div><h3>Celengan saya</h3><p>Celengan yang terhubung ke akunmu.</p></div><Link to="/app/celengan">Lihat semua <ChevronRight size={15}/></Link></div>{banks.length ? <div className="bank-list">{banks.slice(0,3).map((b,i)=><Link to={`/app/celengan/${b.id}`} className="bank-row" key={b.id}><div className={`bank-illustration bank-color-${i%3}`}><Wallet size={22}/></div><div className="bank-row-main"><b>{b.name}</b><small>{b.serial} · {b.status==='active'?'Aktif':'Nonaktif'}</small></div><div className="bank-row-balance"><b>{rupiah(balanceFor(b.id))}</b><small>Saldo tercatat</small></div><ChevronRight size={17}/></Link>)}</div> : <EmptyState icon={<Wallet/>} title="Belum ada celengan" text="Celengan akan muncul setelah admin mendaftarkan produk dan menghubungkannya ke akunmu."/>}</section><section className="panel"><div className="panel-heading"><div><h3>Aktivitas terbaru</h3><p>Riwayat transaksi terakhir.</p></div><Link to="/app/riwayat">Semua riwayat <ChevronRight size={15}/></Link></div>{recent.length ? <div className="activity-list">{recent.map(e=><Activity key={e.id} entry={e} bank={banks.find(b=>b.id===e.piggy_bank_id)}/>)}</div> : <EmptyState icon={<CreditCard/>} title="Belum ada aktivitas" text="Setoran dan penarikan yang kamu catat akan tampil di sini."/>}</section></div>{showEntry && <Modal title="Catat tabungan" onClose={()=>setShowEntry(false)}><form className="stack-form" onSubmit={submitEntry}><label className="field"><span>Celengan</span><select value={entryBank} onChange={e=>setEntryBank(e.target.value)} required>{banks.map(b=><option key={b.id} value={b.id}>{b.name} · {b.serial}</option>)}</select></label><div className="toggle-choice"><button type="button" className={entryType==='deposit'?'selected':''} onClick={()=>setEntryType('deposit')}><ArrowDownLeft size={17}/> Setoran</button><button type="button" className={entryType==='withdrawal'?'selected':''} onClick={()=>setEntryType('withdrawal')}><ArrowUpRight size={17}/> Penarikan</button></div><Field label="Nominal (rupiah)" type="number" min="1" step="1" value={amount} onChange={e=>setAmount(e.target.value)} required placeholder="Contoh: 10000"/><Field label="Catatan (opsional)" value={note} onChange={e=>setNote(e.target.value)} placeholder="Contoh: Menabung hari Senin"/>{error && <div className="form-error">{error}</div>}<Button type="submit" disabled={busy}>{busy?'Menyimpan...':'Simpan catatan'}</Button><p className="fine-print">Saldo ini adalah catatan manual yang kamu masukkan sendiri.</p></form></Modal>}</>
}
function Activity({ entry, bank }: { entry: SavingsEntry; bank?: PiggyBank }) {
  const deposit = entry.entry_type === 'deposit'
  return <div className="activity-row"><span className={`activity-icon ${deposit?'deposit':'withdrawal'}`}>{deposit?<ArrowDownLeft size={17}/>:<ArrowUpRight size={17}/>}</span><div className="activity-main"><b>{deposit?'Setoran':'Penarikan'}</b><small>{bank?.name || 'Celengan'} · {dateText(entry.created_at)}{entry.note?` · ${entry.note}`:''}</small></div><strong className={deposit?'amount-positive':'amount-negative'}>{deposit?'+':'−'}{rupiah(Number(entry.amount))}</strong></div>
}
function EmptyState({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="empty-state"><span>{icon}</span><b>{title}</b><p>{text}</p></div>
}
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="modal"><div className="modal-heading"><h3>{title}</h3><button onClick={onClose} aria-label="Tutup"><X size={20}/></button></div>{children}</section></div>
}
function BanksPage({ banks, entries, refresh, profile }: { banks: PiggyBank[]; entries: SavingsEntry[]; refresh: () => Promise<void>; profile: Profile }) {
  const [showEntry,setShowEntry]=useState(false)
  const [selected,setSelected]=useState<PiggyBank|null>(null)
  const balance=(id:string)=>entries.filter(e=>e.piggy_bank_id===id).reduce((s,e)=>s+(e.entry_type==='deposit'?Number(e.amount):-Number(e.amount)),0)
  return <><div className="page-heading"><div><div className="eyebrow">PRODUK TERHUBUNG</div><h1>Celengan saya</h1><p>Semua celengan fisik yang terhubung dengan akunmu.</p></div></div>{banks.length?<div className="bank-cards">{banks.map((b,i)=><article className="bank-card" key={b.id}><div className={`bank-card-art bank-color-${i%3}`}><div className="bank-card-top"><span>NABUNGIN.</span><span className="bank-status">{b.status==='active'?'AKTIF':b.status.toUpperCase()}</span></div><div className="bank-card-coin"><Coins size={35}/></div><div className="bank-card-bottom"><b>{b.name}</b><small>{b.serial}</small></div><div className="bank-card-nfc"><SmartphoneNfc/></div></div><div className="bank-card-info"><div><small>Saldo tercatat</small><b>{rupiah(balance(b.id))}</b></div><button className="button button-secondary button-small" onClick={()=>setSelected(b)}>Kelola <ChevronRight size={15}/></button></div></article>)}</div>:<EmptyState icon={<Wallet/>} title="Celengan belum tersedia" text="Hubungi admin atau tunggu sampai celengan didaftarkan dan ditautkan ke akunmu."/>}{selected&&<Modal title={selected.name} onClose={()=>setSelected(null)}><div className="bank-detail-serial"><span>Nomor seri</span><b>{selected.serial}</b><span>Status: {selected.status}</span></div><div className="detail-balance"><small>Saldo tercatat</small><b>{rupiah(balance(selected.id))}</b></div><Button onClick={()=>{setSelected(null);setShowEntry(true)}}><Plus size={17}/> Catat transaksi</Button>{showEntry&&<div className="inline-entry-note">Buka Ringkasan untuk menggunakan formulir transaksi.</div>}<p className="fine-print">Catatan tabungan terhubung dengan akun {profile.full_name}. Tag NFC tidak mengukur uang fisik.</p></Modal>}</>
}
function BankDetailPage({ banks, entries }: { banks: PiggyBank[]; entries: SavingsEntry[] }) {
  const { id } = useParams()
  const bank = banks.find(b=>b.id===id)
  const items = entries.filter(e=>e.piggy_bank_id===id).sort((a,b)=>+new Date(b.created_at)-+new Date(a.created_at))
  const balance=items.reduce((s,e)=>s+(e.entry_type==='deposit'?Number(e.amount):-Number(e.amount)),0)
  if (!bank) return <EmptyState icon={<Wallet/>} title="Celengan tidak ditemukan" text="Celengan ini tidak terhubung dengan akunmu."/>
  return <><div className="page-heading"><div><div className="eyebrow">{bank.serial}</div><h1>{bank.name}</h1><p>Ringkasan dan riwayat untuk celengan ini.</p></div><Link className="button button-secondary" to="/app/celengan">Kembali</Link></div><div className="summary-card compact-summary"><div className="summary-card-copy"><span className="summary-label"><Wallet size={16}/> SALDO TERCATAT</span><h2>{rupiah(balance)}</h2><p>Status celengan: {bank.status}</p></div><div className="summary-graphic"><Wallet size={55}/></div></div><section className="panel standalone-panel"><div className="panel-heading"><div><h3>Riwayat celengan</h3><p>{items.length} transaksi</p></div></div>{items.length?items.map(e=><Activity key={e.id} entry={e} bank={bank}/>):<EmptyState icon={<CreditCard/>} title="Belum ada transaksi" text="Catatan tabungan akan tampil setelah transaksi dibuat."/ >}</section></>
}
function GoalsPage({ goals, refresh }: { goals: SavingsGoal[]; refresh: () => Promise<void> }) {
  const [show,setShow]=useState(false); const [name,setName]=useState(''); const [amount,setAmount]=useState(''); const [date,setDate]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false)
  async function submit(e:FormEvent){e.preventDefault();if(!supabase)return;setBusy(true);setError('');try{const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Sesi login berakhir. Silakan masuk lagi.');const {error}=await supabase.from('savings_goals').insert({user_id:user.id,name,target_amount:Math.round(Number(amount)),target_date:date||null});if(error)throw error;setShow(false);setName('');setAmount('');setDate('');await refresh()}catch(err){setError(errorText(err))}finally{setBusy(false)}}
  async function remove(id:string){if(!supabase||!confirm('Hapus target ini?'))return;const {error}=await supabase.from('savings_goals').delete().eq('id',id);if(error)alert(error.message);else await refresh()}
  return <><div className="page-heading"><div><div className="eyebrow">LANGKAH MENUJU IMPIAN</div><h1>Target tabungan</h1><p>Tentukan tujuan yang ingin kamu capai.</p></div><Button onClick={()=>setShow(true)}><Plus size={18}/> Buat target</Button></div>{goals.length?<div className="goal-grid">{goals.map(g=><article className="goal-card" key={g.id}><div className="goal-card-top"><span className="goal-icon"><Target/></span><button className="icon-button" onClick={()=>remove(g.id)} aria-label="Hapus target"><X size={17}/></button></div><h3>{g.name}</h3><div className="goal-amount">{rupiah(Number(g.target_amount))}</div><div className="goal-progress"><i style={{width:'0%'}}/></div><div className="goal-foot"><span>0% tercapai</span><span>{g.target_date?`Target ${dateText(g.target_date)}`:'Tanpa batas tanggal'}</span></div><p className="fine-print">Progres target akan dihitung dari saldo celengan setelah target dihubungkan ke celengan.</p></article>)}</div>:<EmptyState icon={<Target/>} title="Belum ada target" text="Buat target pertama, misalnya dana darurat, gadget baru, atau liburan."/>}{show&&<Modal title="Buat target tabungan" onClose={()=>setShow(false)}><form className="stack-form" onSubmit={submit}><Field label="Nama target" value={name} onChange={e=>setName(e.target.value)} required maxLength={100} placeholder="Contoh: Dana darurat"/><Field label="Nominal target (rupiah)" type="number" min="1" value={amount} onChange={e=>setAmount(e.target.value)} required placeholder="1000000"/><Field label="Tanggal target (opsional)" type="date" value={date} onChange={e=>setDate(e.target.value)}/>{error&&<div className="form-error">{error}</div>}<Button type="submit" disabled={busy}>{busy?'Menyimpan...':'Simpan target'}</Button></form></Modal>}</>
}
function HistoryPage({ entries, banks }: { entries: SavingsEntry[]; banks: PiggyBank[] }) {
  const [filter,setFilter]=useState('all')
  const filtered=entries.filter(e=>filter==='all'||e.entry_type===filter).sort((a,b)=>+new Date(b.created_at)-+new Date(a.created_at))
  return <><div className="page-heading"><div><div className="eyebrow">CATATAN KEUANGAN</div><h1>Riwayat transaksi</h1><p>Semua setoran dan penarikan yang kamu catat.</p></div></div><div className="filter-tabs"><button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>Semua</button><button className={filter==='deposit'?'active':''} onClick={()=>setFilter('deposit')}>Setoran</button><button className={filter==='withdrawal'?'active':''} onClick={()=>setFilter('withdrawal')}>Penarikan</button></div><section className="panel history-panel">{filtered.length?filtered.map(e=><Activity key={e.id} entry={e} bank={banks.find(b=>b.id===e.piggy_bank_id)}/>):<EmptyState icon={<CreditCard/>} title="Tidak ada transaksi" text="Transaksi yang sesuai filter akan tampil di sini."/>}</section></>
}
function OrdersPage({ orders, refresh }: { orders: PiggyBankOrder[]; refresh: () => Promise<void> }) {
  const [recipient,setRecipient]=useState(''); const [phone,setPhone]=useState(''); const [address,setAddress]=useState(''); const [quantity,setQuantity]=useState('1'); const [note,setNote]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [message,setMessage]=useState('')
  async function submit(e:FormEvent){e.preventDefault();if(!supabase)return;setBusy(true);setError('');setMessage('');try{const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Sesi login berakhir. Silakan masuk lagi.');const {error}=await supabase.from('piggy_bank_orders').insert({user_id:user.id,recipient_name:recipient,phone,address,quantity:Number(quantity),note,status:'pending'});if(error)throw error;setMessage('Pesanan terkirim. Admin akan memproses pesananmu.');setRecipient('');setPhone('');setAddress('');setQuantity('1');setNote('');await refresh()}catch(err){setError(errorText(err))}finally{setBusy(false)}}
  async function confirmReceived(order: PiggyBankOrder){if(!supabase||!confirm('Konfirmasi bahwa celengan sudah kamu terima?'))return;const {error}=await supabase.from('piggy_bank_orders').update({status:'received'}).eq('id',order.id);if(error)alert(error.message);else await refresh()}
  const statusLabel:Record<string,string>={pending:'Menunggu admin',confirmed:'Pesanan dikonfirmasi',processing:'Sedang disiapkan',shipped:'Dalam pengiriman',delivered:'Terkirim — konfirmasi penerimaan',received:'Sudah diterima',cancelled:'Dibatalkan'}
  return <><div className="page-heading"><div><div className="eyebrow">CELENGAN FISIK NABUNGIN</div><h1>Pesan celengan</h1><p>Pesan celengan fisik untuk mulai membangun kebiasaan menabung.</p></div></div><div className="admin-grid"><section className="panel"><div className="panel-heading"><div><h3>Formulir pemesanan</h3><p>Pastikan alamat dan nomor HP sudah benar.</p></div></div><form className="stack-form" onSubmit={submit}><Field label="Nama penerima" value={recipient} onChange={e=>setRecipient(e.target.value)} required maxLength={120} placeholder="Nama sesuai penerima paket"/><Field label="Nomor WhatsApp / telepon" value={phone} onChange={e=>setPhone(e.target.value)} required maxLength={30} placeholder="08xxxxxxxxxx"/><label className="field"><span>Alamat lengkap</span><textarea value={address} onChange={e=>setAddress(e.target.value)} required maxLength={1000} rows={4} placeholder="Jalan, RT/RW, kelurahan, kecamatan, kota, kode pos"/></label><Field label="Jumlah celengan" type="number" min="1" max="10" value={quantity} onChange={e=>setQuantity(e.target.value)} required/><label className="field"><span>Catatan (opsional)</span><textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={500} rows={2} placeholder="Warna atau permintaan khusus"/></label>{error&&<div className="form-error">{error}</div>}{message&&<div className="form-success">{message}</div>}<Button type="submit" disabled={busy}>{busy?'Mengirim pesanan...':'Kirim pesanan celengan'}</Button><p className="fine-print">Harga, biaya pengiriman, dan metode pembayaran dikonfirmasi oleh admin sebelum pesanan diproses.</p></form></section><section className="panel"><div className="panel-heading"><div><h3>Pesanan saya</h3><p>Pantau proses pesanan sampai celengan tiba.</p></div></div>{orders.length?orders.map(o=><article className="order-card" key={o.id}><div className="order-card-top"><b>Pesanan #{o.id.slice(0,8).toUpperCase()}</b><span className="status-pill">{statusLabel[o.status]||o.status}</span></div><p>{o.quantity} celengan · {dateText(o.created_at)}</p><small>Penerima: {o.recipient_name} · {o.phone}</small><small>Alamat: {o.address}</small>{o.tracking_number&&<p className="order-tracking">Nomor resi: <b>{o.tracking_number}</b></p>}{o.admin_note&&<p className="fine-print">Catatan admin: {o.admin_note}</p>}{o.status==='delivered'&&<Button onClick={()=>confirmReceived(o)}>Konfirmasi celengan diterima</Button>}</article>):<EmptyState icon={<CreditCard/>} title="Belum ada pesanan" text="Isi formulir di samping untuk memesan celengan fisik pertama."/>}</section></div></>
}

function NfcPage({ user, banks, entries }: { user: Profile | null; banks: PiggyBank[]; entries: SavingsEntry[] }) {
  const { serial = '' }=useParams(); const navigate=useNavigate()
  const [bank,setBank]=useState<{serial:string;name:string;status:string}|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState('')
  useEffect(()=>{let alive=true;(async()=>{if(!supabase){setLoading(false);return}const {data,error}=await supabase.rpc('public_bank_lookup',{p_serial:serial});if(!alive)return;if(error)setError(error.message);else setBank(data?.[0]||null);setLoading(false)})();return()=>{alive=false}},[serial])
  const owned=banks.find(b=>b.serial.toUpperCase()===serial.toUpperCase())
  const ownedBalance=owned ? entries.filter(e=>e.piggy_bank_id===owned.id).reduce((sum,e)=>sum+(e.entry_type==='deposit'?Number(e.amount):-Number(e.amount)),0) : 0
  return <div className="nfc-page"><header><Brand/><span className="secure-label"><ShieldCheck size={16}/> NFC CELENGAN</span></header><div className="nfc-content"><div className="nfc-hero-icon"><SmartphoneNfc size={34}/></div><div className="eyebrow">HALAMAN CELENGAN DIGITAL</div><h1>Celenganmu, lebih dekat dengan tujuan.</h1><p className="nfc-intro">Kamu membuka halaman celengan melalui NFC atau QR.</p>{loading?<div className="nfc-product-card">Memeriksa nomor seri...</div>:error?<div className="form-error">{error}</div>:!bank?<div className="nfc-product-card"><div className="nfc-product-icon"><Wallet size={28}/></div><b>Celengan belum terdaftar</b><p>Nomor seri <strong>{serial}</strong> belum terdaftar atau sudah dinonaktifkan.</p></div>:<div className="nfc-product-card"><div className="nfc-product-icon"><Wallet size={28}/></div><span className="status-pill"><span/> PRODUK TERDAFTAR</span><h2>{bank.name}</h2><p>Nomor seri: <b>{bank.serial}</b></p>{user&&owned?<><div className="nfc-divider"/><div className="nfc-balance"><small>Saldo tercatat</small><b>{rupiah(ownedBalance)}</b><small>Buka dashboard untuk melihat saldo dan riwayat lengkap.</small></div><Button onClick={()=>navigate(`/app/celengan/${owned.id}`)}>Buka celengan saya <ChevronRight size={17}/></Button></>:user?<><p className="nfc-hint">Celengan ini belum terhubung ke akunmu. Hubungi admin untuk menghubungkan kepemilikan.</p><Button kind="secondary" onClick={()=>navigate('/app/celengan')}>Lihat celengan akun</Button></>:<><div className="nfc-hint"><ShieldCheck size={17}/><span>Masuk ke akun untuk mengakses catatan tabungan pribadi.</span></div><Link className="button button-primary" to={`/login?next=${encodeURIComponent(`/c/${serial}`)}`}>Masuk untuk melanjutkan <ChevronRight size={17}/></Link><Link className="nfc-register-link" to="/register">Belum punya akun? Daftar</Link></>}</div>}<p className="nfc-footnote">Nabungin adalah alat pencatatan tabungan pribadi. Nominal di aplikasi merupakan catatan manual, bukan pengukuran uang fisik atau rekening bank.</p><Link className="nfc-home" to="/">Tentang Nabungin</Link></div></div>
}
function AdminPage({ profile, banks, orders, refresh }: { profile: Profile; banks: PiggyBank[]; orders: PiggyBankOrder[]; refresh: () => Promise<void> }) {
  const [serial,setSerial]=useState(''); const [name,setName]=useState('Celengan Baru'); const [owner,setOwner]=useState(''); const [error,setError]=useState(''); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false)
  async function submit(e:FormEvent){e.preventDefault();if(!supabase)return;setBusy(true);setError('');setMessage('');try{const {data,error}=await supabase.rpc('admin_create_bank',{p_serial:serial,p_name:name,p_owner_id:owner.trim()||null});if(error)throw error;setMessage(`Celengan berhasil dibuat. ID: ${data}`);setSerial('');await refresh()}catch(err){setError(errorText(err))}finally{setBusy(false)}}
  async function updateOrder(id:string,status:PiggyBankOrder['status'],tracking_number?:string){if(!supabase)return;const {error}=await supabase.from('piggy_bank_orders').update({status,tracking_number:tracking_number||null}).eq('id',id);if(error)alert(error.message);else await refresh()}
  if(profile.role!=='admin')return <EmptyState icon={<ShieldCheck/>} title="Akses admin diperlukan" text="Akun ini tidak memiliki izin administrator."/>
  return <><div className="page-heading"><div><div className="eyebrow">PENGELOLAAN PLATFORM</div><h1>Dashboard admin</h1><p>Daftarkan celengan dan tautkan ke anggota.</p></div></div><div className="admin-grid"><section className="panel admin-form-panel"><div className="panel-heading"><div><h3>Daftarkan celengan</h3><p>Buat identitas produk untuk tag NFC.</p></div></div><form className="stack-form" onSubmit={submit}><Field label="Nomor seri" value={serial} onChange={e=>setSerial(e.target.value.toUpperCase())} required minLength={3} maxLength={40} pattern="[A-Za-z0-9-]+" placeholder="NBG-0001"/><Field label="Nama celengan" value={name} onChange={e=>setName(e.target.value)} required maxLength={100}/><Field label="UUID pemilik (opsional)" value={owner} onChange={e=>setOwner(e.target.value)} placeholder="UUID dari profiles"/><p className="fine-print">Untuk produk yang sudah dibeli, masukkan UUID akun pemilik. UUID dapat dilihat di Supabase Authentication → Users.</p>{error&&<div className="form-error">{error}</div>}{message&&<div className="form-success">{message}</div>}<Button type="submit" disabled={busy}>{busy?'Mendaftarkan...':'Daftarkan celengan'}</Button></form></section><section className="panel"><div className="panel-heading"><div><h3>Celengan terdaftar</h3><p>{banks.length} produk terhubung dengan akun admin</p></div></div>{banks.length?banks.map(b=><div className="bank-row" key={b.id}><div className="bank-illustration"><Wallet size={20}/></div><div className="bank-row-main"><b>{b.name}</b><small>{b.serial}</small></div><span className="status-pill">{b.status}</span></div>):<EmptyState icon={<Wallet/>} title="Belum ada produk" text="Produk yang berhasil dibuat akan muncul di sini jika terhubung ke akunmu."/ >}</section></div><section className="panel standalone-panel"><div className="panel-heading"><div><h3>Pesanan member</h3><p>Perbarui status pesanan dan masukkan resi setelah dikirim.</p></div></div>{orders.length?orders.map(o=><AdminOrder key={o.id} order={o} onUpdate={updateOrder}/>):<EmptyState icon={<CreditCard/>} title="Belum ada pesanan" text="Pesanan member akan muncul di sini."/>}</section></>
}
function AdminOrder({order,onUpdate}:{order:PiggyBankOrder;onUpdate:(id:string,status:PiggyBankOrder['status'],tracking?:string)=>Promise<void>}){const [status,setStatus]=useState(order.status);const [tracking,setTracking]=useState(order.tracking_number||'');const [busy,setBusy]=useState(false);return <div className="admin-order"><div className="order-card-top"><b>#{order.id.slice(0,8).toUpperCase()} · {order.recipient_name}</b><span className="status-pill">{order.quantity} pcs</span></div><small>{order.phone}</small><p>{order.address}</p>{order.note&&<small>Catatan: {order.note}</small>}<div className="order-admin-controls"><label className="field"><span>Status</span><select value={status} onChange={e=>setStatus(e.target.value as PiggyBankOrder['status'])}><option value="pending">Menunggu admin</option><option value="confirmed">Dikonfirmasi</option><option value="processing">Diproses</option><option value="shipped">Dikirim</option><option value="delivered">Terkirim</option><option value="received">Diterima member</option><option value="cancelled">Dibatalkan</option></select></label><label className="field"><span>Nomor resi (opsional)</span><input value={tracking} onChange={e=>setTracking(e.target.value)} placeholder="Nomor resi"/></label><Button disabled={busy} onClick={async()=>{setBusy(true);await onUpdate(order.id,status,tracking);setBusy(false)}}>{busy?'Menyimpan...':'Simpan status'}</Button></div></div>}
function ProfilePage({ profile, refresh }: { profile: Profile; refresh: () => Promise<void> }) {
  const [name,setName]=useState(profile.full_name||'');const [phone,setPhone]=useState(profile.phone||'');const [bio,setBio]=useState(profile.bio||'');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('')
  async function submit(e:FormEvent){e.preventDefault();if(!supabase)return;setBusy(true);setError('');setMessage('');try{const {error}=await supabase.from('profiles').update({full_name:name,phone,bio}).eq('id',profile.id);if(error)throw error;await refresh();setMessage('Profil berhasil disimpan.')}catch(err){setError(errorText(err))}finally{setBusy(false)}}
  return <><div className="page-heading"><div><div className="eyebrow">AKUNMU</div><h1>Profil</h1><p>Lengkapi informasi agar akunmu siap digunakan.</p></div></div><section className="panel profile-panel"><div className="profile-large-avatar">{(name||'N').slice(0,1).toUpperCase()}</div><h2>{name||'Anggota Nabungin'}</h2><p>{profile.role==='admin'?'Administrator':'Anggota'}</p><form className="stack-form profile-edit-form" onSubmit={submit}><Field label="Nama lengkap" value={name} onChange={e=>setName(e.target.value)} required maxLength={120}/><Field label="Nomor telepon (opsional)" value={phone} onChange={e=>setPhone(e.target.value)} maxLength={30} placeholder="08xxxxxxxxxx"/><label className="field"><span>Tentang saya (opsional)</span><textarea value={bio} onChange={e=>setBio(e.target.value)} rows={3} maxLength={500} placeholder="Ceritakan tujuan menabungmu..."/></label>{error&&<div className="form-error">{error}</div>}{message&&<div className="form-success">{message}</div>}<Button type="submit" disabled={busy}>{busy?'Menyimpan...':'Simpan profil'}</Button></form><div className="profile-info"><span>ID akun</span><code>{profile.id}</code></div></section></>
}
export default function App() {
  const [sessionReady,setSessionReady]=useState(false)
  const [userId,setUserId]=useState<string|null>(null)
  const [profile,setProfile]=useState<Profile|null>(null)
  const [banks,setBanks]=useState<PiggyBank[]>([])
  const [entries,setEntries]=useState<SavingsEntry[]>([])
  const [goals,setGoals]=useState<SavingsGoal[]>([])
  const [orders,setOrders]=useState<PiggyBankOrder[]>([])
  const [globalError,setGlobalError]=useState('')
  const location=useLocation(); const navigate=useNavigate()
  const loadSeq=useRef(0)
  async function loadData(uid?:string) {
    const seq=++loadSeq.current
    if(!supabase||!uid){setProfile(null);setBanks([]);setEntries([]);setGoals([]);setOrders([]);setGlobalError('');return}
    const readProfile=()=>supabase!.from('profiles').select('id,full_name,role,phone,bio').eq('id',uid).maybeSingle()
    let {data:p,error:pe}=await readProfile()
    if(!p&&!pe){
      // Profil belum ada (trigger belum terpasang / akun lama): minta database membuatkannya.
      const {error:re}=await supabase.rpc('ensure_my_profile')
      if(re)pe=re
      else{const r=await readProfile();p=r.data;pe=r.error}
    }
    const [{data:b,error:be},{data:e,error:ee},{data:g,error:ge},{data:o,error:oe}] = await Promise.all([
      supabase.from('piggy_banks').select('id,serial,owner_id,name,status,created_at').order('created_at',{ascending:false}),
      supabase.from('savings_entries').select('id,piggy_bank_id,user_id,entry_type,amount,note,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(200),
      supabase.from('savings_goals').select('id,user_id,name,target_amount,target_date,created_at').eq('user_id',uid).order('created_at',{ascending:false}),
      supabase.from('piggy_bank_orders').select('id,user_id,recipient_name,phone,address,quantity,note,status,tracking_number,admin_note,created_at,updated_at').order('created_at',{ascending:false})
    ])
    if(seq!==loadSeq.current)return // ada pemuatan yang lebih baru; abaikan hasil lama
    const err=pe||be||ee||ge||oe
    setGlobalError(err?err.message:'')
    setProfile(p as Profile|null);setBanks((b||[]) as PiggyBank[]);setEntries((e||[]) as SavingsEntry[]);setGoals((g||[]) as SavingsGoal[]);setOrders((o||[]) as PiggyBankOrder[])
  }
  useEffect(()=>{
    if(!supabase){setSessionReady(true);return}
    let alive=true
    supabase.auth.getSession().then(async({data})=>{if(!alive)return;const uid=data.session?.user.id||null;setUserId(uid);await loadData(uid||undefined);if(alive)setSessionReady(true)})
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{const uid=session?.user.id||null;setUserId(uid);setTimeout(()=>{void loadData(uid||undefined)},0)})
    return()=>{alive=false;subscription.unsubscribe()}
  },[])
  useEffect(()=>{if(!sessionReady)return;const protectedRoute=location.pathname.startsWith('/app')||location.pathname.startsWith('/admin');if(protectedRoute&&!userId)navigate(`/login?next=${encodeURIComponent(location.pathname)}`,{replace:true})},[sessionReady,userId,location.pathname])
  async function refresh(){await loadData(userId||undefined)}
  async function auth(mode:'login'|'register',email:string,password:string,name?:string) {
    if(!supabase)throw new Error('Supabase belum dikonfigurasi.')
    const cleanEmail = email.trim().toLowerCase()
    const cleanPassword = password.trim()
    if(mode==='register'){
      const {data,error}=await supabase.auth.signUp({email:cleanEmail,password:cleanPassword,options:{data:{full_name:name?.trim()||''}}})
      if(error)throw error
      if(data.session && data.user){
        setUserId(data.user.id);
        await loadData(data.user.id);
        navigate('/app',{replace:true});
        return;
      }
      navigate('/login',{replace:true,state:{message:'Pendaftaran berhasil. Silakan periksa email untuk konfirmasi (jika aktif) lalu masuk.'}})
    } else {
      const {data,error}=await supabase.auth.signInWithPassword({email:cleanEmail,password:cleanPassword})
      if(error)throw error
      setUserId(data.user.id);await loadData(data.user.id)
      const params=new URLSearchParams(location.search);const next=params.get('next')
      navigate(next&&next.startsWith('/')?next:'/app',{replace:true})
    }
  }
  async function logout(){if(supabase)await supabase.auth.signOut();setUserId(null);setProfile(null);navigate('/')}
  if(!sessionReady)return <div className="loading-screen"><div className="loading-logo"><Wallet/></div><span>Menyiapkan ruang tabungan...</span></div>
  return <Routes>
    <Route path="/" element={<HomePage/>}/>
    <Route path="/login" element={userId?<NavigateToApp/>:<AuthPage mode="login" onAuth={(e,p)=>auth('login',e,p)}/>}/>
    <Route path="/register" element={userId?<NavigateToApp/>:<AuthPage mode="register" onAuth={(e,p,n)=>auth('register',e,p,n)}/>}/>
    <Route path="/c/:serial" element={<NfcPage user={profile} banks={banks} entries={entries}/>}/>
    <Route path="/app" element={<Protected error={globalError} profile={profile} userId={userId} onLogout={logout}><AppShell profile={profile!} onLogout={logout}><Dashboard profile={profile!} banks={banks} entries={entries} goals={goals} refresh={refresh}/></AppShell></Protected>}/>
    <Route path="/app/celengan" element={<Protected error={globalError} profile={profile} userId={userId} onLogout={logout}><AppShell profile={profile!} onLogout={logout}><BanksPage banks={banks} entries={entries} refresh={refresh} profile={profile!}/></AppShell></Protected>}/>
    <Route path="/app/celengan/:id" element={<Protected error={globalError} profile={profile} userId={userId} onLogout={logout}><AppShell profile={profile!} onLogout={logout}><BankDetailPage banks={banks} entries={entries}/></AppShell></Protected>}/>
    <Route path="/app/pesanan" element={<Protected error={globalError} profile={profile} userId={userId} onLogout={logout}><AppShell profile={profile!} onLogout={logout}><OrdersPage orders={orders.filter(o=>o.user_id===userId)} refresh={refresh}/></AppShell></Protected>}/>
    <Route path="/app/target" element={<Protected error={globalError} profile={profile} userId={userId} onLogout={logout}><AppShell profile={profile!} onLogout={logout}><GoalsPage goals={goals} refresh={refresh}/></AppShell></Protected>}/>
    <Route path="/app/riwayat" element={<Protected error={globalError} profile={profile} userId={userId} onLogout={logout}><AppShell profile={profile!} onLogout={logout}><HistoryPage entries={entries} banks={banks}/></AppShell></Protected>}/>
    <Route path="/app/profil" element={<Protected error={globalError} profile={profile} userId={userId} onLogout={logout}><AppShell profile={profile!} onLogout={logout}><ProfilePage profile={profile!} refresh={refresh}/></AppShell></Protected>}/>
    <Route path="/admin" element={<Protected error={globalError} profile={profile} userId={userId} onLogout={logout}><AppShell profile={profile!} onLogout={logout}><AdminPage profile={profile!} banks={banks} orders={orders} refresh={refresh}/></AppShell></Protected>}/>
    <Route path="*" element={<PublicLayout><section className="not-found"><h1>Halaman tidak ditemukan</h1><p>Periksa kembali alamat yang kamu buka.</p><Link className="button button-primary" to="/">Kembali ke beranda</Link></section></PublicLayout>}/>
  </Routes>
}
function NavigateToApp(){return <Navigate replace to="/app"/>}
function Protected({ children, profile, userId, error }: { children: React.ReactNode; profile: Profile|null; userId: string|null; error?: string; onLogout:()=>void }) {
  if(!userId)return <div className="loading-screen">Mengalihkan ke login...</div>
  if(!profile)return <div className="loading-screen"><div className="form-error">Profil belum tersedia. Jalankan supabase/schema.sql di Supabase SQL Editor.{error?<><br/><small>Detail: {error}</small></>:null}</div><Link to="/login">Kembali ke login</Link></div>
  return <>{children}</>
}
import { Navigate } from 'react-router-dom'
