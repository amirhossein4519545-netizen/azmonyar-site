/* ============================================================
   آزمون‌یار — لایه داده متصل به Supabase
   کش محلی (localStorage) + همگام‌سازی در پس‌زمینه (upsert/delete)
   بدون اتصال یا با جدول‌های آماده‌نشده، برنامه در حالت محلی کار می‌کند.
   ============================================================ */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://figkwnsyffugpqgksydh.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_NorSUCSoT30RQdlgy18z_w_dQaYngTg';

  var DB_KEY = 'azmonyar.db.v2';
  var SESSION_KEY = 'azmonyar.session.v2';
  var OFFLINE_KEY = 'azmonyar.offline';
  var DB_VERSION = 2;
  var cache = null;
  var online = false;
  var lastError = '';

  var memStore = {};

  function rawGet(key) {
    try { return localStorage.getItem(key); }
    catch (e) { return Object.prototype.hasOwnProperty.call(memStore, key) ? memStore[key] : null; }
  }

  function rawSet(key, value) {
    try { localStorage.setItem(key, value); }
    catch (e) { memStore[key] = value; }
  }

  function rawRemove(key) {
    try { localStorage.removeItem(key); }
    catch (e) { delete memStore[key]; }
  }

  /* حالت آفلاین: برای تست‌ها یا وقتی مدیر نمی‌خواهد به دیتابیس وصل شود */
  function forcedOffline() {
    if (typeof window !== 'undefined' && window.__AZ_OFFLINE__) return true;
    return rawGet(OFFLINE_KEY) === '1';
  }

  var supabase = null;
  try {
    if (!forcedOffline() && typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
  } catch (e) {
    supabase = null;
    lastError = e && e.message ? e.message : String(e);
  }

  function uid(prefix) {
    return prefix + '-' + Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 7);
  }

  function nowISO() { return new Date().toISOString(); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function findById(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  var GRADES = [
    { n: 7, fa: 'هفتم', en: 'Grade 7', cycle: 'first' },
    { n: 8, fa: 'هشتم', en: 'Grade 8', cycle: 'first' },
    { n: 9, fa: 'نهم', en: 'Grade 9', cycle: 'first' },
    { n: 10, fa: 'دهم', en: 'Grade 10', cycle: 'second' },
    { n: 11, fa: 'یازدهم', en: 'Grade 11', cycle: 'second' },
    { n: 12, fa: 'دوازدهم', en: 'Grade 12', cycle: 'second' }
  ];

  var MAJORS = [
    { key: 'math', fa: 'ریاضی و فیزیک', en: 'Mathematics & Physics' },
    { key: 'science', fa: 'علوم تجربی', en: 'Experimental Sciences' },
    { key: 'humanities', fa: 'علوم انسانی', en: 'Humanities' },
    { key: 'vocational', fa: 'فنی و حرفه‌ای', en: 'Vocational' },
    { key: 'kar-danesh', fa: 'کاردانش', en: 'Technical & Vocational' },
    { key: 'maaref', fa: 'معارف اسلامی', en: 'Islamic Studies' }
  ];

  var OTHER_CLASS_ID = 'cls-other';

  function gradeInfo(n) {
    var g = Number(n);
    for (var i = 0; i < GRADES.length; i++) if (GRADES[i].n === g) return GRADES[i];
    return null;
  }

  function majorInfo(key) {
    for (var i = 0; i < MAJORS.length; i++) if (MAJORS[i].key === key) return MAJORS[i];
    return null;
  }

  function classNames(grade, majorKey) {
    if (grade === 'other' || grade === null || grade === undefined || grade === '') {
      return { name: 'غیره', nameEn: 'Other' };
    }
    var g = gradeInfo(grade);
    var m = majorInfo(majorKey);
    if (!g) return { name: String(grade), nameEn: String(grade) };
    var name = 'پایه ' + g.fa + (g.cycle === 'second' && m ? ' — ' + m.fa : '');
    var nameEn = g.en + (g.cycle === 'second' && m ? ' — ' + m.en : '');
    return { name: name, nameEn: nameEn };
  }

  /* ---------------- نگاشت نام ستون‌ها ---------------- */

  function mapFromDb(table, row) {
    if (!row) return row;
    var r = {};
    Object.keys(row).forEach(function (k) { r[k] = row[k]; });
    if (table === 'users') { r.classId = r.class_id; r.createdAt = r.created_at; delete r.class_id; delete r.created_at; }
    if (table === 'classes') { r.nameEn = r.name_en; delete r.name_en; }
    if (table === 'questions') { r.textEn = r.text_en; r.subjectEn = r.subject_en; r.createdAt = r.created_at; delete r.text_en; delete r.subject_en; delete r.created_at; }
    if (table === 'exams') { r.titleEn = r.title_en; r.classId = r.class_id; r.questionIds = r.question_ids; r.durationMin = r.duration_min; r.startAt = r.start_at; r.endAt = r.end_at; r.createdAt = r.created_at; delete r.title_en; delete r.class_id; delete r.question_ids; delete r.duration_min; delete r.start_at; delete r.end_at; delete r.created_at; }
    if (table === 'attempts') { r.examId = r.exam_id; r.userId = r.user_id; r.startedAt = r.started_at; r.submittedAt = r.submitted_at; delete r.exam_id; delete r.user_id; delete r.started_at; delete r.submitted_at; }
    if (table === 'inquiries') { r.userId = r.user_id; r.createdAt = r.created_at; delete r.user_id; delete r.created_at; }
    if (table === 'ai_chats') { r.userId = r.user_id; delete r.user_id; }
    return r;
  }

  function mapToDb(table, item) {
    if (!item) return item;
    var r = {};
    Object.keys(item).forEach(function (k) { r[k] = item[k]; });
    if (table === 'users') { r.class_id = r.classId; r.created_at = r.createdAt; delete r.classId; delete r.createdAt; }
    if (table === 'classes') { r.name_en = r.nameEn; delete r.nameEn; }
    if (table === 'questions') { r.text_en = r.textEn; r.subject_en = r.subjectEn; r.created_at = r.createdAt; delete r.textEn; delete r.subjectEn; delete r.createdAt; }
    if (table === 'exams') { r.title_en = r.titleEn; r.class_id = r.classId; r.question_ids = r.questionIds; r.duration_min = r.durationMin; r.start_at = r.startAt; r.end_at = r.endAt; r.created_at = r.createdAt; delete r.titleEn; delete r.classId; delete r.questionIds; delete r.durationMin; delete r.startAt; delete r.endAt; delete r.createdAt; delete r.pendingQuestions; }
    if (table === 'attempts') { r.exam_id = r.examId; r.user_id = r.userId; r.started_at = r.startedAt; r.submitted_at = r.submittedAt; delete r.examId; delete r.userId; delete r.startedAt; delete r.submittedAt; delete r.autoSubmitted; }
    if (table === 'inquiries') { r.user_id = r.userId; r.created_at = r.createdAt; delete r.userId; delete r.createdAt; }
    return r;
  }

  async function syncTable(table, data, method, matchCol) {
    if (!data || !supabase) return;
    var mode = method || 'upsert';
    var col = matchCol || 'id';
    try {
      if (mode === 'upsert') {
        var dbData = Array.isArray(data) ? data.map(function (d) { return mapToDb(table, d); }) : mapToDb(table, data);
        var res = await supabase.from(table).upsert(dbData);
        if (res.error) console.error('Sync upsert error:', table, res.error);
      } else if (mode === 'delete') {
        var matchVal = data[col];
        var del = await supabase.from(table).delete().eq(col, matchVal);
        if (del.error) console.error('Sync delete error:', table, del.error);
      }
    } catch (e) {
      console.error('Supabase sync failed:', e);
    }
  }

  /* ---------------- داده اولیه ---------------- */

  function seed() {
    var classes = [
      { id: OTHER_CLASS_ID, grade: 'other', major: null, name: 'غیره', nameEn: 'Other' },
      { id: 'cls-9', grade: 9, major: null, name: 'پایه نهم', nameEn: 'Grade 9' },
      { id: 'cls-10', grade: 10, major: 'math', name: 'پایه دهم — ریاضی و فیزیک', nameEn: 'Grade 10 — Mathematics & Physics' },
      { id: 'cls-11', grade: 11, major: 'science', name: 'پایه یازدهم — علوم تجربی', nameEn: 'Grade 11 — Experimental Sciences' },
      { id: 'cls-12', grade: 12, major: 'humanities', name: 'پایه دوازدهم — علوم انسانی', nameEn: 'Grade 12 — Humanities' }
    ];

    function q(id, text, textEn, options, correct, subject, subjectEn, difficulty) {
      return {
        id: id, text: text, textEn: textEn, image: '',
        options: options.map(function (o) { return { text: o[0], textEn: o[1], image: '' }; }),
        correct: correct, subject: subject, subjectEn: subjectEn, difficulty: difficulty, createdAt: nowISO()
      };
    }

    var questions = [
      q('q-m1', 'حاصل ۲⁵ چند است؟', 'What is 2⁵?', [['۱۶', '16'], ['۳۲', '32'], ['۶۴', '64'], ['۲۵', '25']], 1, 'ریاضی', 'Math', 'easy'),
      q('q-m2', 'اگر f(x) = ۲x + ۳ باشد، f(۴) چند است؟', 'If f(x) = 2x + 3, what is f(4)?', [['۷', '7'], ['۹', '9'], ['۱۱', '11'], ['۱۴', '14']], 2, 'ریاضی', 'Math', 'easy'),
      q('q-m3', 'مساحت مثلثی با قاعده ۶ و ارتفاع ۴ چند است؟', 'Area of triangle base 6 height 4?', [['۱۰', '10'], ['۱۲', '12'], ['۲۴', '24'], ['۴۸', '48']], 1, 'هندسه', 'Geometry', 'medium'),
      q('q-m4', 'ریشه‌های معادله x² − ۵x + ۶ = ۰ کدام‌اند؟', 'Roots of x² − 5x + 6 = 0?', [['۱ و ۶', '1 and 6'], ['۲ و ۳', '2 and 3'], ['−۲ و −۳', '-2 and -3'], ['۲ و −۳', '2 and -3']], 1, 'جبر', 'Algebra', 'medium'),
      q('q-m5', 'مجموع زوایای داخلی یک پنج‌ضلعی چند درجه است؟', 'Sum of interior angles of a pentagon?', [['۳۶۰', '360'], ['۵۴۰', '540'], ['۷۲۰', '720'], ['۹۰۰', '900']], 1, 'هندسه', 'Geometry', 'hard'),
      q('q-m6', 'مقدار sin ۳۰° چند است؟', 'What is sin 30°?', [['۱/۲', '1/2'], ['√۲/۲', '√2/2'], ['√۳/۲', '√3/2'], ['۱', '1']], 0, 'مثلثات', 'Trigonometry', 'hard'),
      q('q-s1', 'یکای اندازه‌گیری نیرو در SI چیست؟', 'SI unit of force?', [['ژول', 'Joule'], ['نیوتن', 'Newton'], ['وات', 'Watt'], ['پاسکال', 'Pascal']], 1, 'فیزیک', 'Physics', 'easy'),
      q('q-s2', 'کدام مورد یک منبع انرژی تجدیدپذیر است؟', 'Renewable energy source?', [['زغال‌سنگ', 'Coal'], ['نفت', 'Oil'], ['گاز طبیعی', 'Natural gas'], ['انرژی خورشیدی', 'Solar energy']], 3, 'فیزیک', 'Physics', 'easy'),
      q('q-s3', 'واحد ساختاری DNA چیست؟', 'Structural unit of DNA?', [['آمینواسید', 'Amino acid'], ['نوکلئوتید', 'Nucleotide'], ['گلوکز', 'Glucose'], ['اسید چرب', 'Fatty acid']], 1, 'زیست', 'Biology', 'medium'),
      q('q-s4', 'در فتوسنتز کدام گاز مصرف می‌شود؟', 'Gas consumed in photosynthesis?', [['اکسیژن', 'Oxygen'], ['نیتروژن', 'Nitrogen'], ['کربن دی‌اکسید', 'Carbon dioxide'], ['هیدروژن', 'Hydrogen']], 2, 'زیست', 'Biology', 'easy'),
      q('q-s5', 'سرعت نور در خلأ تقریباً چند متر بر ثانیه است؟', 'Speed of light in vacuum?', [['۳×۱۰⁶', '3×10⁶'], ['۳×۱۰⁸', '3×10⁸'], ['۳×۱۰¹⁰', '3×10¹⁰'], ['۳×۱۰⁵', '3×10⁵']], 1, 'فیزیک', 'Physics', 'medium'),
      q('q-s6', 'pH محلول خنثی در دمای ۲۵ درجه سلسیوس چند است؟', 'pH of neutral solution at 25°C?', [['۰', '0'], ['۷', '7'], ['۱۴', '14'], ['۱', '1']], 1, 'شیمی', 'Chemistry', 'easy'),
      q('q-h1', 'نویسنده کتاب «بوف کور» کیست؟', 'Who wrote “The Blind Owl”?', [['صادق چوبک', 'Sadegh Chubak'], ['صادق هدایت', 'Sadegh Hedayat'], ['احمد شاملو', 'Ahmad Shamlou'], ['جلال آل‌احمد', 'Jalal Al-e Ahmad']], 1, 'ادبیات', 'Literature', 'easy'),
      q('q-h2', 'کدام شهر از پایتخت‌های هخامنشیان است؟', 'Achaemenid capital?', [['نیشابور', 'Nishapur'], ['تخت جمشید', 'Persepolis'], ['اصفهان', 'Isfahan'], ['تبریز', 'Tabriz']], 1, 'تاریخ', 'History', 'medium'),
      q('q-h3', 'سراینده «شاهنامه» کیست؟', 'Who composed “Shahnameh”?', [['حافظ', 'Hafez'], ['فردوسی', 'Ferdowsi'], ['سعدی', 'Saadi'], ['نظامی', 'Nezami']], 1, 'ادبیات', 'Literature', 'easy'),
      q('q-h4', 'کدام گزینه یک نوع ادبی است؟', 'Literary genre?', [['حماسی', 'Epic'], ['جغرافیایی', 'Geographic'], ['شیمیایی', 'Chemical'], ['اقتصادی', 'Economic']], 0, 'ادبیات', 'Literature', 'easy'),
      q('q-h5', 'واژه «اقتصاد» در اصل به چه معناست؟', 'Meaning of “economy”?', [['مطالعه ستارگان', 'Study of stars'], ['مدیریت منابع', 'Management of resources'], ['بررسی زبان', 'Study of language'], ['ساخت سازه', 'Building structures']], 1, 'اقتصاد', 'Economics', 'medium')
    ];

    var users = [
      { id: 'u-admin', name: 'مدیر سامانه', username: 'admin', password: 'admin', role: 'admin', classId: null, createdAt: nowISO() }
    ];

    var exams = [
      { id: 'ex-math1', title: 'آزمون ریاضی — فصل ۱', titleEn: 'Math Quiz — Chapter 1', classId: 'cls-10', questionIds: ['q-m1', 'q-m2', 'q-m3', 'q-m4', 'q-m5', 'q-m6'], pendingQuestions: [], durationMin: 10, published: true, startAt: '', endAt: '', createdAt: nowISO() },
      { id: 'ex-sci1', title: 'آزمون علوم — میان‌ترم', titleEn: 'Science — Midterm', classId: 'cls-11', questionIds: ['q-s1', 'q-s2', 'q-s3', 'q-s4', 'q-s5', 'q-s6'], pendingQuestions: [], durationMin: 12, published: true, startAt: '', endAt: '', createdAt: nowISO() },
      { id: 'ex-math2', title: 'تمرین سریع ریاضی', titleEn: 'Math Quick Practice', classId: 'cls-10', questionIds: ['q-m1', 'q-m2', 'q-m3'], pendingQuestions: [], durationMin: 5, published: true, startAt: '', endAt: '', createdAt: nowISO() },
      { id: 'ex-lit1', title: 'آزمون ادبیات و تاریخ', titleEn: 'Literature & History', classId: 'cls-12', questionIds: ['q-h1', 'q-h2', 'q-h3', 'q-h4', 'q-h5'], pendingQuestions: [], durationMin: 15, published: false, startAt: '', endAt: '', createdAt: nowISO() }
    ];

    return {
      version: DB_VERSION,
      settings: {
        ai: { baseUrl: '', apiKey: '', model: '' },
        security: { camera: false, blockCopy: true },
        coefficients: {}
      },
      classes: classes, questions: questions, exams: exams, users: users,
      attempts: [], inquiries: [], aiChats: {}
    };
  }

  /* ---------------- بارگذاری اولیه ---------------- */

  function cacheFromLocal() {
    var stored = rawGet(DB_KEY);
    if (!stored) return null;
    try {
      var parsed = JSON.parse(stored);
      if (!parsed || !Array.isArray(parsed.users)) return null;
      if (!Array.isArray(parsed.inquiries)) parsed.inquiries = [];
      if (!parsed.aiChats) parsed.aiChats = {};
      if (!parsed.settings) parsed.settings = seed().settings;
      if (!parsed.settings.coefficients) parsed.settings.coefficients = {};
      return parsed;
    } catch (e) {
      return null;
    }
  }

  /* ---------------- همگام‌سازی با سرور (Stale-While-Revalidate) ---------------- */

  /** آیا کش محلی دادهٔ واقعی دارد (نه فقط دادهٔ نمونه)؟ */
  function looksUsed(data) {
    if (!data) return false;
    if ((data.users || []).length > 1) return true;
    if ((data.attempts || []).length > 0) return true;
    if ((data.inquiries || []).length > 0) return true;
    return false;
  }

  async function pushAllToServer(data) {
    await supabase.from('classes').upsert(data.classes.map(function (c) { return mapToDb('classes', c); }));
    await supabase.from('questions').upsert(data.questions.map(function (q) { return mapToDb('questions', q); }));
    await supabase.from('users').upsert(data.users.map(function (u) { return mapToDb('users', u); }));
    await supabase.from('exams').upsert(data.exams.map(function (e) { return mapToDb('exams', e); }));
    await supabase.from('settings').upsert({ id: 'global', data: data.settings });
  }

  /** خواندن همهٔ جدول‌ها از سرور (کش را تغییر نمی‌دهد) */
  async function fetchRemote(localCache) {
    var results = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('classes').select('*'),
      supabase.from('questions').select('*'),
      supabase.from('exams').select('*'),
      supabase.from('attempts').select('*'),
      supabase.from('inquiries').select('*'),
      supabase.from('settings').select('*').eq('id', 'global'),
      supabase.from('ai_chats').select('*')
    ]);

    var errors = results.map(function (r) { return r.error; }).filter(Boolean);
    if (errors.length) {
      lastError = (errors[0] && (errors[0].message || errors[0].code)) || 'db-error';
      throw new Error(lastError);
    }

    var usersRes = results[0], classesRes = results[1], questionsRes = results[2], examsRes = results[3];
    var attemptsRes = results[4], inquiriesRes = results[5], settingsRes = results[6], chatsRes = results[7];

    var fresh = {
      version: DB_VERSION,
      users: (usersRes.data || []).map(function (u) { return mapFromDb('users', u); }),
      classes: (classesRes.data || []).map(function (c) { return mapFromDb('classes', c); }),
      questions: (questionsRes.data || []).map(function (q) { return mapFromDb('questions', q); }),
      exams: (examsRes.data || []).map(function (e) { return mapFromDb('exams', e); }),
      attempts: (attemptsRes.data || []).map(function (a) { return mapFromDb('attempts', a); }),
      inquiries: (inquiriesRes.data || []).map(function (i) { return mapFromDb('inquiries', i); }),
      settings: (settingsRes.data && settingsRes.data[0] && settingsRes.data[0].data) || seed().settings,
      aiChats: (chatsRes.data || []).reduce(function (acc, item) { acc[item.user_id] = item.messages || []; return acc; }, {})
    };
    if (!fresh.settings.coefficients) fresh.settings.coefficients = {};

    /* اگر دیتابیس خالی است، دادهٔ اولیه (یا کش محلی) را آنجا می‌سازیم */
    if (!fresh.users.length) {
      var initial = (localCache && looksUsed(localCache)) ? clone(localCache) : seed();
      await pushAllToServer(initial);
      return initial;
    }
    return fresh;
  }

  async function boot() {
    if (cache) return cache;

    /* ۱) اول کش محلی: صفحه بلافاصله با همین داده رندر می‌شود */
    var local = cacheFromLocal();
    if (local) cache = local;

    if (!supabase) {
      online = false;
      if (!cache) cache = seed();
      rawSet(DB_KEY, JSON.stringify(cache));
      return cache;
    }

    /* ۲) اگر کشی نیست (اولین ورود)، ناچاریم منتظر سرور بمانیم */
    if (!cache) {
      try {
        cache = await fetchRemote(null);
        online = true;
        lastError = '';
      } catch (error) {
        console.error('Failed to load data from Supabase:', error);
        lastError = (error && (error.message || error.code)) || 'db-error';
        online = false;
        cache = seed();
      }
      rawSet(DB_KEY, JSON.stringify(cache));
      return cache;
    }

    /* ۳) کش داریم: فوراً برمی‌گردیم و در پس‌زمینه تازه‌سازی می‌کنیم */
    fetchRemote(cache).then(function (fresh) {
      cache = fresh;
      online = true;
      lastError = '';
      rawSet(DB_KEY, JSON.stringify(cache));
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        try {
          window.dispatchEvent(new Event('az-store-synced'));
        } catch (e) { /* ignore */ }
      }
    }).catch(function (error) {
      online = false;
      lastError = (error && (error.message || error.code)) || 'db-error';
      console.error('Background sync failed:', error);
    });

    return cache;
  }

  function readDB() { return cache || seed(); }
  function db() { return readDB(); }
  function save() { rawSet(DB_KEY, JSON.stringify(cache)); }

  function isOnline() { return online; }
  function getLastError() { return lastError; }

  /** بررسی سلامت جدول‌ها (برای دکمهٔ «تست اتصال» در تنظیمات) */
  async function dbHealth() {
    if (!supabase) return { offline: true, tables: {}, error: lastError || 'no-client' };
    var tables = ['users', 'classes', 'questions', 'exams', 'attempts', 'inquiries', 'settings', 'ai_chats'];
    var out = {};
    for (var i = 0; i < tables.length; i++) {
      var t = tables[i];
      try {
        var col = t === 'ai_chats' ? 'user_id' : (t === 'settings' ? 'id' : 'id');
        var res = await supabase.from(t).select(col).limit(1);
        out[t] = res.error ? ('ERR: ' + (res.error.code || res.error.message)) : 'ok';
      } catch (e) {
        out[t] = 'ERR: ' + (e && e.message ? e.message : String(e));
      }
    }
    return { offline: false, tables: out, error: '' };
  }

  function getSessionId() { return rawGet(SESSION_KEY); }
  function setSession(id) {
    if (id) rawSet(SESSION_KEY, id);
    else rawRemove(SESSION_KEY);
  }

  function currentUser() {
    var id = getSessionId();
    if (!id) return null;
    var user = findById(db().users, id);
    return user ? clone(user) : null;
  }

  function login(username, password) {
    var u = String(username || '').trim().toLowerCase();
    var p = String(password || '');
    var user = db().users.filter(function (item) {
      return String(item.username).toLowerCase() === u && item.password === p;
    })[0];
    if (!user) return { ok: false, error: 'invalid' };
    setSession(user.id);
    return { ok: true, user: clone(user) };
  }

  function logout() { setSession(null); }
  function isAdmin() { var u = currentUser(); return !!u && u.role === 'admin'; }

  function getSettings() {
    var s = db().settings || {};
    var base = seed().settings;
    return clone({
      ai: s.ai || base.ai,
      security: s.security || base.security,
      coefficients: s.coefficients || {}
    });
  }

  function updateSettings(patch) {
    var s = db().settings = db().settings || {};
    if (patch.ai) s.ai = Object.assign({}, s.ai, patch.ai);
    if (patch.security) s.security = Object.assign({}, s.security, patch.security);
    if (patch.coefficients) s.coefficients = Object.assign({}, s.coefficients, patch.coefficients);
    save();
    syncTable('settings', { id: 'global', data: s });
    return getSettings();
  }

  /* ---------------- کلاس‌ها ---------------- */

  function listClasses() { return clone(db().classes); }
  function getClass(id) { var c = findById(db().classes, id); return c ? clone(c) : null; }
  function studentsOfClass(classId) {
    return clone(db().users.filter(function (u) { return u.role === 'student' && (u.classId || OTHER_CLASS_ID) === classId; }));
  }

  function createClass(data) {
    var names = classNames(data.grade, data.major);
    var item = { id: uid('cls'), grade: data.grade === 'other' ? 'other' : Number(data.grade), major: data.grade === 'other' ? null : (Number(data.grade) >= 10 ? (data.major || 'math') : null), name: names.name, nameEn: names.nameEn };
    db().classes.push(item); save(); syncTable('classes', item);
    return { ok: true, classObj: clone(item) };
  }

  function updateClass(id, data) {
    var item = findById(db().classes, id);
    if (!item || item.id === OTHER_CLASS_ID) return { ok: false, error: 'protected' };
    var names = classNames(data.grade, data.major);
    item.grade = data.grade === 'other' ? 'other' : Number(data.grade);
    item.major = item.grade === 'other' ? null : (Number(item.grade) >= 10 ? (data.major || 'math') : null);
    item.name = names.name; item.nameEn = names.nameEn;
    save(); syncTable('classes', item);
    return { ok: true, classObj: clone(item) };
  }

  function removeClass(id) {
    if (id === OTHER_CLASS_ID) return { ok: false, error: 'protected' };
    var data = db();
    if (data.users.some(function (u) { return u.classId === id; }) || data.exams.some(function (e) { return e.classId === id; })) {
      return { ok: false, error: 'not-empty' };
    }
    data.classes = data.classes.filter(function (c) { return c.id !== id; });
    save(); syncTable('classes', { id: id }, 'delete');
    return { ok: true };
  }

  function classStats(classId) {
    var students = studentsOfClass(classId);
    var exams = db().exams.filter(function (e) { return e.classId === classId; });
    var examIds = exams.map(function (e) { return e.id; });
    var attempts = db().attempts.filter(function (a) {
      return examIds.indexOf(a.examId) !== -1 && a.status === 'done' && !a.practice;
    });
    var avg = attempts.length ? Math.round(attempts.reduce(function (s, a) { return s + a.percent; }, 0) / attempts.length) : 0;
    return { students: students.length, exams: exams.length, attempts: attempts.length, avg: avg };
  }

  /* ---------------- کاربران ---------------- */

  function listAdmins() { return clone(db().users.filter(function (u) { return u.role === 'admin'; })); }

  function listStudents(filter) {
    var list = db().users.filter(function (u) { return u.role === 'student'; });
    if (filter && filter.classId) list = list.filter(function (u) { return (u.classId || OTHER_CLASS_ID) === filter.classId; });
    list.sort(function (a, b) { return String(a.name).localeCompare(String(b.name), 'fa'); });
    return clone(list);
  }

  function getStudent(id) { var u = findById(db().users, id); return u && u.role === 'student' ? clone(u) : null; }

  function createAdmin(data) {
    var username = String(data.username || '').trim();
    if (username.length < 3 || db().users.some(function (u) { return String(u.username).toLowerCase() === username.toLowerCase(); })) {
      return { ok: false, error: 'exists' };
    }
    var user = { id: uid('u'), name: String(data.name || '').trim(), username: username, password: String(data.password || ''), role: 'admin', classId: null, createdAt: nowISO() };
    db().users.push(user); save(); syncTable('users', user);
    return { ok: true, user: clone(user) };
  }

  function updateAdmin(id, data) {
    var user = findById(db().users, id);
    if (!user || user.role !== 'admin') return { ok: false, error: 'not-found' };
    if (data.name) user.name = String(data.name).trim();
    if (data.username) {
      var username = String(data.username).trim();
      if (db().users.some(function (u) { return u.id !== id && String(u.username).toLowerCase() === username.toLowerCase(); })) {
        return { ok: false, error: 'exists' };
      }
      user.username = username;
    }
    if (data.password) user.password = String(data.password);
    save(); syncTable('users', user);
    return { ok: true, user: clone(user) };
  }

  /** تغییر نام کاربری/رمز عبور توسط خود کاربر (ادمین یا دانش‌آموز) */
  function updateUserProfile(data) {
    var me = currentUser();
    if (!me) return { ok: false, error: 'not-found' };
    var user = findById(db().users, me.id);
    if (!user) return { ok: false, error: 'not-found' };

    var changes = {};

    if (data && data.username !== undefined) {
      var username = String(data.username || '').trim();
      if (username !== '' && username !== user.username) {
        if (username.length < 3) return { ok: false, error: 'short' };
        var clash = db().users.some(function (u) {
          return u.id !== user.id && String(u.username).toLowerCase() === username.toLowerCase();
        });
        if (clash) return { ok: false, error: 'exists' };
        if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) return { ok: false, error: 'invalid' };
        changes.username = username;
      }
    }

    if (data && data.password) {
      var pass = String(data.password);
      if (pass.length < 4) return { ok: false, error: 'weak' };
      if (data.confirm !== undefined && String(data.confirm) !== pass) return { ok: false, error: 'mismatch' };
      changes.password = pass;
    }

    if (!Object.keys(changes).length) return { ok: false, error: 'empty' };

    Object.keys(changes).forEach(function (k) { user[k] = changes[k]; });
    save();
    syncTable('users', user);
    return { ok: true, user: clone(user) };
  }

  function removeUser(id) {
    var data = db(); var user = findById(data.users, id);
    if (!user) return { ok: false, error: 'not-found' };
    if (user.role === 'admin' && data.users.filter(function (u) { return u.role === 'admin'; }).length <= 1) {
      return { ok: false, error: 'last-admin' };
    }
    data.users = data.users.filter(function (u) { return u.id !== id; });
    data.attempts = data.attempts.filter(function (a) { return a.userId !== id; });
    save(); syncTable('users', { id: id }, 'delete');
    return { ok: true };
  }

  function createStudent(data) {
    var username = String(data.username || '').trim();
    if (username.length < 3 || db().users.some(function (u) { return String(u.username).toLowerCase() === username.toLowerCase(); })) {
      return { ok: false, error: 'exists' };
    }
    var user = { id: uid('u'), name: String(data.name || '').trim(), username: username, password: String(data.password || ''), role: 'student', classId: data.classId || OTHER_CLASS_ID, createdAt: nowISO() };
    db().users.push(user); save(); syncTable('users', user);
    return { ok: true, user: clone(user) };
  }

  function updateStudent(id, data) {
    var user = findById(db().users, id);
    if (!user || user.role !== 'student') return { ok: false, error: 'not-found' };
    if (data.name !== undefined) user.name = String(data.name).trim();
    if (data.classId !== undefined) user.classId = data.classId || OTHER_CLASS_ID;
    if (data.password) user.password = String(data.password);
    if (data.username) {
      var username = String(data.username).trim();
      if (db().users.some(function (u) { return u.id !== id && String(u.username).toLowerCase() === username.toLowerCase(); })) {
        return { ok: false, error: 'exists' };
      }
      user.username = username;
    }
    save(); syncTable('users', user);
    return { ok: true, user: clone(user) };
  }

  /* ---------------- سوال‌ها ---------------- */

  function listQuestions(filter) {
    var list = db().questions.slice();
    if (filter && filter.subject) list = list.filter(function (q) { return q.subject === filter.subject; });
    if (filter && filter.search) {
      var needle = String(filter.search).toLowerCase();
      list = list.filter(function (q) {
        return String(q.text).toLowerCase().indexOf(needle) !== -1 ||
          String(q.textEn || '').toLowerCase().indexOf(needle) !== -1;
      });
    }
    return clone(list);
  }

  function getQuestion(id) { var item = findById(db().questions, id); return item ? clone(item) : null; }

  function normalizeQuestion(data) {
    var options = (data.options || []).map(function (o) {
      return { text: String(o.text || '').trim(), textEn: String(o.textEn || '').trim(), image: o.image || '' };
    }).filter(function (o) { return o.text || o.image; });
    return {
      text: String(data.text || '').trim(),
      textEn: String(data.textEn || '').trim(),
      image: data.image || '',
      options: options,
      correct: Math.max(0, Math.min(options.length - 1, Number(data.correct) || 0)),
      subject: String(data.subject || '').trim(),
      subjectEn: String(data.subjectEn || data.subject || '').trim(),
      difficulty: data.difficulty || 'medium'
    };
  }

  function createQuestion(data) {
    var item = normalizeQuestion(data); item.id = uid('q'); item.createdAt = nowISO();
    db().questions.push(item); save(); syncTable('questions', item);
    return { ok: true, question: clone(item) };
  }

  function updateQuestion(id, data) {
    var item = findById(db().questions, id);
    if (!item) return { ok: false, error: 'not-found' };
    var next = normalizeQuestion(data);
    Object.keys(next).forEach(function (k) { item[k] = next[k]; });
    save(); syncTable('questions', item);
    return { ok: true, question: clone(item) };
  }

  function removeQuestion(id) {
    var data = db();
    data.questions = data.questions.filter(function (q) { return q.id !== id; });
    data.exams.forEach(function (e) {
      e.questionIds = (e.questionIds || []).filter(function (qid) { return qid !== id; });
    });
    save(); syncTable('questions', { id: id }, 'delete');
    return { ok: true };
  }

  /* ---------------- آزمون‌ها ---------------- */

  function listExams(filter) {
    var list = db().exams.slice();
    if (filter && filter.classId) list = list.filter(function (e) { return e.classId === filter.classId; });
    if (filter && filter.published) list = list.filter(function (e) { return e.published; });
    return clone(list);
  }

  function getExam(id) { var item = findById(db().exams, id); return item ? clone(item) : null; }

  function examsForUser(user) {
    if (!user || user.role !== 'student') return [];
    var classId = user.classId || OTHER_CLASS_ID;
    return clone(db().exams.filter(function (e) { return e.published && e.classId === classId; }));
  }

  function examQuestions(exam) {
    if (!exam) return [];
    var data = db();
    var list = (exam.questionIds || []).map(function (id) { return findById(data.questions, id); }).filter(Boolean);
    var pending = (exam.pendingQuestions || []).filter(function (q) { return q && q.text; });
    return clone(list.concat(pending));
  }

  function normalizeExam(data) {
    return {
      title: String(data.title || '').trim(),
      titleEn: String(data.titleEn || '').trim(),
      classId: data.classId,
      questionIds: (data.questionIds || []).slice(),
      pendingQuestions: (data.pendingQuestions || []).map(normalizeQuestion),
      durationMin: Math.max(1, Math.min(180, Number(data.durationMin) || 10)),
      startAt: data.startAt || '',
      endAt: data.endAt || '',
      published: !!data.published
    };
  }

  function materializePending(examId) {
    var exam = findById(db().exams, examId);
    if (!exam || !exam.pendingQuestions || !exam.pendingQuestions.length) return 0;
    exam.pendingQuestions.forEach(function (q) {
      var res = createQuestion(q);
      if (res.ok) exam.questionIds.push(res.question.id);
    });
    exam.pendingQuestions = [];
    save(); syncTable('exams', exam);
    return true;
  }

  function createExam(data) {
    var item = normalizeExam(data); item.id = uid('ex'); item.createdAt = nowISO();
    db().exams.push(item); save(); syncTable('exams', item);
    if (item.published && item.pendingQuestions.length) materializePending(item.id);
    return { ok: true, exam: clone(findById(db().exams, item.id)) };
  }

  function updateExam(id, data) {
    var item = findById(db().exams, id);
    if (!item) return { ok: false, error: 'not-found' };
    var next = normalizeExam(data);
    Object.keys(next).forEach(function (k) { item[k] = next[k]; });
    save(); syncTable('exams', item);
    if (item.published && item.pendingQuestions.length) materializePending(id);
    return { ok: true, exam: clone(findById(db().exams, id)) };
  }

  function setExamPublished(id, published) {
    var item = findById(db().exams, id);
    if (!item) return { ok: false, error: 'not-found' };
    item.published = !!published;
    save(); syncTable('exams', item);
    if (item.published) materializePending(id);
    return { ok: true, exam: clone(findById(db().exams, id)) };
  }

  function removeExam(id) {
    var data = db();
    data.exams = data.exams.filter(function (e) { return e.id !== id; });
    data.attempts = data.attempts.filter(function (a) { return a.examId !== id; });
    save(); syncTable('exams', { id: id }, 'delete');
    return { ok: true };
  }

  /* ---------------- تلاش‌ها ---------------- */

  function getAttempt(id) { var item = findById(db().attempts, id); return item ? clone(item) : null; }

  function inProgress(examId, userId) {
    var item = db().attempts.filter(function (a) {
      return a.examId === examId && a.userId === userId && a.status === 'in_progress';
    })[0];
    return item ? clone(item) : null;
  }

  function startAttempt(examId, userId) {
    var existing = inProgress(examId, userId);
    if (existing) return { ok: true, attempt: existing, resumed: true };
    var hasOfficial = db().attempts.some(function (a) {
      return a.examId === examId && a.userId === userId && a.status === 'done' && !a.practice;
    });
    var attempt = {
      id: uid('at'), examId: examId, userId: userId, answers: {},
      startedAt: nowISO(), submittedAt: null, status: 'in_progress',
      practice: hasOfficial, correct: 0, wrong: 0, blank: 0, total: 0,
      percent: 0, passed: false, incidents: [], autoSubmitted: false
    };
    db().attempts.push(attempt); save(); syncTable('attempts', attempt);
    return { ok: true, attempt: clone(attempt), resumed: false };
  }

  function saveAnswers(attemptId, answers) {
    var item = findById(db().attempts, attemptId);
    if (!item || item.status !== 'in_progress') return null;
    item.answers = clone(answers || {});
    save();
    return clone(item);
  }

  function addIncident(attemptId, incident) {
    var item = findById(db().attempts, attemptId);
    if (!item) return null;
    item.incidents = item.incidents || [];
    item.incidents.push({ type: incident.type, at: incident.at || nowISO(), image: incident.image || '' });
    save(); syncTable('attempts', item);
    return clone(item);
  }

  function submitAttempt(attemptId, meta) {
    var data = db();
    var attempt = findById(data.attempts, attemptId);
    if (!attempt) return null;
    var exam = findById(data.exams, attempt.examId);
    if (!exam) return null;
    var result = window.AZ.logic.grade(examQuestions(exam), attempt.answers);
    attempt.status = 'done';
    attempt.submittedAt = nowISO();
    attempt.correct = result.correct;
    attempt.wrong = result.wrong;
    attempt.blank = result.blank;
    attempt.total = result.total;
    attempt.percent = result.percent;
    attempt.passed = result.passed;
    attempt.autoSubmitted = !!(meta && meta.auto);
    save(); syncTable('attempts', attempt);
    return clone(attempt);
  }

  function listAttempts(filter) {
    var list = db().attempts.slice();
    if (filter && filter.userId) list = list.filter(function (a) { return a.userId === filter.userId; });
    if (filter && filter.examId) list = list.filter(function (a) { return a.examId === filter.examId; });
    if (filter && filter.status) list = list.filter(function (a) { return a.status === filter.status; });
    list.sort(function (a, b) {
      return new Date(b.submittedAt || b.startedAt).getTime() - new Date(a.submittedAt || a.startedAt).getTime();
    });
    return clone(list);
  }

  function examAttempts(examId) { return listAttempts({ examId: examId, status: 'done' }); }
  function doneAttemptsOfUser(userId) { return listAttempts({ userId: userId, status: 'done' }); }

  function previousAttempt(examId, userId, excludeId) {
    return listAttempts({ examId: examId, userId: userId, status: 'done' }).filter(function (a) { return a.id !== excludeId; })[0] || null;
  }

  /* ---------------- رفع اشکال ---------------- */

  var INQUIRY_LIMIT = 10;
  var INQUIRY_WINDOW_MS = 12 * 60 * 60 * 1000;

  function inquiryQuota(userId) {
    var since = Date.now() - INQUIRY_WINDOW_MS;
    var mine = db().inquiries.filter(function (i) {
      return i.userId === userId && new Date(i.createdAt).getTime() > since;
    }).sort(function (a, b) { return new Date(a.createdAt) - new Date(b.createdAt); });
    return {
      used: mine.length,
      limit: INQUIRY_LIMIT,
      remaining: Math.max(0, INQUIRY_LIMIT - mine.length),
      resetAt: mine.length ? new Date(new Date(mine[0].createdAt).getTime() + INQUIRY_WINDOW_MS).toISOString() : null
    };
  }

  function listInquiries(filter) {
    var list = db().inquiries.slice();
    if (filter && filter.userId) list = list.filter(function (i) { return i.userId === filter.userId; });
    if (filter && filter.status) list = list.filter(function (i) { return i.status === filter.status; });
    list.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    return clone(list);
  }

  function getInquiry(id) { var item = findById(db().inquiries, id); return item ? clone(item) : null; }

  function createInquiry(data) {
    var text = String(data.text || '').trim();
    if (!text && !data.image) return { ok: false, error: 'empty' };
    var quota = inquiryQuota(data.userId);
    if (quota.remaining <= 0) return { ok: false, error: 'quota', resetAt: quota.resetAt };
    var item = {
      id: uid('inq'), userId: data.userId, subject: String(data.subject || '').trim(),
      text: text, image: data.image || '', createdAt: nowISO(), status: 'open', replies: []
    };
    db().inquiries.push(item); save(); syncTable('inquiries', item);
    return { ok: true, inquiry: clone(item) };
  }

  function addInquiryReply(id, data) {
    var item = findById(db().inquiries, id);
    var user = findById(db().users, data.byUserId);
    if (!item || !user) return { ok: false, error: 'not-found' };
    var text = String(data.text || '').trim();
    if (!text && !data.image) return { ok: false, error: 'empty' };
    item.replies = item.replies || [];
    item.replies.push({
      id: uid('rep'), byUserId: user.id, byName: user.name, role: user.role,
      text: text, image: data.image || '', createdAt: nowISO()
    });
    if (user.role === 'admin') item.status = 'answered';
    save(); syncTable('inquiries', item);
    return { ok: true, inquiry: clone(item) };
  }

  function setInquiryStatus(id, status) {
    var item = findById(db().inquiries, id);
    if (!item) return { ok: false, error: 'not-found' };
    item.status = status === 'closed' ? 'closed' : ((item.replies || []).length ? 'answered' : 'open');
    save(); syncTable('inquiries', item);
    return { ok: true, inquiry: clone(item) };
  }

  function removeInquiry(id) {
    db().inquiries = db().inquiries.filter(function (i) { return i.id !== id; });
    save(); syncTable('inquiries', { id: id }, 'delete');
    return { ok: true };
  }

  /* ---------------- گفت‌وگوی درسی با هوش مصنوعی ---------------- */

  function getAiChat(userId) {
    var chats = db().aiChats || {};
    return clone(chats[userId] || []);
  }

  function pushAiChat(userId, message) {
    if (!db().aiChats) db().aiChats = {};
    db().aiChats[userId] = db().aiChats[userId] || [];
    var item = {
      role: message.role === 'assistant' ? 'assistant' : 'user',
      text: String(message.text || ''),
      image: String(message.image || ''),
      imageIgnored: !!message.imageIgnored,
      error: !!message.error,
      at: nowISO()
    };
    db().aiChats[userId].push(item);
    if (db().aiChats[userId].length > 60) db().aiChats[userId] = db().aiChats[userId].slice(-60);
    save();
    syncTable('ai_chats', { user_id: userId, messages: db().aiChats[userId] });
    return item;
  }

  function clearAiChat(userId) {
    if (db().aiChats) delete db().aiChats[userId];
    save();
    syncTable('ai_chats', { user_id: userId }, 'delete', 'user_id');
    return true;
  }

  /* ---------------- بازنشانی ---------------- */

  async function resetAll() {
    cache = seed();
    save();
    if (supabase) {
      try {
        var tables = ['attempts', 'inquiries', 'exams', 'questions', 'users', 'classes', 'ai_chats'];
        for (var i = 0; i < tables.length; i++) {
          var col = tables[i] === 'ai_chats' ? 'user_id' : 'id';
          await supabase.from(tables[i]).delete().neq(col, '0');
        }
        await supabase.from('classes').upsert(cache.classes.map(function (c) { return mapToDb('classes', c); }));
        await supabase.from('questions').upsert(cache.questions.map(function (q) { return mapToDb('questions', q); }));
        await supabase.from('users').upsert(cache.users.map(function (u) { return mapToDb('users', u); }));
        await supabase.from('exams').upsert(cache.exams.map(function (e) { return mapToDb('exams', e); }));
        await supabase.from('settings').upsert({ id: 'global', data: cache.settings });
      } catch (e) {
        console.error('Reset sync failed:', e);
      }
    }
    setSession(null);
    return true;
  }

  window.AZ = window.AZ || {};
  window.AZ.store = {
    DB_KEY: DB_KEY,
    SESSION_KEY: SESSION_KEY,
    OTHER_CLASS_ID: OTHER_CLASS_ID,
    GRADES: GRADES,
    MAJORS: MAJORS,
    gradeInfo: gradeInfo,
    majorInfo: majorInfo,
    classNames: classNames,
    boot: boot,
    db: db,
    save: save,
    _mapToDb: mapToDb,
    _mapFromDb: mapFromDb,
    resetAll: resetAll,
    uid: uid,
    nowISO: nowISO,
    isOnline: isOnline,
    getLastError: getLastError,
    dbHealth: dbHealth,
    getSettings: getSettings,
    updateSettings: updateSettings,
    currentUser: currentUser,
    login: login,
    logout: logout,
    isAdmin: isAdmin,
    listClasses: listClasses,
    getClass: getClass,
    studentsOfClass: studentsOfClass,
    createClass: createClass,
    updateClass: updateClass,
    removeClass: removeClass,
    classStats: classStats,
    listAdmins: listAdmins,
    createAdmin: createAdmin,
    updateAdmin: updateAdmin,
    updateUserProfile: updateUserProfile,
    removeUser: removeUser,
    listStudents: listStudents,
    getStudent: getStudent,
    createStudent: createStudent,
    updateStudent: updateStudent,
    listQuestions: listQuestions,
    getQuestion: getQuestion,
    createQuestion: createQuestion,
    updateQuestion: updateQuestion,
    removeQuestion: removeQuestion,
    listExams: listExams,
    getExam: getExam,
    examsForUser: examsForUser,
    examQuestions: examQuestions,
    createExam: createExam,
    updateExam: updateExam,
    setExamPublished: setExamPublished,
    materializePending: materializePending,
    removeExam: removeExam,
    getAttempt: getAttempt,
    inProgress: inProgress,
    startAttempt: startAttempt,
    saveAnswers: saveAnswers,
    addIncident: addIncident,
    submitAttempt: submitAttempt,
    listAttempts: listAttempts,
    examAttempts: examAttempts,
    doneAttemptsOfUser: doneAttemptsOfUser,
    previousAttempt: previousAttempt,
    INQUIRY_LIMIT: INQUIRY_LIMIT,
    INQUIRY_WINDOW_MS: INQUIRY_WINDOW_MS,
    inquiryQuota: inquiryQuota,
    listInquiries: listInquiries,
    getInquiry: getInquiry,
    createInquiry: createInquiry,
    addInquiryReply: addInquiryReply,
    setInquiryStatus: setInquiryStatus,
    removeInquiry: removeInquiry,
    getAiChat: getAiChat,
    pushAiChat: pushAiChat,
    clearAiChat: clearAiChat
  };
})();
