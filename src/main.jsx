import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { supabase, isSupabaseConfigured } from './supabase'
import { Menu, X, Compass, Users, HeartHandshake, TentTree, ArrowUpLeft, Instagram, Facebook, Mail, ShieldCheck, LogOut, ClipboardList, CheckCircle2, Clock3, XCircle, Send, ExternalLink, CalendarDays, Images, Newspaper, Bell, Plus, Trash2, Pencil, Upload, Save, RefreshCw, UserCheck } from 'lucide-react'
import './styles.css'

const logo = 'https://rst.edu.eg/wp-content/uploads/2023/06/RST-logo-01-e1724228185145.png'
const photos = [
  { src: 'https://rst.edu.eg/wp-content/uploads/2023/06/ab-img.jpg', alt: 'صورة منشورة على الموقع الرسمي لجامعة الريادة', title: 'الحياة الجامعية', caption: 'صورة من الموقع الرسمي للجامعة' },
  { src: 'https://rst.edu.eg/wp-content/uploads/2023/01/100.png', alt: 'صورة من موقع جامعة الريادة', title: 'روح الفريق', caption: 'صورة منشورة على موقع الجامعة' },
  { src: 'https://rst.edu.eg/wp-content/uploads/2026/06/Capture.png', alt: 'صورة منشورة على الموقع الرسمي للجامعة', title: 'جامعة الريادة', caption: 'صورة من الموقع الرسمي للجامعة' },
]
const faculties = ['الصيدلة','طب الفم والأسنان','العلاج الطبيعي','الحاسبات والذكاء الاصطناعي','الهندسة','التمريض','إدارة الأعمال','تكنولوجيا العلوم الصحية التطبيقية','أخرى']

function App() {
  const [mobileMenu, setMobileMenu] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [session, setSession] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [requests, setRequests] = useState([])
  const [filter, setFilter] = useState('pending')
  const [adminTab, setAdminTab] = useState('requests')
  const [activities, setActivities] = useState([])
  const [albums, setAlbums] = useState([])
  const [news, setNews] = useState([])
  const [notifications, setNotifications] = useState([])
  const [members, setMembers] = useState([])
  const [activityForm, setActivityForm] = useState({ title:'', description:'', location:'', starts_at:'', status:'open' })
  const [newsForm, setNewsForm] = useState({ title:'', body:'', published:true })
  const [notificationForm, setNotificationForm] = useState({ title:'', body:'' })
  const [albumForm, setAlbumForm] = useState({ title:'', description:'' })
  const [editingActivity, setEditingActivity] = useState(null)
  const [editingNews, setEditingNews] = useState(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (supabase) {
      supabase.from('photo_albums').select('*').eq('published',true).order('created_at',{ascending:false}).then(({data})=>{if(data)setAlbums(data)})
      supabase.from('activities').select('*').in('status',['open','closed']).order('created_at',{ascending:false}).then(({data})=>{if(data)setActivities(data)})
      supabase.from('site_news').select('*').eq('published',true).order('published_at',{ascending:false}).then(({data})=>{if(data)setNews(data)})
    }
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    async function checkAdmin() {
      setIsAdmin(false)
      if (!supabase || !session?.user?.id) return
      const { data } = await supabase.from('admin_profiles').select('is_admin').eq('user_id', session.user.id).maybeSingle()
      if (data?.is_admin) {
        setIsAdmin(true)
        loadRequests(); loadAdminData()
      }
    }
    checkAdmin()
  }, [session])

  async function loadAdminData() {
    if (!supabase) return
    const tables = [
      ['activities', setActivities], ['photo_albums', setAlbums], ['site_news', setNews], ['site_notifications', setNotifications]
    ]
    for (const [table, setter] of tables) {
      const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false })
      if (!error) setter(data || [])
    }
    const { data: reqs } = await supabase.from('join_requests').select('*').eq('status','accepted').order('created_at',{ascending:false})
    if (reqs) setMembers(reqs)
  }

  async function loadRequests() {
    if (!supabase) return
    const { data, error } = await supabase.from('join_requests').select('*').order('created_at', { ascending: false })
    if (error) setNotice('تعذر تحميل الطلبات: ' + error.message)
    else setRequests(data || [])
  }

  async function submitJoin(e) {
    e.preventDefault()
    if (!supabase) { setNotice('قاعدة البيانات غير مربوطة بعد. اتبع خطوات الإعداد في ملف README.'); return }
    setBusy(true); setNotice('')
    const form = new FormData(e.currentTarget)
    const row = Object.fromEntries(form.entries())
    const { error } = await supabase.from('join_requests').insert([{
      full_name: row.full_name.trim(), student_id: row.student_id.trim(),
      email: row.email.trim(), phone: row.phone.trim(), faculty: row.faculty,
      study_year: row.study_year, motivation: (row.motivation || '').trim(), status: 'pending'
    }])
    setBusy(false)
    if (error) setNotice('لم يتم إرسال الطلب. راجع إعداد Supabase أو حاول مرة أخرى.')
    else { setNotice('تم استلام طلبك بنجاح. سيظهر لمسؤول الجوالة للمراجعة.'); e.currentTarget.reset(); setJoinOpen(false) }
  }

  async function signIn(e) {
    e.preventDefault()
    if (!supabase) { setNotice('اربط Supabase أولًا باستخدام ملف .env.local.'); return }
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setNotice('تعذر تسجيل الدخول. تأكد من بيانات الحساب وإعدادات Supabase.')
    else { setAdminOpen(false); setNotice('تم تسجيل الدخول. لو الحساب مسؤول ستظهر لوحة الطلبات.'); }
  }

  async function updateStatus(id, status) {
    const { error } = await supabase.from('join_requests').update({ status }).eq('id', id)
    if (error) setNotice('لم يتغير وضع الطلب. تحقق من صلاحيات المسؤول.')
    else { setNotice('تم تحديث حالة الطلب.'); loadRequests() }
  }

  async function saveActivity(e) {
    e.preventDefault(); if (!supabase) return
    setBusy(true)
    const payload = { ...activityForm, title: activityForm.title.trim(), description: activityForm.description.trim(), location: activityForm.location.trim(), starts_at: activityForm.starts_at || null }
    const result = editingActivity
      ? await supabase.from('activities').update(payload).eq('id', editingActivity)
      : await supabase.from('activities').insert(payload)
    setBusy(false)
    if (result.error) setNotice('تعذر حفظ النشاط. تأكد من تشغيل schema.sql وصلاحيات الأدمن.')
    else { setNotice('تم حفظ النشاط.'); setActivityForm({title:'',description:'',location:'',starts_at:'',status:'open'}); setEditingActivity(null); loadAdminData() }
  }
  async function deleteRow(table, id, label) {
    if (!window.confirm(`تأكيد حذف ${label}؟`)) return
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) setNotice('تعذر الحذف. قد تكون هناك سجلات مرتبطة أو صلاحيات ناقصة.')
    else { setNotice('تم الحذف.'); loadAdminData() }
  }
  async function saveNews(e) {
    e.preventDefault(); setBusy(true)
    const payload = {title:newsForm.title.trim(), body:newsForm.body.trim(), published:newsForm.published, published_at:newsForm.published ? new Date().toISOString() : null}
    const result = editingNews ? await supabase.from('site_news').update(payload).eq('id',editingNews) : await supabase.from('site_news').insert(payload)
    setBusy(false)
    if (result.error) setNotice('تعذر حفظ الخبر. تأكد من إعداد قاعدة البيانات.')
    else { setNotice('تم حفظ الخبر.'); setNewsForm({title:'',body:'',published:true}); setEditingNews(null); loadAdminData() }
  }
  async function saveNotification(e) {
    e.preventDefault(); setBusy(true)
    const { error } = await supabase.from('site_notifications').insert({title:notificationForm.title.trim(),body:notificationForm.body.trim(),published:true})
    setBusy(false)
    if (error) setNotice('تعذر نشر الإشعار.')
    else { setNotice('تم نشر الإشعار.'); setNotificationForm({title:'',body:''}); loadAdminData() }
  }
  async function uploadAlbum(e) {
    e.preventDefault(); if (!supabase) return
    const form = e.currentTarget; const fileInput = form.querySelector('input[type=file]'); const file = fileInput?.files?.[0]
    if (!file) { setNotice('اختر صورة أولًا.'); return }
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { setNotice('ارفع صورة JPG أو PNG أو WEBP فقط.'); return }
    if (file.size > 8*1024*1024) { setNotice('حجم الصورة يجب ألا يتجاوز 8 ميجابايت.'); return }
    setUploading(true)
    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'-')}`
    const { error: uploadError } = await supabase.storage.from('scout-gallery').upload(safeName,file,{upsert:false,contentType:file.type})
    if (uploadError) { setUploading(false); setNotice('تعذر رفع الصورة. أنشئ bucket باسم scout-gallery وطبّق سياساته من schema.sql.'); return }
    const { data: urlData } = supabase.storage.from('scout-gallery').getPublicUrl(safeName)
    const { error } = await supabase.from('photo_albums').insert({title:albumForm.title.trim(),description:albumForm.description.trim(),image_url:urlData.publicUrl,storage_path:safeName,published:true})
    setUploading(false)
    if (error) setNotice('تم رفع الصورة لكن تعذر حفظ بيانات الألبوم. راجع إعدادات قاعدة البيانات.')
    else { setNotice('تم نشر الصورة في المعرض.'); setAlbumForm({title:'',description:''}); form.reset(); loadAdminData() }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setIsAdmin(false); setRequests([]); setNotice('تم تسجيل الخروج.')
  }

  const shownRequests = requests.filter(r => filter === 'all' || r.status === filter)
  return <div className="site" dir="rtl">
    <div className="topline"><span>جامعة الريادة للعلوم والتكنولوجيا</span><a href="https://rst.edu.eg/?lang=ar" target="_blank" rel="noreferrer">الموقع الرسمي للجامعة <ExternalLink size={13}/></a></div>
    <header className="header">
      <a href="#home" className="brand"><img src={logo} alt="شعار جامعة الريادة" onError={e => {e.currentTarget.style.display='none'}}/><span className="brand-fallback">RST</span><span className="brand-text"><b>جوالة الريادة</b><small>جامعة الريادة للعلوم والتكنولوجيا</small></span></a>
      <button className="menu-button" aria-label="فتح القائمة" onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X/> : <Menu/>}</button>
      <nav className={mobileMenu ? 'nav nav-open' : 'nav'}>
        <a href="#about" onClick={() => setMobileMenu(false)}>عن الجوالة</a><a href="#values" onClick={() => setMobileMenu(false)}>قيمنا</a><a href="#activities" onClick={() => setMobileMenu(false)}>الأنشطة</a><a href="#gallery" onClick={() => setMobileMenu(false)}>معرض الصور</a>
        <button className="nav-join" onClick={() => {setJoinOpen(true);setMobileMenu(false)}}>انضم للجوالة <ArrowUpLeft size={16}/></button>
      </nav>
    </header>

    <main>
      <section className="hero" id="home">
        <div className="hero-content">
          <div className="eyebrow"><span className="eyebrow-dot"/> الحركة الكشفية · خدمة · انتماء · قيادة</div>
          <h1>معًا نصنع قادة<br/><span>يصنعون المستقبل</span></h1>
          <p>جوالة جامعة الريادة مساحة للتطوع، والتعلّم، والعمل الجماعي، وخدمة المجتمع بروح كشفية واحدة.</p>
          <div className="hero-actions"><button className="primary" onClick={() => setJoinOpen(true)}>ابدأ رحلتك معنا <ArrowUpLeft size={18}/></button><a className="secondary" href="#about">اكتشف الجوالة <ArrowUpLeft size={18}/></a></div>
          <div className="hero-note"><ShieldCheck size={17}/> الموقع التعريفي لجوالة الجامعة</div>
        </div>
        <div className="hero-visual">
          <div className="hero-image"><img src={photos[0].src} alt="صورة من الموقع الرسمي لجامعة الريادة" onError={e => e.currentTarget.style.display='none'}/><div className="image-overlay"></div><div className="image-label"><span>RST</span><div><b>جوالة الريادة</b><small>معًا لخدمة المجتمع</small></div></div></div>
          <div className="floating-card"><div className="floating-icon"><Compass/></div><div><b>كن مستعدًا</b><small>Be Prepared</small></div></div>
          <div className="gold-orbit"></div>
        </div>
      </section>

      <section className="stats" id="values">
        <div><span className="stat-icon"><Users/></span><b>القيادة</b><small>نكتشف قدراتنا ونطوّرها</small></div>
        <div><span className="stat-icon"><HeartHandshake/></span><b>الخدمة</b><small>نترك أثرًا إيجابيًا في مجتمعنا</small></div>
        <div><span className="stat-icon"><TentTree/></span><b>المغامرة</b><small>نتعلم بالممارسة والعمل الجماعي</small></div>
        <div><span className="stat-icon"><Compass/></span><b>الانتماء</b><small>قيم تجمعنا وهدف يقودنا</small></div>
      </section>

      <section className="section about" id="about">
        <div className="section-kicker">من نحن</div><h2>أكثر من نشاط طلابي،<br/><span>إنها رحلة تصنع الفرق.</span></h2>
        <div className="about-grid"><p>الجوالة تجمع الطلاب حول قيم التعاون والانضباط والمسؤولية والمبادرة. نعمل على بناء مهارات القيادة، وتنظيم الأنشطة، والمشاركة في المبادرات التطوعية، مع احترام لوائح الجامعة وإشرافها.</p><div className="about-quote"><span>“</span><b>كن مستعدًا</b><small>شعار كشفي يلهمنا للتعلّم والمبادرة وخدمة الآخرين.</small></div></div>
      </section>

      <section className="activities section" id="activities">
        <div className="section-head"><div><div className="section-kicker">نعيش القيم بالفعل</div><h2>مساحات للنمو والعطاء</h2></div><span className="section-number">01 / الأنشطة</span></div>
        <div className="activity-grid">
          <article className="activity-card"><span className="activity-no">01</span><div className="activity-icon"><HeartHandshake/></div><h3>خدمة المجتمع</h3><p>مبادرات تطوعية تسهم في نشر روح التعاون والمسؤولية.</p></article>
          <article className="activity-card"><span className="activity-no">02</span><div className="activity-icon"><Compass/></div><h3>مهارات كشفية</h3><p>التعلّم بالممارسة، والعمل ضمن فريق، وحل المشكلات.</p></article>
          <article className="activity-card"><span className="activity-no">03</span><div className="activity-icon"><Users/></div><h3>قيادة وتنظيم</h3><p>المشاركة في إعداد الفعاليات وتطوير مهارات التواصل.</p></article>
        </div>
      </section>

      <section className="gallery section" id="gallery">
        <div className="section-head"><div><div className="section-kicker">من قلب الجامعة</div><h2>معرض الصور</h2><p className="section-sub">صور مرتبطة بالموقع الرسمي للجامعة. يُرجى الحصول على موافقة الجامعة قبل الاستخدام الرسمي.</p></div><a className="text-link" href="https://rst.edu.eg/?lang=ar" target="_blank" rel="noreferrer">المصدر الرسمي <ArrowUpLeft size={16}/></a></div>
        <div className="gallery-grid">{(albums.length ? albums : photos).map((p,i) => <a className={'gallery-item gallery-'+i} href={p.image_url || p.src} target="_blank" rel="noreferrer" key={p.id || p.src}><img src={p.image_url || p.src} alt={p.title || p.alt} onError={e => {e.currentTarget.style.display='none'}}/><div className="gallery-shade"></div><div className="gallery-caption"><b>{p.title}</b><small>{p.description || p.caption}</small></div></a>)}</div>
      </section>

      {news.length > 0 && <section className="section public-news"><div className="section-head"><div><div className="section-kicker">آخر المستجدات</div><h2>الأخبار والإعلانات</h2></div></div><div className="activity-grid">{news.slice(0,6).map(item=><article className="activity-card" key={item.id}><div className="activity-icon"><Newspaper/></div><h3>{item.title}</h3><p>{item.body}</p>{item.published_at&&<small>{new Date(item.published_at).toLocaleDateString('ar-EG')}</small>}</article>)}</div></section>}

      <section className="join-banner"><div><div className="section-kicker">مكانك بيننا</div><h2>خطوتك الأولى تبدأ هنا.</h2><p>قدّم طلب الانضمام، وسيتم مراجعته من مسؤول الجوالة.</p></div><button className="primary" onClick={() => setJoinOpen(true)}>طلب انضمام <ArrowUpLeft size={18}/></button></section>
    </main>

    <footer className="footer"><div className="footer-brand"><span className="brand-mark">RST</span><div><b>جوالة الريادة</b><small>جامعة الريادة للعلوم والتكنولوجيا</small></div></div><p>موقع تعريفي مستقل قيد التطوير، ولا يمثل قناة رسمية للجامعة إلا بعد اعتماد الإدارة.</p><div className="footer-links"><a href="https://rst.edu.eg/?lang=ar" target="_blank" rel="noreferrer">الموقع الرسمي</a><button onClick={() => setAdminOpen(true)}>دخول المسؤول</button></div><small className="copyright">© {new Date().getFullYear()} جوالة الريادة · نسخة أولية للمراجعة</small></footer>

    {notice && <div className="toast" role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="إغلاق">×</button></div>}

    {joinOpen && <div className="modal-backdrop" onClick={() => setJoinOpen(false)}><section className="modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setJoinOpen(false)} aria-label="إغلاق"><X/></button><div className="section-kicker">طلب انضمام</div><h2>خلّي لك أثر.</h2><p className="modal-intro">املأ البيانات التالية. لا تشارك بيانات حساسة غير مطلوبة.</p><form onSubmit={submitJoin} className="form-grid">
      <label>الاسم بالكامل<input name="full_name" required minLength="2" maxLength="120" autoComplete="name"/></label>
      <label>الرقم الجامعي<input name="student_id" required minLength="2" maxLength="40"/></label>
      <label>البريد الإلكتروني<input type="email" name="email" required maxLength="254" autoComplete="email"/></label>
      <label>رقم الهاتف<input type="tel" name="phone" required minLength="7" maxLength="30" autoComplete="tel"/></label>
      <label>الكلية<select name="faculty" required defaultValue=""><option value="" disabled>اختر الكلية</option>{faculties.map(f => <option key={f}>{f}</option>)}</select></label>
      <label>الفرقة الدراسية<select name="study_year" required defaultValue=""><option value="" disabled>اختر الفرقة</option>{['الأولى','الثانية','الثالثة','الرابعة','الخامسة','أخرى'].map(f => <option key={f}>{f}</option>)}</select></label>
      <label className="full-field">لماذا تريد الانضمام؟<textarea name="motivation" maxLength="1000" rows="3" placeholder="اكتب نبذة قصيرة (اختياري)"/></label>
      <button className="primary full-field" disabled={busy} type="submit"><Send size={17}/>{busy ? 'جارٍ الإرسال...' : 'إرسال طلب الانضمام'}</button>
      {!isSupabaseConfigured && <p className="form-warning full-field">تنبيه: يلزم ربط قاعدة بيانات Supabase قبل استقبال الطلبات فعليًا.</p>}
    </form></section></div>}

    {adminOpen && <div className="modal-backdrop" onClick={() => setAdminOpen(false)}><section className="modal admin-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setAdminOpen(false)} aria-label="إغلاق"><X/></button><div className="section-kicker">مساحة المسؤول</div><h2>تسجيل دخول الإدارة</h2>{session && !isAdmin ? <p>تم تسجيل الدخول، لكن الحساب ليس لديه صلاحية مسؤول. يجب منح الصلاحية من Supabase.</p> : <form onSubmit={signIn} className="form-grid one-col"><label>البريد الإلكتروني<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username"/></label><label>كلمة المرور<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password"/></label><button className="primary" disabled={busy}>{busy ? 'جارٍ الدخول...' : 'تسجيل الدخول'}</button></form>}{!isSupabaseConfigured && <p className="form-warning">اربط Supabase أولًا؛ لن تعمل المصادقة قبل الإعداد.</p>}</section></div>}

    {isAdmin && <div className="admin-panel"><div className="admin-panel-head"><div><span className="section-kicker">مساحة الإدارة</span><h2>لوحة تحكم جوالة الريادة</h2><p>إدارة المحتوى والأعضاء والأنشطة من مكان واحد</p></div><button className="logout" onClick={signOut}><LogOut size={16}/> خروج</button></div>
      <div className="admin-tabs">{[['requests','طلبات الانضمام',ClipboardList],['activities','الأنشطة',CalendarDays],['gallery','معرض الصور',Images],['news','الأخبار',Newspaper],['notifications','الإشعارات',Bell],['members','الأعضاء',Users]].map(([id,label,Icon])=><button key={id} className={adminTab===id?'active':''} onClick={()=>setAdminTab(id)}><Icon size={16}/>{label}</button>)}</div>
      <div className="admin-toolbar"><span className="admin-hint">تظهر التغييرات بعد حفظها في قاعدة البيانات.</span><button className="refresh" onClick={()=>{loadRequests();loadAdminData()}}><RefreshCw size={15}/> تحديث البيانات</button></div>
      {adminTab==='requests' && <><div className="filters">{[['pending','قيد المراجعة'],['accepted','مقبول'],['rejected','مرفوض'],['all','الكل']].map(([v,t])=><button key={v} className={filter===v?'active':''} onClick={()=>setFilter(v)}>{t}</button>)}</div><div className="request-list">{shownRequests.length===0?<p className="empty">لا توجد طلبات في هذا التصنيف.</p>:shownRequests.map(r=><article className="request" key={r.id}><div className="request-main"><b>{r.full_name}</b><span>{r.faculty} · الفرقة {r.study_year}</span><small>{r.email} · {r.phone} · رقم جامعي: {r.student_id}</small>{r.motivation&&<p>{r.motivation}</p>}<small>{new Date(r.created_at).toLocaleString('ar-EG')}</small></div><div className="request-actions"><button onClick={()=>updateStatus(r.id,'accepted')}><CheckCircle2 size={17}/> قبول</button><button onClick={()=>updateStatus(r.id,'pending')}><Clock3 size={17}/> مراجعة</button><button onClick={()=>updateStatus(r.id,'rejected')}><XCircle size={17}/> رفض</button></div></article>)}</div></>}
      {adminTab==='activities' && <div className="admin-content-grid"><form className="admin-form" onSubmit={saveActivity}><h3>{editingActivity?'تعديل النشاط':'إضافة نشاط جديد'}</h3><label>اسم النشاط<input required maxLength="160" value={activityForm.title} onChange={e=>setActivityForm({...activityForm,title:e.target.value})}/></label><label>الوصف<textarea rows="3" value={activityForm.description} onChange={e=>setActivityForm({...activityForm,description:e.target.value})}/></label><label>المكان<input value={activityForm.location} onChange={e=>setActivityForm({...activityForm,location:e.target.value})}/></label><label>موعد النشاط<input type="datetime-local" value={activityForm.starts_at} onChange={e=>setActivityForm({...activityForm,starts_at:e.target.value})}/></label><label>الحالة<select value={activityForm.status} onChange={e=>setActivityForm({...activityForm,status:e.target.value})}><option value="open">التسجيل مفتوح</option><option value="closed">مغلق</option><option value="completed">منتهي</option></select></label><button className="primary" disabled={busy}><Save size={16}/>{busy?'جارٍ الحفظ...':'حفظ النشاط'}</button>{editingActivity&&<button type="button" className="secondary-admin" onClick={()=>{setEditingActivity(null);setActivityForm({title:'',description:'',location:'',starts_at:'',status:'open'})}}>إلغاء التعديل</button>}</form><div className="admin-records"><h3>الأنشطة ({activities.length})</h3>{activities.length===0?<p className="empty">لا توجد أنشطة بعد.</p>:activities.map(a=><article className="admin-record" key={a.id}><div><b>{a.title}</b><small>{a.location||'لم يحدد المكان'} · {a.starts_at?new Date(a.starts_at).toLocaleString('ar-EG'):'لم يحدد الموعد'}</small><span>{a.status==='open'?'التسجيل مفتوح':a.status==='closed'?'التسجيل مغلق':'منتهي'}</span></div><button title="تعديل" onClick={()=>{setEditingActivity(a.id);setActivityForm({title:a.title||'',description:a.description||'',location:a.location||'',starts_at:a.starts_at?a.starts_at.slice(0,16):'',status:a.status||'open'})}}><Pencil size={16}/></button><button title="حذف" onClick={()=>deleteRow('activities',a.id,'النشاط')}><Trash2 size={16}/></button></article>)}</div></div>}
      {adminTab==='gallery' && <div className="admin-content-grid"><form className="admin-form" onSubmit={uploadAlbum}><h3>رفع صورة إلى المعرض</h3><label>عنوان الصورة أو الألبوم<input required maxLength="160" value={albumForm.title} onChange={e=>setAlbumForm({...albumForm,title:e.target.value})}/></label><label>وصف مختصر<textarea rows="3" value={albumForm.description} onChange={e=>setAlbumForm({...albumForm,description:e.target.value})}/></label><label>الصورة (JPG / PNG / WEBP)<input type="file" accept="image/jpeg,image/png,image/webp" required/></label><small>حد أقصى 8 ميجابايت. لا ترفع صور طلاب قبل الحصول على الموافقات المطلوبة.</small><button className="primary" disabled={uploading}><Upload size={16}/>{uploading?'جارٍ الرفع...':'رفع ونشر الصورة'}</button></form><div className="admin-records"><h3>الصور المنشورة ({albums.length})</h3><div className="admin-album-grid">{albums.map(a=><article className="admin-album" key={a.id}><img src={a.image_url} alt={a.title}/><b>{a.title}</b><small>{a.description}</small><button onClick={()=>deleteRow('photo_albums',a.id,'الصورة من المعرض')}><Trash2 size={15}/> حذف</button></article>)}</div>{albums.length===0&&<p className="empty">لا توجد صور منشورة.</p>}</div></div>}
      {adminTab==='news' && <div className="admin-content-grid"><form className="admin-form" onSubmit={saveNews}><h3>{editingNews?'تعديل الخبر':'نشر خبر أو إعلان'}</h3><label>العنوان<input required maxLength="180" value={newsForm.title} onChange={e=>setNewsForm({...newsForm,title:e.target.value})}/></label><label>نص الخبر<textarea required rows="5" value={newsForm.body} onChange={e=>setNewsForm({...newsForm,body:e.target.value})}/></label><label className="inline-check"><input type="checkbox" checked={newsForm.published} onChange={e=>setNewsForm({...newsForm,published:e.target.checked})}/> نشر الخبر فورًا</label><button className="primary" disabled={busy}><Save size={16}/>حفظ الخبر</button></form><div className="admin-records"><h3>الأخبار ({news.length})</h3>{news.map(n=><article className="admin-record" key={n.id}><div><b>{n.title}</b><small>{(n.body||'').slice(0,130)}</small><span>{n.published?'منشور':'مسودة'}</span></div><button onClick={()=>{setEditingNews(n.id);setNewsForm({title:n.title||'',body:n.body||'',published:!!n.published})}}><Pencil size={16}/></button><button onClick={()=>deleteRow('site_news',n.id,'الخبر')}><Trash2 size={16}/></button></article>)}</div></div>}
      {adminTab==='notifications' && <div className="admin-content-grid"><form className="admin-form" onSubmit={saveNotification}><h3>نشر إشعار للأعضاء</h3><label>عنوان الإشعار<input required maxLength="160" value={notificationForm.title} onChange={e=>setNotificationForm({...notificationForm,title:e.target.value})}/></label><label>نص الإشعار<textarea required rows="4" value={notificationForm.body} onChange={e=>setNotificationForm({...notificationForm,body:e.target.value})}/></label><button className="primary" disabled={busy}><Bell size={16}/>نشر الإشعار</button><small>هذه النسخة تحفظ الإشعارات داخل الموقع. إشعارات البريد أو الهاتف تحتاج إعداد خدمة إضافية.</small></form><div className="admin-records"><h3>الإشعارات ({notifications.length})</h3>{notifications.map(n=><article className="admin-record" key={n.id}><div><b>{n.title}</b><small>{n.body}</small></div><button onClick={()=>deleteRow('site_notifications',n.id,'الإشعار')}><Trash2 size={16}/></button></article>)}</div></div>}
      {adminTab==='members' && <div className="admin-records"><h3>الأعضاء المعتمدون ({members.length})</h3><p className="admin-hint">تظهر هنا الطلبات المقبولة. إلغاء العضوية أو إنشاء حساب دخول مستقل يحتاج ربط إجراء آمن مع Supabase Auth.</p>{members.map(m=><article className="admin-record" key={m.id}><div><b>{m.full_name}</b><small>الرقم الجامعي: {m.student_id} · {m.faculty} · {m.email}</small><span>عضوية معتمدة</span></div><button onClick={()=>{if(window.confirm('إلغاء اعتماد هذا الطلب؟')) updateStatus(m.id,'rejected')}}><UserCheck size={16}/> إلغاء</button></article>)}</div>}
    </div>}
  </div>
}
createRoot(document.getElementById('root')).render(<App />)
