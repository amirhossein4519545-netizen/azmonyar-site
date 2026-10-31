/* ============================================================
   آزمون‌یار — رابط کاربری، روتر، آزمون، کارنامه و پنل مدیریت
   ============================================================ */
(function () {
  'use strict';

  var AZ = window.AZ;
  var i18n = AZ.i18n;
  var store = AZ.store;
  var logic = AZ.logic;
  var report = AZ.report;
  var ai = AZ.ai;
  var security = AZ.security;
  var jalali = AZ.jalali;

  var appEl = document.getElementById('app');
  var modalRoot = document.getElementById('modal-root');
  var toastRoot = document.getElementById('toast-root');

  /* ---------------- ابزار ---------------- */

  function t(key, vars) { return i18n.t(key, vars); }
  function num(n) { return i18n.num(n); }
  function clsName(cls) { return i18n.className(cls); }

  function esc(value) {
    return String(value === undefined || value === null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function clock(ms) {
    var s = logic.fmtClock(ms);
    if (i18n.lang === 'fa') s = s.replace(/[0-9]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[Number(d)]; });
    return s;
  }

  function timeText(sec) {
    var s = Math.max(0, Math.round(Number(sec) || 0));
    var m = Math.floor(s / 60);
    var r = s % 60;
    var fa = i18n.lang === 'fa';
    if (m === 0) return num(r) + ' ' + (fa ? 'ثانیه' : 's');
    return num(m) + ' ' + t('common.min') + (r ? ' ' + num(r) + ' ' + (fa ? 'ثانیه' : 's') : '');
  }

  function dateText(value, withTime) { return i18n.date(value, withTime); }

  function optionLetter(i) {
    var fa = ['الف', 'ب', 'ج', 'د', 'ه', 'و'];
    var en = ['A', 'B', 'C', 'D', 'E', 'F'];
    var list = i18n.lang === 'fa' ? fa : en;
    return list[i] || String(i + 1);
  }

  function navIcon(kind) {
    var rtl = i18n.lang === 'fa';
    if (kind === 'back') return icon(rtl ? 'right' : 'back');
    return icon(rtl ? 'back' : 'right');
  }

  function qText(q) { return i18n.text(q, 'text'); }
  function optText(o) { return i18n.text(o, 'text'); }

  function subjectOf(q) {
    var s = i18n.lang === 'fa' ? q.subject : (q.subjectEn || q.subject);
    return s || t('common.noSubject');
  }

  function examTitle(exam) {
    if (!exam) return '';
    return i18n.lang === 'fa' ? exam.title : (exam.titleEn || exam.title);
  }

  function difficultyLabel(level) {
    if (level === 'easy') return t('common.easy');
    if (level === 'hard') return t('common.hard');
    return t('common.medium');
  }

  function difficultyTone(level) {
    if (level === 'easy') return 'ok';
    if (level === 'hard') return 'bad';
    return 'warn';
  }

  function toneOf(percent) { return percent >= 50 ? 'ok' : 'bad'; }

  function badge(text, tone) {
    return '<span class="badge badge-' + (tone || 'soft') + '">' + esc(text) + '</span>';
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /** رقم‌های فارسی بدون جداکننده هزارگان (برای سال و روز) */
  function digitsOf(value) {
    return i18n.lang === 'fa' ? jalali.faDigits(String(value)) : String(value);
  }

  /** تاریخ شمسی خوانا: «۹ آبان ۱۴۰۵ · ۱۴:۳۰» */
  function jalaliText(iso) {
    var p = jalali.fromISO(iso);
    if (!p) return '';
    var month = t('month.' + p.jm);
    return digitsOf(p.jd) + ' ' + month + ' ' + digitsOf(p.jy) + ' · ' + digitsOf(pad2(p.hh)) + ':' + digitsOf(pad2(p.mi));
  }

  /** فیلد تاریخ/ساعت شمسی با تقویم سفارشی */
  function dateFieldHtml(field, iso) {
    var text = iso ? jalaliText(iso) : t('exam.pickDateTime');
    return '<div class="dt-field">' +
      '<button type="button" class="dt-btn' + (iso ? '' : ' is-empty') + '" data-action="open-date" data-field="' + esc(field) + '">' +
        '<span class="dt-icon">' + icon('calendar') + '</span>' +
        '<span class="dt-value">' + esc(text) + '</span>' +
        '<span class="dt-caret">' + icon('chevron') + '</span>' +
      '</button>' +
      '<button type="button" class="dt-clear" data-action="clear-date" data-field="' + esc(field) + '" title="' + esc(t('exam.clearDate')) + '"' + (iso ? '' : ' hidden') + '>' + icon('cross') + '</button>' +
      '<input type="hidden" data-f="' + esc(field) + '" value="' + esc(iso || '') + '" />' +
    '</div>';
  }

  function scheduleText(exam) {
    if (!exam.startAt && !exam.endAt) return t('dash.noSchedule');
    var s = exam.startAt ? jalaliText(exam.startAt) : '…';
    var e = exam.endAt ? jalaliText(exam.endAt) : '…';
    return s + '  ←  ' + e;
  }

  var ICONS = {
    check: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    cross: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    sun: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>',
    moon: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    logout: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
    play: '<svg class="ico" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.1v13.8a1 1 0 0 0 1.5.9l11-6.9a1 1 0 0 0 0-1.7l-11-6.9A1 1 0 0 0 8 5.1z"/></svg>',
    edit: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    trash: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg>',
    plus: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    clock: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    flag: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V4M4 5h11l-1.5 3L15 11H4"/></svg>',
    back: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
    right: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>',
    grid: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    list: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
    book: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    users: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    chart: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/></svg>',
    shield: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    reset: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
    image: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
    spark: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/><path d="M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8L19 17z"/></svg>',
    download: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
    search: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    settings: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    calendar: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M8 2.5v4M16 2.5v4M3 9.5h18"/><path d="M8 13.5h.01M12 13.5h.01M16 13.5h.01M8 17h.01M12 17h.01"/></svg>',
    chevron: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
    help: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M9.5 9a2.5 2.5 0 1 1 3.8 2.1c-.8.5-1.3 1-1.3 2"/><path d="M12 16h.01"/></svg>',
    menu: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    user: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>'
  };

  function icon(name) { return ICONS[name] || ''; }

  /* ---------------- تم ---------------- */

  var THEME_KEY = 'azmonyar.theme';

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }
  }

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  /* ---------------- وضعیت ---------------- */

  var state = {
    quiz: null,
    timer: null,
    lastHash: null,
    editingQuestion: null,      /* null | 'new' | id */
    bankFilter: { subject: '', search: '' },
    editingExam: null,          /* null | 'new' | id */
    examDraft: null,
    examMode: 'bank',
    editingClass: null,
    editingStudent: null,       /* null | 'new' | id */
    editingAdmin: null,
    expandedClass: null,
    studentFilter: { classId: '', search: '' },
    ai: { key: null, attemptId: null, text: '', source: '', busy: false, error: '', chat: [], chatBusy: false },
    pendingEditIndex: null,
    inquiryFilter: 'all',
    inquiryTab: 'ai',
    aiAskBusy: false,
    securityOn: false
  };

  function emptyAiState() {
    return { key: null, attemptId: null, text: '', source: '', busy: false, error: '', chat: [], chatBusy: false };
  }

  function aiKeyFor(attemptId, user) {
    return String(attemptId) + ':' + (user ? user.id : 'guest');
  }

  function blankDraft(count) {
    var options = [];
    for (var i = 0; i < (count || 4); i++) options.push({ text: '', textEn: '', image: '' });
    return {
      text: '', textEn: '', image: '', subject: '', difficulty: 'medium',
      correct: 0, options: options
    };
  }

  function draftFromQuestion(q) {
    var d = {
      text: q.text || '',
      textEn: q.textEn || '',
      image: q.image || '',
      subject: q.subject || '',
      difficulty: q.difficulty || 'medium',
      correct: Number(q.correct) || 0,
      options: (q.options || []).map(function (o) {
        return { text: o.text || '', textEn: o.textEn || '', image: o.image || '' };
      })
    };
    if (!d.options.length) d.options = blankDraft(4).options;
    return d;
  }

  /* ---------------- مسیریابی ---------------- */

  function parseHash() {
    var raw = String(location.hash || '').replace(/^#\/?/, '');
    var parts = raw.split('/').filter(function (p) { return p !== ''; });
    if (!parts.length) return { name: 'dashboard', parts: [] };
    return { name: parts[0], parts: parts.slice(1) };
  }

  function navigate(path) {
    var next = '#/' + String(path || '').replace(/^#?\/?/, '');
    if (location.hash === next) render();
    else location.hash = next;
  }

  function render() {
    if (AZ.picker && AZ.picker.isOpen && AZ.picker.isOpen()) AZ.picker.close();
    document.body.classList.remove('menu-open');
    var route = parseHash();
    var user = store.currentUser();
    var html;

    if (!user) {
      html = viewAuth();
    } else {
      if (route.name === 'login') { navigate('dashboard'); return; }
      var adminOnly = route.name === 'admin';
      if (adminOnly && user.role !== 'admin') { navigate('dashboard'); return; }
      if (route.name === 'exam' && user.role === 'admin') { navigate('dashboard'); return; }
      if (route.name === 'exam' && state.quiz && state.quiz.examId !== route.parts[0]) state.quiz = null;
      html = shell(user, viewFor(route, user));
    }

    appEl.innerHTML = html;
    document.title = (user ? user.name + ' · ' : '') + t('app.name');
    afterRender(route, user);
  }

  function viewFor(route, user) {
    if (route.name === 'exam') return viewQuiz(route.parts[0], user);
    if (route.name === 'result') return viewResult(route.parts[0], user);
    if (route.name === 'inquiries') return user.role === 'admin' ? viewAdminInquiries() : viewStudentInquiries(user);
    if (route.name === 'history') return user.role === 'admin' ? viewAdminReports() : viewStudentHistory(user);
    if (route.name === 'admin') return viewAdmin(route, user);
    if (route.name === 'student') return viewStudentDetail(route.parts[0]);
    return user.role === 'admin' ? viewAdminDashboard() : viewStudentDashboard(user);
  }

  function afterRender(route) {
    if (route.name === 'exam' && state.quiz) startTimer();
    else stopTimer();

    if (route.name === 'exam' && state.quiz) attachSecurity();
    else detachSecurity();

    if (state.lastHash !== location.hash) {
      window.scrollTo(0, 0);
      state.lastHash = location.hash;
    }

    var chatBox = document.getElementById('ai-chat');
    if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
  }

  /* ---------------- پوسته ---------------- */

  function shell(user, content) {
    var route = parseHash();
    var isAdmin = user.role === 'admin';
    var navItems = isAdmin
      ? [
        { key: 'dashboard', label: t('nav.dashboard'), icon: 'grid' },
        { key: 'admin/questions', label: t('nav.questions'), icon: 'book' },
        { key: 'admin/exams', label: t('nav.exams'), icon: 'list' },
        { key: 'admin/classes', label: t('nav.classes'), icon: 'grid' },
        { key: 'admin/students', label: t('nav.students'), icon: 'users' },
        { key: 'admin/inquiries', label: t('nav.inquiries'), icon: 'help' },
        { key: 'admin/admins', label: t('nav.admins'), icon: 'shield' },
        { key: 'admin/reports', label: t('nav.reports'), icon: 'chart' }
      ]
      : [
        { key: 'dashboard', label: t('nav.dashboard'), icon: 'grid' },
        { key: 'inquiries', label: t('nav.inquiries'), icon: 'help' },
        { key: 'history', label: t('nav.history'), icon: 'chart' }
      ];

    var currentPath = route.parts.length ? route.name + '/' + route.parts.slice(0, 1).join('') : route.name;
    var isNavActive = function (item) {
      return currentPath === item.key || (item.key === 'admin/reports' && route.name === 'admin' && route.parts[0] === 'reports') ||
        (item.key.endsWith('/classes') && route.name === 'admin' && route.parts[0] === 'classes');
    };
    var navHtml = navItems.map(function (item) {
      var active = isNavActive(item);
      return '<a class="nav-link' + (active ? ' is-active' : '') + '" href="#/' + item.key + '"' + (active ? ' aria-current="page"' : '') + '>' +
        icon(item.icon) + '<span>' + esc(item.label) + '</span></a>';
    }).join('');

    var mobileNavHtml = navItems.map(function (item) {
      var active = isNavActive(item);
      return '<a class="mobile-nav-link' + (active ? ' is-active' : '') + '" href="#/' + item.key + '">' +
        icon(item.icon) + '<span>' + esc(item.label) + '</span></a>';
    }).join('');

    var cls = store.getClass(user.classId || store.OTHER_CLASS_ID);
    var initials = (user.name || user.username || '?').trim().charAt(0);
    var roleLabel = isAdmin ? t('nav.roleAdmin') : clsName(cls);

    return '<div class="shell">' +
      '<header class="topbar"><div class="wrap topbar-in">' +
        '<a class="brand" href="#/dashboard">' +
          '<span class="brand-logo">' + icon('check') + '</span>' +
          '<span class="brand-text"><strong>' + esc(t('app.name')) + '</strong><small>' + esc(t('app.tagline')) + '</small></span>' +
        '</a>' +
        '<nav class="mainnav" aria-label="main">' + navHtml + '</nav>' +
        '<div class="topbar-actions">' +
          (store.isOnline && !store.isOnline()
            ? '<span class="sync-badge" title="' + esc(store.getLastError ? (store.getLastError() || '') : '') + '">' + esc(t('db.localBadge')) + '</span>'
            : '') +
          '<button type="button" class="chip-btn" data-action="toggle-lang" title="' + esc(t('nav.langTitle')) + '">' + esc(t('nav.langShort')) + '</button>' +
          '<button type="button" class="icon-btn" data-action="toggle-theme" title="' + esc(t('nav.themeTitle')) + '">' +
            (currentTheme() === 'dark' ? icon('sun') : icon('moon')) +
          '</button>' +
          '<button type="button" class="user-chip" data-action="open-profile" title="' + esc(t('profile.editHint')) + '">' +
            '<span class="avatar">' + esc(initials) + '</span>' +
            '<span class="user-meta"><strong><bdi>' + esc(user.name) + '</bdi></strong><small>' + esc(roleLabel) + '</small></span></button>' +
          '<button type="button" class="icon-btn" data-action="logout" title="' + esc(t('nav.logout')) + '">' + icon('logout') + '</button>' +
          '<button type="button" class="icon-btn mobile-menu-btn" data-action="toggle-mobile-menu" aria-controls="mobile-menu" aria-expanded="false" title="' + esc(t('nav.menu')) + '">' + icon('menu') + '</button>' +
        '</div>' +
      '</div></header>' +
      '<div class="mobile-menu-backdrop" data-action="close-mobile-menu"></div>' +
      '<aside class="mobile-menu" id="mobile-menu" aria-hidden="true" aria-label="' + esc(t('nav.menu')) + '">' +
        '<div class="mobile-menu-head"><strong>' + esc(t('nav.menu')) + '</strong>' +
          '<button type="button" class="icon-btn" data-action="close-mobile-menu" title="' + esc(t('common.close')) + '">' + icon('cross') + '</button></div>' +
        '<nav class="mobile-menu-nav">' + mobileNavHtml + '</nav>' +
        '<div class="mobile-menu-sep"></div>' +
        '<button type="button" class="mobile-menu-row" data-action="open-profile">' + icon('user') + '<span>' + esc(t('profile.title')) + '</span></button>' +
        '<button type="button" class="mobile-menu-row" data-action="toggle-theme">' + (currentTheme() === 'dark' ? icon('sun') : icon('moon')) + '<span>' + esc(t('nav.themeTitle')) + '</span></button>' +
        '<button type="button" class="mobile-menu-row" data-action="toggle-lang">' + icon('help') + '<span>' + esc(t('nav.langTitle')) + '</span></button>' +
        '<button type="button" class="mobile-menu-row is-danger" data-action="logout">' + icon('logout') + '<span>' + esc(t('nav.logout')) + '</span></button>' +
      '</aside>' +
      '<main class="wrap main" id="main-content">' + content + '</main>' +
      (t('app.footer') ? '<footer class="footer"><div class="wrap"><span>' + esc(t('app.footer')) + '</span></div></footer>' : '') +
    '</div>';
  }

  /* ---------------- ورود ---------------- */

  function viewAuth() {
    return '<div class="auth">' +
      '<section class="auth-hero">' +
        '<div class="auth-hero-top"><span class="brand-logo lg">' + icon('check') + '</span><strong>' + esc(t('app.name')) + '</strong></div>' +
        '<h1>' + esc(t('auth.heroTitle')) + '</h1>' +
        '<p>' + esc(t('auth.heroText')) + '</p>' +
        '<ul class="hero-list">' +
          '<li>' + icon('chart') + '<span>' + esc(t('auth.feature1')) + '</span></li>' +
          '<li>' + icon('shield') + '<span>' + esc(t('auth.feature2')) + '</span></li>' +
          '<li>' + icon('spark') + '<span>' + esc(t('auth.feature3')) + '</span></li>' +
        '</ul>' +
        (t('app.footer') ? '<p class="hero-note">' + esc(t('app.footer')) + '</p>' : '') +
      '</section>' +
      '<section class="auth-card">' +
        '<div class="brand-logo lg auth-logo">' + icon('check') + '</div>' +
        '<h2>' + esc(t('auth.title')) + '</h2>' +
        '<p class="muted small">' + esc(t('auth.subtitle')) + '</p>' +
        '<form id="login-form" class="form" novalidate>' +
          '<div class="field"><label for="login-username">' + esc(t('auth.username')) + '</label>' +
            '<input id="login-username" name="username" type="text" autocomplete="username" dir="ltr" required /></div>' +
          '<div class="field"><label for="login-password">' + esc(t('auth.password')) + '</label>' +
            '<input id="login-password" name="password" type="password" autocomplete="current-password" dir="ltr" required /></div>' +
          '<p class="form-error" id="auth-error" hidden></p>' +
          '<button class="btn btn-primary btn-block" type="submit">' + esc(t('auth.submit')) + '</button>' +
        '</form>' +
        '<p class="muted small center">' + esc(t('auth.adminOnly')) + '</p>' +
      '</section>' +
    '</div>';
  }

  /* ---------------- داشبورد دانش‌آموز ---------------- */

  function examStatusOf(exam, user) {
    var progress = store.inProgress(exam.id, user.id);
    var last = store.doneAttemptsOfUser(user.id).filter(function (a) {
      return a.examId === exam.id && !a.practice;
    })[0];
    var win = logic.examWindow(exam);
    return { progress: progress, last: last, window: win };
  }

  function viewStudentDashboard(user) {
    var exams = store.examsForUser(user);
    var attempts = store.doneAttemptsOfUser(user.id);
    var realAttempts = attempts.filter(function (a) { return !a.practice; });
    var takenExams = {};
    realAttempts.forEach(function (a) { takenExams[a.examId] = true; });
    var tarazValues = realAttempts.map(function (a) {
      var exam = store.getExam(a.examId);
      if (!exam) return 5000;
      var peers = report.participants(exam.id).map(function (r) { return r.percent; });
      return logic.taraz(a.percent, peers).value;
    });
    var avg = realAttempts.length ? Math.round(realAttempts.reduce(function (s, a) { return s + a.percent; }, 0) / realAttempts.length) : 0;
    var bestTaraz = tarazValues.length ? Math.max.apply(null, tarazValues) : 0;

    var cards = exams.length ? exams.map(function (exam) {
      var st = examStatusOf(exam, user);
      var tone = st.progress ? 'warn' : (st.last ? 'ok' : 'soft');
      var statusText = st.progress ? t('dash.statusInProgress')
        : (st.last ? t('dash.statusDone')
          : (st.window === 'upcoming' ? t('dash.statusUpcoming') : (st.window === 'closed' ? t('dash.statusClosed') : '')));

      var actions = '';
      if (st.progress) {
        actions = '<button type="button" class="btn btn-primary btn-sm" data-action="start-exam" data-id="' + esc(exam.id) + '">' + icon('play') + '<span>' + esc(t('dash.resume')) + '</span></button>';
      } else if (st.window === 'open') {
        actions = '<button type="button" class="btn btn-primary btn-sm" data-action="start-exam" data-id="' + esc(exam.id) + '">' + icon('play') + '<span>' + esc(st.last ? t('dash.retake') : t('dash.start')) + '</span></button>' +
          (st.last ? '<a class="btn btn-ghost btn-sm" href="#/result/' + esc(st.last.id) + '">' + esc(t('dash.viewResult')) + '</a>' : '');
      } else {
        actions = st.last ? '<a class="btn btn-ghost btn-sm" href="#/result/' + esc(st.last.id) + '">' + esc(t('dash.viewResult')) + '</a>' : '';
      }

      return '<article class="exam-card card">' +
        '<div class="exam-card-top"><span class="badge badge-soft">' + esc(clsName(store.getClass(exam.classId))) + '</span>' +
          (statusText ? badge(statusText, tone) : '') + '</div>' +
        '<h3>' + esc(examTitle(exam)) + '</h3>' +
        '<p class="exam-meta">' +
          '<span>' + icon('book') + t('exam.questionsCount', { n: num(store.examQuestions(exam).length) }) + '</span>' +
          '<span>' + icon('clock') + num(exam.durationMin) + ' ' + t('common.min') + '</span>' +
        '</p>' +
        '<p class="exam-schedule">' + icon('clock') + esc(scheduleText(exam)) + '</p>' +
        (st.last ? '<p class="muted small">' + esc(t('result.taraz')) + ': <strong>' + num(tarazOfAttempt(st.last, exam)) + '</strong> · ' + num(st.last.percent) + '%</p>' : '') +
        '<div class="exam-card-foot"><div class="exam-actions">' + actions + '</div></div>' +
      '</article>';
    }).join('') : '<div class="empty card">' + esc(t('dash.noExams')) + '</div>';

    var recent = attempts.slice(0, 4).map(function (a) {
      var exam = store.getExam(a.examId);
      return '<a class="result-row" href="#/result/' + esc(a.id) + '">' +
        '<span class="result-row-main"><strong>' + esc(examTitle(exam)) +
          (a.practice ? ' <span class="badge badge-warn">' + esc(t('practice.badge')) + '</span>' : '') + '</strong>' +
          '<small>' + esc(dateText(a.submittedAt, true)) + '</small></span>' +
        '<span class="score-pill ' + toneOf(a.percent) + '">' + num(a.percent) + '%</span>' +
      '</a>';
    }).join('');

    return '<section class="hero card">' +
        '<div class="hero-text"><h1>' + t('dash.greeting', { name: '<bdi>' + esc(user.name) + '</bdi>' }) + '</h1>' +
          '<p>' + esc(t('dash.sub')) + '</p></div>' +
        '<div class="hero-side"><span class="class-chip">' + icon('users') +
          esc(t('dash.classChip', { class: clsName(store.getClass(user.classId || store.OTHER_CLASS_ID)) })) + '</span></div>' +
      '</section>' +
      '<section class="stats">' +
        statCard('list', num(exams.length), t('dash.statAvailable')) +
        statCard('check', num(Object.keys(takenExams).length), t('dash.statTaken')) +        statCard('chart', num(avg) + '%', t('dash.statAvg')) +
        statCard('flag', num(bestTaraz), t('dash.statBestTaraz')) +
      '</section>' +
      '<section class="section"><div class="section-head"><div><h2>' + esc(t('dash.myExams')) + '</h2>' +
        '<p class="muted small">' + esc(t('dash.myExamsHint')) + '</p></div></div>' +
        '<div class="exam-grid">' + cards + '</div></section>' +
      (attempts.length ? '<section class="section"><div class="section-head"><div><h2>' + esc(t('dash.recent')) + '</h2></div>' +
        '<a class="link" href="#/history">' + esc(t('dash.seeAll')) + '</a></div>' +
        '<div class="result-list card">' + recent + '</div></section>' : '');
  }

  function tarazOfAttempt(attempt, exam) {
    if (!exam) return 5000;
    var peers = report.participants(exam.id).map(function (r) { return r.percent; });
    return logic.taraz(attempt.percent, peers).value;
  }

  function statCard(iconName, value, label) {
    return '<div class="stat card"><span class="stat-ico">' + icon(iconName) + '</span>' +
      '<span class="stat-value">' + esc(value) + '</span><span class="stat-label">' + esc(label) + '</span></div>';
  }

  /* ---------------- آزمون ---------------- */

  function currentQuestion() {
    var quiz = state.quiz;
    if (!quiz || !quiz.questions.length) return null;
    return quiz.questions[quiz.index] || quiz.questions[0];
  }

  function initQuiz(exam, attempt) {
    state.quiz = {
      examId: exam.id,
      attemptId: attempt.id,
      exam: exam,
      attempt: attempt,
      questions: store.examQuestions(exam),
      answers: JSON.parse(JSON.stringify(attempt.answers || {})),
      index: 0,
      marked: {},
      submitting: false,
      incidents: (attempt.incidents || []).slice()
    };
  }

  function startExam(examId) {
    var user = store.currentUser();
    if (!user || user.role !== 'student') return;
    var exam = store.getExam(examId);
    if (!exam) return;
    if (logic.examWindow(exam) !== 'open') {
      toast(t('quiz.notStarted'), 'bad');
      return;
    }
    if (security) {
      security.enterFullscreen();
      if (store.getSettings().security.camera) {
        /* اشتراک صفحه فقط با کلیک کاربر ممکن است؛ دکمه‌اش در ستون کنار آزمون است */
      }
    }
    var res = store.startAttempt(examId, user.id);
    if (!res.ok) return;
    state.quiz = null;
    navigate('exam/' + examId);
    render();
  }

  function screenShareCard() {
    var settings = store.getSettings();
    if (!settings.security || !settings.security.camera) return '';
    if (security.isScreenActive && security.isScreenActive()) {
      return '<p class="screen-badge is-on">' + icon('check') + esc(t('quiz.shareOn')) + '</p>';
    }
    return '<div class="screen-share">' +
      '<p class="muted small">' + icon('image') + ' ' + esc(t('quiz.shareHint')) + '</p>' +
      '<button type="button" class="btn btn-ghost btn-sm btn-block" data-action="share-screen">' + esc(t('quiz.share')) + '</button>' +
      '</div>';
  }

  function viewQuiz(examId, user) {
    var exam = store.getExam(examId);
    if (!exam) return notFound();

    var win = logic.examWindow(exam);
    if (win === 'upcoming') {
      return emptyPage(t('quiz.notStarted'), t('quiz.startsAt', { date: dateText(exam.startAt, true) }));
    }
    if (win === 'closed' && !store.doneAttemptsOfUser(user.id).filter(function (a) { return a.examId === exam.id; }).length) {
      return emptyPage(t('quiz.closed'), t('quiz.endsAt', { date: dateText(exam.endAt, true) }));
    }

    var attempt = store.inProgress(exam.id, user.id);
    if (!attempt) {
      var questions = store.examQuestions(exam);
      return '<div class="empty-page card">' +
        '<span class="big-ico">' + icon('list') + '</span>' +
        '<h2>' + esc(examTitle(exam)) + '</h2>' +
        '<p class="muted">' + esc(t('exam.questionsCount', { n: num(questions.length) }) + ' · ' + num(exam.durationMin) + ' ' + t('common.min')) + '</p>' +
        (exam.startAt || exam.endAt ? '<p class="muted small">' + esc(t('quiz.windowHint', { start: dateText(exam.startAt, true), end: dateText(exam.endAt, true) })) + '</p>' : '') +
        '<button type="button" class="btn btn-primary" data-action="start-exam" data-id="' + esc(exam.id) + '">' + icon('play') + '<span>' + esc(t('dash.start')) + '</span></button>' +
      '</div>';
    }

    if (!state.quiz || state.quiz.attemptId !== attempt.id) initQuiz(exam, attempt);
    var quiz = state.quiz;
    quiz.attempt = attempt;
    if (!quiz.questions.length) return emptyPage(t('quiz.noQuestions'), '');
    if (quiz.index >= quiz.questions.length) quiz.index = 0;

    var q = currentQuestion();
    var chosen = logic.chosenOf(quiz.answers, q.id);
    var answered = logic.answeredCount(quiz.questions, quiz.answers);
    var isMarked = !!quiz.marked[q.id];
    var incidentCount = (quiz.incidents || []).length;

    var optionsHtml = q.options.map(function (opt, i) {
      var isChosen = chosen === i;
      return '<label class="option' + (isChosen ? ' is-selected' : '') + '" data-index="' + i + '">' +
        '<input type="radio" name="opt" value="' + i + '"' + (isChosen ? ' checked' : '') + ' />' +
        '<span class="option-letter">' + esc(optionLetter(i)) + '</span>' +
        '<span class="option-text">' + esc(optText(opt)) +
          (opt.image ? '<img class="opt-img" src="' + esc(opt.image) + '" alt="" />' : '') +
        '</span></label>';
    }).join('');

    var palette = quiz.questions.map(function (item, i) {
      var isAnswered = logic.chosenOf(quiz.answers, item.id) !== null;
      return '<button type="button" class="palette-btn' + (isAnswered ? ' is-answered' : '') +
        (i === quiz.index ? ' is-current' : '') + (quiz.marked[item.id] ? ' is-marked' : '') +
        '" data-action="quiz-goto" data-i="' + i + '">' + num(i + 1) + '</button>';
    }).join('');

    return '<div class="quiz">' +
      '<div class="quiz-bar card">' +
        '<div class="quiz-bar-left">' +
          '<a class="icon-btn" href="#/dashboard" data-action="exit-exam" title="' + esc(t('quiz.exit')) + '">' + navIcon('back') + '</a>' +
          '<div class="quiz-bar-title"><strong>' + esc(examTitle(exam)) + '</strong>' +
            '<small>' + esc(t('quiz.questionOf', { a: num(quiz.index + 1), b: num(quiz.questions.length) })) + '</small></div>' +
        '</div>' +
        '<div class="quiz-bar-right">' +
          (incidentCount ? '<span class="badge badge-bad" id="security-count">' + esc(t('quiz.securityCount', { n: num(incidentCount) })) + '</span>' : '<span class="badge badge-soft" id="security-count" hidden></span>') +
          '<div class="quiz-timer" id="quiz-timer-wrap"><span class="timer-label">' + icon('clock') + esc(t('quiz.timeLeft')) + '</span>' +
            '<strong id="quiz-timer" class="clock">--:--</strong></div>' +
        '</div>' +
      '</div>' +
      '<div class="quiz-layout">' +
        '<section class="question-card card">' +
          '<div class="q-head"><span class="q-num">' + num(quiz.index + 1) + '</span>' +
            '<div class="q-tags">' + badge(subjectOf(q), 'soft') + badge(difficultyLabel(q.difficulty), difficultyTone(q.difficulty)) +
              (isMarked ? badge(t('quiz.marked'), 'warn') : '') + '</div></div>' +
          '<h2 class="q-text">' + esc(qText(q)) + '</h2>' +
          (q.image ? '<img class="q-img" src="' + esc(q.image) + '" alt="" />' : '') +
          '<p class="muted small q-hint">' + esc(t('quiz.singleChoice')) + '</p>' +
          '<div class="options" id="option-list">' + optionsHtml + '</div>' +
          '<div class="q-actions">' +
            '<button type="button" class="btn btn-ghost btn-sm" data-action="quiz-prev" title="' + esc(t('quiz.prev')) + '"' + (quiz.index === 0 ? ' disabled' : '') + '>' + navIcon('back') + '<span>' + esc(t('quiz.prev')) + '</span></button>' +
            '<button type="button" class="btn btn-ghost btn-sm" data-action="quiz-mark" title="' + esc(isMarked ? t('quiz.unmark') : t('quiz.mark')) + '">' + icon('flag') + '<span>' + esc(isMarked ? t('quiz.unmark') : t('quiz.mark')) + '</span></button>' +
            '<button type="button" class="btn btn-ghost btn-sm" data-action="quiz-clear" title="' + esc(t('quiz.clear')) + '">' + icon('cross') + '<span>' + esc(t('quiz.clear')) + '</span></button>' +
            '<span class="spacer"></span>' +
            '<button type="button" class="btn btn-primary btn-sm" data-action="quiz-next"' + (quiz.index === quiz.questions.length - 1 ? ' disabled' : '') + '>' +
              '<span>' + esc(t('quiz.next')) + '</span>' + navIcon('next') + '</button>' +
          '</div>' +
        '</section>' +
        '<aside class="quiz-side card">' +
          '<div class="side-head"><h3>' + esc(t('quiz.palette')) + '</h3><span class="muted small">' + esc(t('quiz.answered')) + ': ' + num(answered) + '/' + num(quiz.questions.length) + '</span></div>' +
          '<div class="palette" id="palette">' + palette + '</div>' +
          '<div class="palette-legend">' +
            '<span><i class="dot dot-answered"></i>' + esc(t('quiz.answered')) + '</span>' +
            '<span><i class="dot dot-empty"></i>' + esc(t('quiz.unanswered')) + '</span>' +
            '<span><i class="dot dot-marked"></i>' + esc(t('quiz.marked')) + '</span>' +
          '</div>' +
          '<button type="button" class="btn btn-primary btn-block" data-action="quiz-submit">' + esc(t('quiz.submit')) + '</button>' +
          screenShareCard() +
          '<p class="muted small center">' + icon('shield') + ' ' + esc(t('quiz.security')) + '</p>' +
        '</aside>' +
      '</div>' +
    '</div>';
  }

  function syncQuizUI() {
    var quiz = state.quiz;
    if (!quiz) return;
    var q = currentQuestion();
    if (!q) return;
    var chosen = logic.chosenOf(quiz.answers, q.id);
    var opts = document.querySelectorAll('#option-list .option');
    for (var i = 0; i < opts.length; i++) {
      var el = opts[i];
      var isChosen = Number(el.getAttribute('data-index')) === chosen;
      el.classList.toggle('is-selected', isChosen);
      var input = el.querySelector('input');
      if (input) input.checked = isChosen;
    }
    var answered = logic.answeredCount(quiz.questions, quiz.answers);
    var side = document.querySelector('.side-head .muted');
    if (side) side.textContent = t('quiz.answered') + ': ' + num(answered) + '/' + num(quiz.questions.length);
    var buttons = document.querySelectorAll('#palette .palette-btn');
    for (var j = 0; j < buttons.length; j++) {
      buttons[j].classList.toggle('is-answered', logic.chosenOf(quiz.answers, quiz.questions[j].id) !== null);
    }
  }

  function persistAnswers() {
    if (!state.quiz) return;
    store.saveAnswers(state.quiz.attemptId, state.quiz.answers);
  }

  function submitQuiz(auto) {
    var quiz = state.quiz;
    if (!quiz || quiz.submitting) return;
    quiz.submitting = true;
    stopTimer();
    detachSecurity();
    var attempt = store.submitAttempt(quiz.attemptId, { auto: !!auto });
    state.quiz = null;
    if (!attempt) { navigate('dashboard'); return; }
    if (auto) toast(t('quiz.autoNote'), 'warn');
    navigate('result/' + attempt.id);
    render();
  }

  /* امنیت آزمون */

  function attachSecurity() {
    if (!security || state.securityOn || !state.quiz) return;
    state.securityOn = true;
    security.attach({
      onIncident: function (incident) {
        if (!state.quiz) return;
        store.addIncident(state.quiz.attemptId, incident);
        state.quiz.incidents.push(incident);
        var el = document.getElementById('security-count');
        if (el) {
          el.hidden = false;
          el.textContent = t('quiz.securityCount', { n: num(state.quiz.incidents.length) });
        }
        toast(t('quiz.securityWarn', { type: t('incident.' + incident.type) }), 'bad');
      }
    });
  }

  function detachSecurity() {
    if (!security || !state.securityOn) return;
    security.detach();
    state.securityOn = false;
  }

  /* تایمر */

  function startTimer() {
    stopTimer();
    tick();
    state.timer = setInterval(tick, 500);
  }

  function stopTimer() {
    if (state.timer) { clearInterval(state.timer); state.timer = null; }
  }

  function tick() {
    var quiz = state.quiz;
    if (!quiz) { stopTimer(); return; }
    var remaining = logic.remainingMs(quiz.attempt.startedAt, quiz.exam.durationMin, Date.now(), quiz.exam.endAt);
    var el = document.getElementById('quiz-timer');
    if (el) {
      el.textContent = clock(remaining);
      var box = document.getElementById('quiz-timer-wrap');
      if (box) box.classList.toggle('is-urgent', remaining <= 60000);
    }
    if (remaining <= 0 && !quiz.submitting) submitQuiz(true);
  }

  /* ---------------- کارنامه ---------------- */

  function viewResult(attemptId, user) {
    var data = report.build(attemptId);
    if (!data) return notFound();
    if (user.role !== 'admin' && data.attempt.userId !== user.id) return notFound();
    if (data.attempt.status !== 'done') {
      return emptyPage(t('dash.statusInProgress'), '', '#/exam/' + data.exam.id, t('dash.resume'));
    }

    var isAdmin = user.role === 'admin';
    var attempt = data.attempt;

    var identity = '<div class="report-identity">' +
      '<div><span class="muted small">' + esc(t('result.student')) + '</span><strong>' + esc(data.student ? data.student.name : '—') + '</strong></div>' +
      '<div><span class="muted small">' + esc(t('common.class')) + '</span><strong>' + esc(data.classObj ? clsName(data.classObj) : '—') + '</strong></div>' +
      '<div><span class="muted small">' + esc(t('result.date')) + '</span><strong>' + esc(dateText(attempt.submittedAt, true)) + '</strong></div>' +
      '<div><span class="muted small">' + esc(t('result.timeTaken')) + '</span><strong>' + esc(timeText(data.timeSec)) + '</strong></div>' +
    '</div>';

    var summary = [
      [num(data.result.total), t('result.colQuestions')],
      [num(data.result.correct), t('result.correct')],
      [num(data.result.wrong), t('result.wrong')],
      [num(data.result.blank), t('result.blank')],
      [num(data.percent) + '%', t('result.score')],
      [num(data.score20), t('result.score20')],
      [num(data.taraz) + (data.tarazInfo.estimated ? ' ≈' : ''), t('result.taraz')],
      [num(data.rank.rank) + ' ' + t('common.of') + ' ' + num(data.rank.of), t('result.rank')]
    ].map(function (pair) {
      return '<div class="rs"><strong>' + esc(pair[0]) + '</strong><span>' + esc(pair[1]) + '</span></div>';
    }).join('');

    var subjectRows = data.subjects.map(function (s) {
      return '<tr>' +
        '<td data-label="' + esc(t('result.colSubject')) + '"><strong>' + esc(s.subject) + '</strong></td>' +
        '<td data-label="' + esc(t('result.colCoefficient')) + '"><span class="coef-badge">' + num(s.coefficient || 1) + '</span></td>' +
        '<td data-label="' + esc(t('result.colQuestions')) + '">' + num(s.total) + '</td>' +
        '<td data-label="' + esc(t('result.colCorrect')) + '">' + num(s.correct) + '</td>' +
        '<td data-label="' + esc(t('result.colWrong')) + '">' + num(s.wrong) + '</td>' +
        '<td data-label="' + esc(t('result.colBlank')) + '">' + num(s.blank) + '</td>' +
        '<td data-label="' + esc(t('result.colPercent')) + '"><span class="score-pill ' + toneOf(s.percent) + '">' + num(s.percent) + '%</span></td>' +
        '<td data-label="' + esc(t('result.colBestPercent')) + '">' + num(s.bestPercent) + '%</td>' +
        '<td data-label="' + esc(t('result.colTaraz')) + '">' + num(s.taraz) + (s.estimated ? ' ≈' : '') + '</td>' +
        '<td data-label="' + esc(t('result.colBestTaraz')) + '">' + num(s.bestTaraz) + '</td>' +
      '</tr>';
    }).join('');

    var topExam = data.topExam.map(function (r) {
      return '<li><span class="rank-badge">' + num(r.rank) + '</span><span class="top-name">' + esc(r.name) + '</span>' +
        '<span class="score-pill ' + toneOf(r.percent) + '">' + num(r.percent) + '%</span></li>';
    }).join('');

    var topClass = data.topClass.map(function (r) {
      return '<li><span class="rank-badge">' + num(r.rank) + '</span><span class="top-name">' + esc(r.name) + '</span>' +
        '<span class="score-pill ' + toneOf(r.percent) + '">' + num(r.percent) + '%</span></li>';
    }).join('');

    var sheet = data.sheet.map(function (cell) {
      return '<button type="button" class="sheet-cell is-' + cell.status + '" data-action="focus-question" data-index="' + cell.index + '" title="' +
        esc(t('quiz.questionOf', { a: num(cell.index), b: num(data.sheet.length) })) + '">' + num(cell.index) + '</button>';
    }).join('');

    var comparison = '';
    if (!data.comparison.prev) {
      comparison = '<p class="muted small">' + esc(t('result.noComparison')) + '</p>';
    } else {
      var delta = data.comparison.delta;
      var improvedRows = data.comparison.improved.slice(0, 6).map(function (x) {
        var idx = data.questions.map(function (q) { return q.id; }).indexOf(x.id);
        return '<li>' + icon('check') + '<span>' + esc(truncate(qText(data.questions[idx]), 90)) + '</span></li>';
      }).join('');
      var regressedRows = data.comparison.regressed.slice(0, 6).map(function (x) {
        var idx = data.questions.map(function (q) { return q.id; }).indexOf(x.id);
        return '<li>' + icon('cross') + '<span>' + esc(truncate(qText(data.questions[idx]), 90)) + '</span></li>';
      }).join('');

      comparison = '<div class="compare-head">' +
          '<span class="badge ' + (delta > 0 ? 'badge-ok' : (delta < 0 ? 'badge-bad' : 'badge-soft')) + '">' +
            (delta > 0 ? '+' : '') + num(delta) + ' ' + esc(t('result.percentDelta')) + '</span>' +
          '<span class="muted small">' + esc(t('result.prevAttempt', { date: dateText(data.comparison.prev.submittedAt, true), percent: num(data.comparison.prev.percent) })) + '</span>' +
        '</div>' +
        '<div class="compare-grid">' +
          '<div><h4 class="ok-title">' + esc(t('result.improved')) + ' (' + num(data.comparison.improved.length) + ')</h4>' +
            (improvedRows ? '<ul class="compare-list">' + improvedRows + '</ul>' : '<p class="muted small">' + esc(t('result.noImproved')) + '</p>') + '</div>' +
          '<div><h4 class="bad-title">' + esc(t('result.regressed')) + ' (' + num(data.comparison.regressed.length) + ')</h4>' +
            (regressedRows ? '<ul class="compare-list">' + regressedRows + '</ul>' : '<p class="muted small">' + esc(t('result.noRegressed')) + '</p>') + '</div>' +
        '</div>';
    }

    var review = data.questions.map(function (q, i) {
      var chosen = logic.chosenOf(attempt.answers, q.id);
      var status = logic.statusOf(q.correct, chosen);
      var opts = q.options.map(function (o, oi) {
        var cls = '';
        if (oi === q.correct) cls = ' is-correct';
        else if (oi === chosen) cls = ' is-wrong';
        return '<li class="review-opt' + cls + '">' +
          '<span class="option-letter">' + esc(optionLetter(oi)) + '</span>' +
          '<span class="option-text">' + esc(optText(o)) + (o.image ? '<img class="opt-img" src="' + esc(o.image) + '" alt="" />' : '') + '</span>' +
          (oi === q.correct ? '<span class="opt-mark ok">' + icon('check') + '</span>' : '') +
          (oi === chosen && oi !== q.correct ? '<span class="opt-mark bad">' + icon('cross') + '</span>' : '') +
        '</li>';
      }).join('');

      var cmpNote = '';
      if (data.comparison.prev) {
        var before = logic.statusOf(q.correct, logic.chosenOf(data.comparison.prev.answers, q.id));
        if (before !== status) {
          cmpNote = '<span class="badge ' + (status === 'correct' ? 'badge-ok' : 'badge-bad') + '">' +
            (status === 'correct' ? '↑ ' + t('result.improved') : '↓ ' + t('result.regressed')) + '</span>';
        }
      }

      return '<article class="review-q card" id="rq-' + (i + 1) + '">' +
        '<div class="review-head"><span class="q-num sm">' + num(i + 1) + '</span>' +
          '<span class="badge ' + (status === 'correct' ? 'badge-ok' : (status === 'wrong' ? 'badge-bad' : 'badge-soft')) + '">' +
            esc(status === 'correct' ? t('result.correct') : (status === 'wrong' ? t('result.wrong') : t('result.blank'))) + '</span>' +
          cmpNote + '</div>' +
        '<p class="review-text">' + esc(qText(q)) + '</p>' +
        (q.image ? '<img class="q-img" src="' + esc(q.image) + '" alt="" />' : '') +
        '<ul class="review-opts">' + opts + '</ul>' +
        '<p class="review-note">' + (chosen === null ? esc(t('result.noAnswer')) :
          esc(t('result.yourAnswer')) + ': ' + esc(optionLetter(chosen)) + ' · ' + esc(t('result.correctAnswer')) + ': ' + esc(optionLetter(q.correct))) + '</p>' +
      '</article>';
    }).join('');

    var incidentsCard = '';
    if (isAdmin) {
      incidentsCard = '<section class="card incidents-card"><div class="section-head"><h2>' + esc(t('result.incidents')) + '</h2>' +
          '<span class="muted small">' + esc(t('result.incidentHint')) + '</span></div>' +
        (data.incidents.length ? '<ul class="incident-list">' + data.incidents.map(function (inc) {
          return '<li><span class="badge badge-bad">' + esc(t('incident.' + inc.type)) + '</span>' +
            '<span class="muted small">' + esc(dateText(inc.at, true)) + '</span>' +
            (inc.image ? '<img class="incident-thumb" src="' + esc(inc.image) + '" alt="" />' : '') + '</li>';
        }).join('') + '</ul>' : '<p class="muted small">' + esc(t('result.noIncidents')) + '</p>') +
      '</section>';
    }

    return '<div class="report">' +
      '<section class="report-hero card ' + (data.percent >= 50 ? 'is-pass' : 'is-fail') + '">' +
        '<div class="score-ring" style="--p:' + data.percent + '"><div class="score-ring-in"><strong>' + num(data.percent) + '</strong><small>' + esc(t('result.of100')) + '</small></div></div>' +
        '<div class="report-hero-text">' +
          '<span class="badge ' + (data.percent >= 50 ? 'badge-ok' : 'badge-bad') + '">' + esc(data.percent >= 50 ? t('result.passed') : t('result.failed')) + '</span>' +
          (data.isPractice ? '<span class="badge badge-warn">' + esc(t('practice.badge')) + '</span>' : '') +
          '<h1>' + esc(examTitle(data.exam)) + '</h1>' +
          (data.isPractice ? '<p class="practice-note">' + esc(t('practice.note')) + '</p>' : '') +
          identity +
          '<div class="result-actions">' +
            '<a class="btn btn-ghost btn-sm" href="#/' + (isAdmin ? 'admin/reports' : 'dashboard') + '">' + esc(isAdmin ? t('reports.backReports') : t('result.backDash')) + '</a>' +
            (isAdmin ? '<button type="button" class="btn btn-ghost btn-sm" data-action="csv-exam" data-id="' + esc(data.exam.id) + '">' + icon('download') + esc(t('reports.csv')) + '</button>' : '') +
            (!isAdmin ? '<a class="btn btn-primary btn-sm" href="#/history">' + esc(t('result.toHistory')) + '</a>' : '') +
          '</div>' +
        '</div>' +
      '</section>' +
      '<section class="result-stats card">' + summary + '</section>' +
      '<p class="muted small taraz-hint">' + esc(t('result.tarazHint')) +
        (data.tarazInfo.estimated ? ' ' + esc(t('result.tarazEstimated')) : '') + '</p>' +
      '<section class="card report-subjects">' +
        '<div class="section-head"><h2>' + esc(t('result.subjectTable')) + '</h2>' +
          '<span class="muted small">' + esc(t('reports.participantsUnit', { n: num(data.participantsCount) })) + '</span></div>' +
        '<p class="muted small">' + esc(t('result.coefNote')) + '</p>' +
        '<div class="table-wrap"><table class="table"><thead><tr>' +
          '<th>' + esc(t('result.colSubject')) + '</th><th>' + esc(t('result.colCoefficient')) + '</th>' +
          '<th>' + esc(t('result.colQuestions')) + '</th>' +
          '<th>' + esc(t('result.colCorrect')) + '</th><th>' + esc(t('result.colWrong')) + '</th>' +
          '<th>' + esc(t('result.colBlank')) + '</th><th>' + esc(t('result.colPercent')) + '</th>' +
          '<th>' + esc(t('result.colBestPercent')) + '</th><th>' + esc(t('result.colTaraz')) + '</th>' +
          '<th>' + esc(t('result.colBestTaraz')) + '</th></tr></thead><tbody>' + subjectRows + '</tbody></table></div>' +
      '</section>' +
      '<div class="report-two">' +
        '<section class="card top-card"><h3>' + esc(t('result.topExam')) + '</h3><ul class="top-list">' + topExam + '</ul>' +
          '<h3 class="mt">' + esc(t('result.topClass')) + '</h3><ul class="top-list">' + topClass + '</ul></section>' +
        '<section class="card sheet-card"><h3>' + esc(t('result.answerSheet')) + '</h3>' +
          '<div class="sheet-grid">' + sheet + '</div>' +
          '<div class="palette-legend"><span><i class="dot dot-ok"></i>' + esc(t('result.correct')) + '</span>' +
            '<span><i class="dot dot-bad"></i>' + esc(t('result.wrong')) + '</span>' +
            '<span><i class="dot dot-empty"></i>' + esc(t('result.blank')) + '</span></div></section>' +
      '</div>' +
      '<section class="card compare-card"><h2>' + esc(t('result.comparison')) + '</h2>' + comparison + '</section>' +
      aiCard(data, isAdmin, aiKeyFor(data.attempt.id, user)) +
      incidentsCard +
      '<section class="section"><div class="section-head"><h2>' + esc(t('result.review')) + '</h2></div>' +
        '<div class="review-list">' + review + '</div></section>' +
    '</div>';
  }

  function truncate(str, len) {
    var s = String(str || '');
    return s.length > len ? s.slice(0, len) + '…' : s;
  }

  function formatAiText(text) {
    return String(text || '').split(/\r?\n/).map(function (line) {
      var s = line.trim();
      if (/^#{1,4}\s+/.test(s)) return '<div class="ai-h">' + esc(s.replace(/^#{1,4}\s+/, '')) + '</div>';
      if (/^[-*•]\s+/.test(s)) return '<div class="ai-li">' + esc(s.replace(/^[-*•]\s+/, '')) + '</div>';
      if (/^_+.*_+$/.test(s)) return '<div class="ai-note">' + esc(s.replace(/^_+|_+$/g, '')) + '</div>';
      if (!s) return '<div class="ai-gap"></div>';
      return '<div class="ai-p">' + esc(s) + '</div>';
    }).join('');
  }

  function aiCard(data, isAdmin, key) {
    /* ادمین برای دیدن کارنامه نیازی به تحلیل ندارد و گفت‌وگو هم نباید به دانش‌آموز برسد */
    if (isAdmin) return '';

    var active = state.ai.key === key;
    var text = active ? state.ai.text : '';
    var busy = active && state.ai.busy;
    var source = active ? state.ai.source : '';
    var error = active ? state.ai.error : '';
    var chat = active ? (state.ai.chat || []) : [];
    var chatBusy = active && state.ai.chatBusy;
    var configured = ai && ai.isConfigured(store.getSettings());

    var body;
    if (busy) {
      body = '<div class="ai-loading"><span class="spinner"></span>' + esc(t('ai.running')) + '</div>';
    } else if (text) {
      body = '<div class="ai-result-head">' + (source === 'local'
        ? '<span class="badge badge-soft">' + esc(t('ai.local')) + '</span>'
        : '<span class="badge badge-ok">' + esc(t('ai.result')) + '</span>') +
        (source === 'local' ? '<span class="muted small">' + esc(t('ai.localNote')) + '</span>' : '') +
        '</div><div class="ai-text">' + formatAiText(text) + '</div>';
    } else {
      var note = configured ? t('ai.hint') : (isAdmin ? t('ai.needConnect') : t('ai.hint'));
      var errHint = error ? aiHintForError(error) : '';
      body = '<p class="muted small">' + esc(note) + '</p>' +
        (error ? '<p class="form-error">' + esc(t('ai.error', { msg: error })) + '</p>' : '') +
        (errHint ? '<p class="ai-status is-err"><span class="ai-status-hint">' + esc(errHint) + '</span></p>' : '');
    }

    var buttons = '<div class="ai-actions">' +
      '<button type="button" class="btn btn-primary btn-sm" data-action="ai-run" data-id="' + esc(data.attempt.id) + '"' + (busy ? ' disabled' : '') + '>' +
        icon('spark') + '<span>' + esc(text ? t('ai.rerun') : t('ai.run')) + '</span></button>' +
      (isAdmin ? '<button type="button" class="btn btn-ghost btn-sm" data-action="ai-settings">' + icon('settings') + '<span>' + esc(t('ai.connect')) + '</span></button>' : '') +
    '</div>';

    var chatHtml = '';
    if (configured && (text || chat.length)) {
      chatHtml = '<p class="ai-scope">' + icon('shield') + esc(t('ai.scope')) + '</p>' +
        '<div class="ai-chat" id="ai-chat">' +
        chat.map(function (m) {
          return '<div class="ai-bubble is-' + (m.role === 'user' ? 'user' : 'ai') + (m.error ? ' is-error' : '') + (m.blocked ? ' is-blocked' : '') + '">' +
            (m.role === 'assistant' ? formatAiText(m.text) : esc(m.text)) +
          '</div>';
        }).join('') +
        (chatBusy ? '<div class="ai-bubble is-ai is-typing"><span class="spinner"></span>' + esc(t('ai.typing')) + '</div>' : '') +
      '</div>' +
      '<div class="ai-compose">' +
        '<input id="ai-input" type="text" autocomplete="off" placeholder="' + esc(t('ai.chatPlaceholder')) + '" />' +
        '<button type="button" class="btn btn-primary btn-sm" data-action="ai-send" title="' + esc(t('ai.send')) + '">' + esc(t('ai.send')) + '</button>' +
      '</div>' +
      '<p class="muted small">' + esc(t('ai.chatHint')) + '</p>';
    } else if (configured) {
      chatHtml = '<p class="muted small">' + esc(t('ai.chatAfter')) + '</p>';
    } else if (!isAdmin) {
      chatHtml = '<p class="muted small">' + esc(t('ai.chatLocked')) + '</p>';
    }

    return '<section class="card ai-card">' +
      '<div class="section-head"><h2>' + icon('spark') + ' ' + esc(t('ai.title')) + '</h2>' +
        '<span class="muted small">' + esc(t('ai.memory')) + '</span></div>' +
      body + chatHtml + buttons +
    '</section>';
  }

  /* ---------------- کارنامه‌های دانش‌آموز ---------------- */

  function viewStudentHistory(user) {
    var attempts = store.doneAttemptsOfUser(user.id);
    if (!attempts.length) return '<section class="section"><div class="section-head"><h2>' + esc(t('nav.history')) + '</h2></div>' +
      '<div class="empty card">' + esc(t('dash.noRecent')) + '</div></section>';

    var rows = attempts.map(function (a) {
      var exam = store.getExam(a.examId);
      return '<tr>' +
        '<td data-label="' + esc(t('reports.student')) + '">' + esc(examTitle(exam)) +
          (a.practice ? ' <span class="badge badge-warn">' + esc(t('practice.badge')) + '</span>' : '') + '</td>' +
        '<td data-label="' + esc(t('reports.date')) + '">' + esc(dateText(a.submittedAt, true)) + '</td>' +
        '<td data-label="' + esc(t('reports.percent')) + '"><span class="score-pill ' + toneOf(a.percent) + '">' + num(a.percent) + '%</span></td>' +
        '<td data-label="' + esc(t('reports.taraz')) + '">' + num(tarazOfAttempt(a, exam)) + '</td>' +
        '<td data-label="' + esc(t('result.rank')) + '">' + num(rankOfAttempt(a, exam)) + '</td>' +
        '<td class="cell-action"><a class="btn btn-ghost btn-sm" href="#/result/' + esc(a.id) + '">' + esc(t('reports.open')) + '</a></td>' +
      '</tr>';
    }).join('');

    return '<section class="section"><div class="section-head"><div><h2>' + esc(t('nav.history')) + '</h2>' +
      '<p class="muted small">' + esc(t('reports.participantsUnit', { n: num(attempts.length) })) + '</p></div></div>' +
      '<div class="table-wrap card"><table class="table"><thead><tr>' +
        '<th>' + esc(t('reports.student')) + '</th><th>' + esc(t('reports.date')) + '</th>' +
        '<th>' + esc(t('reports.percent')) + '</th><th>' + esc(t('reports.taraz')) + '</th>' +
        '<th>' + esc(t('result.rank')) + '</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div></section>';
  }

  function rankOfAttempt(attempt, exam) {
    if (!exam) return '—';
    var rows = report.participants(exam.id);
    var mine = rows.filter(function (r) { return r.attempt.id === attempt.id; })[0];
    return mine ? mine.rank : '—';
  }

  /* ---------------- داشبورد مدیر ---------------- */

  function viewAdminDashboard() {
    var students = store.listStudents();
    var classes = store.listClasses();
    var exams = store.listExams();
    var attempts = store.listAttempts({ status: 'done' });
    var recent = attempts.slice(0, 6);

    var summaryRows = exams.slice(0, 6).map(function (exam) {
      var sum = report.examSummary(exam);
      var cls = store.getClass(exam.classId);
      return '<tr>' +
        '<td data-label="' + esc(t('exam.title')) + '"><strong>' + esc(examTitle(exam)) + '</strong>' +
          '<small class="cell-sub">' + esc(clsName(cls)) + '</small></td>' +
        '<td data-label="' + esc(t('reports.participants')) + '">' + num(sum.n) + '</td>' +
        '<td data-label="' + esc(t('reports.avg')) + '">' + (sum.n ? num(sum.avgPercent) + '%' : '—') + '</td>' +
        '<td data-label="' + esc(t('reports.taraz')) + '">' + (sum.n ? num(sum.avgTaraz) : '—') + '</td>' +
        '<td class="cell-action"><a class="btn btn-ghost btn-sm" href="#/admin/reports/' + esc(exam.id) + '">' + esc(t('reports.open')) + '</a></td>' +
      '</tr>';
    }).join('');

    var recentHtml = recent.length ? recent.map(function (a) {
      var exam = store.getExam(a.examId);
      var student = store.getStudent(a.userId);
      return '<a class="result-row" href="#/result/' + esc(a.id) + '">' +
        '<span class="result-row-main"><strong>' + esc(student ? student.name : '—') + '</strong>' +
          '<small>' + esc(examTitle(exam)) + ' · ' + esc(dateText(a.submittedAt, true)) + '</small></span>' +
        '<span class="score-pill ' + toneOf(a.percent) + '">' + num(a.percent) + '%</span></a>';
    }).join('') : '<div class="empty">' + esc(t('admin.noSubs')) + '</div>';

    return '<section class="hero card"><div class="hero-text"><h1>' + esc(t('admin.dashTitle')) + '</h1>' +
        '<p>' + esc(t('admin.dashSub')) + '</p></div>' +
        '<div class="hero-side"><a class="btn btn-primary btn-sm" href="#/admin/exams">' + icon('plus') + esc(t('admin.newExam')) + '</a></div></section>' +
      '<section class="stats">' +
        statCard('users', num(students.length), t('admin.statStudents')) +
        statCard('grid', num(classes.length), t('admin.statClasses')) +
        statCard('list', num(exams.length), t('admin.statExams')) +
        statCard('check', num(attempts.length), t('admin.statAttempts')) +
      '</section>' +
      '<section class="section"><div class="section-head"><div><h2>' + esc(t('admin.examSummary')) + '</h2></div>' +
        '<a class="link" href="#/admin/reports">' + esc(t('nav.reports')) + '</a></div>' +
        (exams.length ? '<div class="table-wrap card"><table class="table"><thead><tr>' +
          '<th>' + esc(t('exam.title')) + '</th><th>' + esc(t('reports.participants')) + '</th>' +
          '<th>' + esc(t('reports.avg')) + '</th><th>' + esc(t('reports.taraz')) + '</th><th></th>' +
          '</tr></thead><tbody>' + summaryRows + '</tbody></table></div>' : '<div class="empty card">' + esc(t('admin.noExams')) + '</div>') +
      '</section>' +
      '<section class="section"><div class="section-head"><div><h2>' + esc(t('admin.recentSubs')) + '</h2></div></div>' +
        '<div class="result-list card">' + recentHtml + '</div></section>';
  }

  /* ---------------- پنل: سوال‌ها ---------------- */

  function viewAdmin(route, user) {
    if (route.parts[0] === 'reports') {
      if (route.parts[1] === 'class') return viewClassReport(route.parts[2]);
      if (route.parts[1]) return viewExamReport(route.parts[1]);
      return viewAdminReports();
    }
    var tab = route.parts[0] || 'questions';
    if (['questions', 'exams', 'classes', 'students', 'admins', 'inquiries'].indexOf(tab) === -1) tab = 'questions';
    var body;
    if (tab === 'questions') body = viewAdminQuestions();
    else if (tab === 'exams') body = viewAdminExams();
    else if (tab === 'classes') body = viewAdminClasses();
    else if (tab === 'students') body = viewAdminStudents();
    else if (tab === 'inquiries') body = viewAdminInquiries();
    else body = viewAdminAdmins();

    return '<section class="admin-head"><div><h1>' + esc(t('admin.dashTitle')) + '</h1>' +
        '<p class="muted small">' + esc(t('admin.dashSub')) + '</p></div></section>' + body;
  }

  function viewAdminQuestions() {
    if (state.editingQuestion) {
      var q = state.editingQuestion === 'new' ? null : store.getQuestion(state.editingQuestion);
      return questionFormCard(q, 'bank');
    }
    var filter = state.bankFilter;
    var questions = store.listQuestions({ subject: filter.subject, search: filter.search });
    var subjects = {};
    store.listQuestions().forEach(function (q) { if (q.subject) subjects[q.subject] = true; });

    var list = questions.length ? questions.map(function (q) {
      var usage = store.listExams().filter(function (e) { return e.questionIds.indexOf(q.id) !== -1; }).length;
      var opts = q.options.map(function (o, i) {
        return '<li class="' + (i === q.correct ? 'is-correct' : '') + '">' +
          '<span class="option-letter">' + esc(optionLetter(i)) + '</span><span>' + esc(optText(o)) + '</span>' +
          (o.image ? '<img class="opt-thumb" src="' + esc(o.image) + '" alt="" />' : '') +
          (i === q.correct ? '<span class="opt-mark ok">' + icon('check') + '</span>' : '') + '</li>';
      }).join('');

      return '<article class="q-row card">' +
        '<div class="q-row-head">' +
          badge(subjectOf(q), 'soft') + badge(difficultyLabel(q.difficulty), difficultyTone(q.difficulty)) +
          '<span class="badge badge-soft">' + esc(t('qbank.usage', { n: num(usage) })) + '</span>' +
          '<span class="spacer"></span>' +
          '<button type="button" class="icon-btn sm" data-action="question-edit" data-id="' + esc(q.id) + '">' + icon('edit') + '</button>' +
          '<button type="button" class="icon-btn sm danger" data-action="question-delete" data-id="' + esc(q.id) + '">' + icon('trash') + '</button>' +
        '</div>' +
        '<p class="q-row-text">' + esc(qText(q)) + '</p>' +
        (q.image ? '<img class="q-thumb" src="' + esc(q.image) + '" alt="" />' : '') +
        '<ul class="q-row-opts">' + opts + '</ul>' +
      '</article>';
    }).join('') : '<div class="empty card">' + esc(t('qbank.noQuestions')) + '</div>';

    return '<section class="toolbar">' +
        '<div class="toolbar-left">' +
          '<label class="inline-field"><span>' + esc(t('qbank.filterSubject')) + '</span>' +
            '<select data-action="bank-filter-subject"><option value="">' + esc(t('common.all')) + '</option>' +
            Object.keys(subjects).map(function (s) {
              return '<option value="' + esc(s) + '"' + (filter.subject === s ? ' selected' : '') + '>' + esc(s) + '</option>';
            }).join('') + '</select></label>' +
          '<label class="search-field">' + icon('search') +
            '<input type="search" data-action="bank-search" value="' + esc(filter.search) + '" placeholder="' + esc(t('qbank.searchPlaceholder')) + '" />' +
          '</label>' +
        '</div>' +
        '<button type="button" class="btn btn-primary btn-sm" data-action="question-new">' + icon('plus') + '<span>' + esc(t('qbank.new')) + '</span></button>' +
      '</section>' +
      '<div class="q-list">' + list + '</div>';
  }

  function questionFormCard(q, mode) {
    var draft = (state.editorDraft && state.editorDraft.bank) || (q ? draftFromQuestion(q) : blankDraft(4));
    var isEdit = !!q;
    return '<form id="question-form" class="card form-card" data-editor-form="bank">' +
      '<div class="form-card-head"><h2>' + esc(isEdit ? t('qbank.edit') : t('qbank.new')) + '</h2>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-action="question-cancel">' + esc(t('common.cancel')) + '</button></div>' +
      questionEditorHtml(draft, 'bank') +
      '<p class="form-error" id="form-error" hidden></p>' +
      '<div class="form-actions">' +
        '<button class="btn btn-primary" type="submit">' + esc(t('common.save')) + '</button>' +
        '<button type="button" class="btn btn-ghost" data-action="question-cancel">' + esc(t('common.cancel')) + '</button>' +
      '</div>' +
    '</form>';
  }

  function questionEditorHtml(draft, prefix) {
    var subjects = {};
    store.listQuestions().forEach(function (q) { if (q.subject) subjects[q.subject] = true; });
    var subjectListId = 'subjects-' + prefix;

    var optionRows = draft.options.map(function (o, i) {
      return optionRowHtml(o, i, prefix, draft.correct);
    }).join('');

    return '<div class="q-editor" data-editor="' + prefix + '">' +
      '<div class="grid-2">' +
        '<div class="field"><label>' + esc(t('qbank.text')) + '</label>' +
          '<textarea data-f="text" rows="3">' + esc(draft.text) + '</textarea></div>' +
        '<div class="field"><label>' + esc(t('qbank.textEn')) + ' <span class="hint">(' + esc(t('common.optional')) + ')</span></label>' +
          '<textarea data-f="textEn" rows="3" dir="ltr">' + esc(draft.textEn) + '</textarea></div>' +
      '</div>' +
      '<div class="grid-3">' +
        '<div class="field"><label>' + esc(t('common.subject')) + '</label>' +
          '<input data-f="subject" list="' + subjectListId + '" value="' + esc(draft.subject) + '" placeholder="' + esc(t('common.subject')) + '" />' +
          '<datalist id="' + subjectListId + '">' + Object.keys(subjects).map(function (s) { return '<option value="' + esc(s) + '"></option>'; }).join('') + '</datalist></div>' +
        '<div class="field"><label>' + esc(t('common.difficulty')) + '</label>' +
          '<select data-f="difficulty">' +
            ['easy', 'medium', 'hard'].map(function (d) {
              return '<option value="' + d + '"' + (draft.difficulty === d ? ' selected' : '') + '>' + esc(difficultyLabel(d)) + '</option>';
            }).join('') +
          '</select></div>' +
        '<div class="field"><label>' + esc(t('qbank.optionCount')) + '</label>' +
          '<select data-action="option-count" data-prefix="' + prefix + '">' +
            [2, 3, 4, 5, 6].map(function (n) {
              return '<option value="' + n + '"' + (draft.options.length === n ? ' selected' : '') + '>' + num(n) + '</option>';
            }).join('') +
          '</select></div>' +
      '</div>' +
      '<div class="field"><label>' + esc(t('qbank.image')) + ' <span class="hint">(' + esc(t('common.optional')) + ')</span></label>' +
        imageFieldHtml('question', draft.image, prefix) + '</div>' +
      '<fieldset class="options-field"><legend>' + esc(t('qbank.options')) + ' <span class="hint">' + esc(t('qbank.correct')) + '</span></legend>' +
        '<div class="opt-editor" data-options="' + prefix + '">' + optionRows + '</div>' +
        '<p class="form-hint muted small">' + esc(t('qbank.imageHint')) + '</p>' +
      '</fieldset>' +
    '</div>';
  }

  function optionRowHtml(o, i, prefix, correct) {
    return '<div class="opt-row" data-option-index="' + i + '">' +
      '<label class="opt-correct" title="' + esc(t('qbank.correct')) + '">' +
        '<input type="radio" name="' + prefix + '-correct" value="' + i + '"' + (Number(correct) === i ? ' checked' : '') + ' />' +
        '<span class="radio-dot"></span></label>' +
      '<input data-opt="text" value="' + esc(o.text) + '" placeholder="' + esc(t('qbank.optionN', { n: num(i + 1) })) + '" />' +
      '<input data-opt="textEn" dir="ltr" value="' + esc(o.textEn) + '" placeholder="Option ' + (i + 1) + '" />' +
      imageFieldHtml('option-' + i, o.image, prefix, true) +
    '</div>';
  }

  function imageFieldHtml(target, value, prefix, compact) {
    var has = !!value;
    return '<div class="img-field' + (compact ? ' compact' : '') + '">' +
      '<img class="img-preview" data-img-preview="' + esc(target) + '" src="' + esc(value) + '" alt=""' + (has ? '' : ' hidden') + ' />' +
      '<input type="hidden" data-img="' + esc(target) + '" value="' + esc(value) + '" />' +
      '<label class="btn btn-ghost btn-sm img-pick" title="' + esc(t('qbank.addImage')) + '">' + icon('image') +
        (compact ? '' : '<span>' + esc(t('qbank.addImage')) + '</span>') +
        '<input type="file" accept="image/*" data-img-file="' + esc(target) + '" hidden /></label>' +
      (has ? '<button type="button" class="icon-btn sm" data-action="clear-image" data-target="' + esc(target) + '">' + icon('cross') + '</button>' : '') +
    '</div>';
  }

  function readEditor(prefix) {
    var root = document.querySelector('[data-editor="' + prefix + '"]');
    if (!root) return null;
    function val(name) {
      var el = root.querySelector('[data-f="' + name + '"]');
      return el ? el.value : '';
    }
    function hidden(name) {
      var el = root.querySelector('[data-img="' + name + '"]');
      return el ? el.value : '';
    }
    var draft = {
      text: val('text'),
      textEn: val('textEn'),
      subject: val('subject'),
      difficulty: val('difficulty') || 'medium',
      image: hidden('question'),
      options: []
    };
    var rows = root.querySelectorAll('[data-option-index]');
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var tEl = row.querySelector('[data-opt="text"]');
      var eEl = row.querySelector('[data-opt="textEn"]');
      var iEl = row.querySelector('[data-img="option-' + i + '"]');
      draft.options.push({
        text: tEl ? tEl.value : '',
        textEn: eEl ? eEl.value : '',
        image: iEl ? iEl.value : ''
      });
    }
    var checked = root.querySelector('input[type="radio"]:checked');
    draft.correct = checked ? Number(checked.value) : 0;
    return draft;
  }

  function validateDraft(draft) {
    if (!draft) return { ok: false, error: t('qbank.errText') };
    if (!String(draft.text || '').trim()) return { ok: false, error: t('qbank.errText') };
    for (var i = 0; i < draft.options.length; i++) {
      var o = draft.options[i];
      if (!String(o.text || '').trim() && !o.image) return { ok: false, error: t('qbank.errOptions') };
    }
    if (draft.correct === null || draft.correct === undefined || draft.correct >= draft.options.length) {
      return { ok: false, error: t('qbank.errCorrect') };
    }
    return { ok: true };
  }

  /* ---------------- پنل: آزمون‌ها ---------------- */

  function viewAdminExams() {
    if (state.editingExam) return examFormCard(state.editingExam === 'new' ? null : store.getExam(state.editingExam));
    var exams = store.listExams();
    var list = exams.length ? exams.map(function (exam) {
      var sum = report.examSummary(exam);
      var cls = store.getClass(exam.classId);
      var qCount = store.examQuestions(exam).length;
      return '<article class="exam-card card">' +
        '<div class="exam-card-top"><span class="badge badge-soft">' + esc(clsName(cls)) + '</span>' +
          (exam.published ? badge(t('exam.published'), 'ok') : badge(t('exam.draft'), 'warn')) + '</div>' +
        '<h3>' + esc(examTitle(exam)) + '</h3>' +
        '<p class="exam-meta"><span>' + icon('book') + esc(t('exam.questionsCount', { n: num(qCount) })) + '</span>' +
          '<span>' + icon('clock') + num(exam.durationMin) + ' ' + t('common.min') + '</span></p>' +
        '<p class="exam-schedule">' + icon('clock') + esc(scheduleText(exam)) + '</p>' +
        (sum.n ? '<p class="muted small">' + num(sum.n) + ' ' + esc(t('admin.participants')) + ' · ' + esc(t('reports.avg')) + ': ' + num(sum.avgPercent) + '% · ' + esc(t('reports.taraz')) + ': ' + num(sum.avgTaraz) + '</p>' : '') +
        '<div class="exam-card-foot"><div class="exam-actions">' +
          '<button type="button" class="btn btn-ghost btn-sm" data-action="exam-edit" data-id="' + esc(exam.id) + '">' + icon('edit') + '<span>' + esc(t('common.edit')) + '</span></button>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-action="exam-publish" data-id="' + esc(exam.id) + '">' + esc(exam.published ? t('exam.draft') : t('exam.published')) + '</button>' +
          '<a class="btn btn-ghost btn-sm" href="#/admin/reports/' + esc(exam.id) + '">' + icon('chart') + '<span>' + esc(t('admin.openReport')) + '</span></a>' +
          '<button type="button" class="btn btn-ghost btn-sm danger" data-action="exam-delete" data-id="' + esc(exam.id) + '">' + icon('trash') + '</button>' +
        '</div></div>' +
      '</article>';
    }).join('') : '<div class="empty card">' + esc(t('admin.noExams')) + '</div>';

    return '<section class="toolbar"><div class="toolbar-left">' +
        '<span class="muted small">' + esc(t('exam.scheduleHint')) + '</span></div>' +
        '<button type="button" class="btn btn-primary btn-sm" data-action="exam-new">' + icon('plus') + '<span>' + esc(t('exam.new')) + '</span></button></section>' +
      '<div class="exam-grid">' + list + '</div>';
  }

  function examFormCard(exam) {
    var draft = state.examDraft;
    if (!draft) {
      draft = state.examDraft = exam ? {
        id: exam.id,
        title: exam.title,
        titleEn: exam.titleEn || '',
        classId: exam.classId,
        durationMin: exam.durationMin,
        startAt: exam.startAt || '',
        endAt: exam.endAt || '',
        published: exam.published,
        questionIds: exam.questionIds.slice(),
        pending: (exam.pendingQuestions || []).slice()
      } : {
        id: null, title: '', titleEn: '', classId: (store.listClasses()[1] || store.listClasses()[0]).id,
        durationMin: 10, startAt: '', endAt: '', published: false,
        questionIds: [], pending: []
      };
    }
    if (!state.editorDraft) state.editorDraft = {};
    if (!state.editorDraft.exam) state.editorDraft.exam = blankDraft(4);

    var classOptions = store.listClasses().map(function (c) {
      return '<option value="' + esc(c.id) + '"' + (draft.classId === c.id ? ' selected' : '') + '>' + esc(clsName(c)) + '</option>';
    }).join('');

    var bank = store.listQuestions({ subject: draft.bankSubject || '', search: draft.bankSearch || '' });
    var bankList = bank.length ? bank.map(function (q) {
      var checked = draft.questionIds.indexOf(q.id) !== -1;
      return '<label class="pick-row' + (checked ? ' is-checked' : '') + '">' +
        '<input type="checkbox" data-action="pick-question" data-id="' + esc(q.id) + '"' + (checked ? ' checked' : '') + ' />' +
        '<span class="pick-text">' + esc(truncate(qText(q), 110)) + '</span>' +
        badge(subjectOf(q), 'soft') + '</label>';
    }).join('') : '<p class="muted small">' + esc(t('exam.bankEmpty')) + '</p>';

    var selectedIds = draft.questionIds.concat(draft.pending.map(function (_, i) { return 'pending-' + i; }));
    var selectedList = selectedIds.length ? selectedIds.map(function (id, idx) {
      if (String(id).indexOf('pending-') === 0) {
        var pi = Number(String(id).split('-')[1]);
        var pq = draft.pending[pi];
        return '<li><span class="pick-index">' + num(idx + 1) + '</span>' +
          '<span class="pick-text">' + esc(truncate(pq.text, 90)) + '</span>' +
          badge(t('exam.pendingBadge'), 'warn') +
          '<button type="button" class="icon-btn sm" data-action="edit-pending" data-index="' + pi + '" title="' + esc(t('qbank.edit')) + '">' + icon('edit') + '</button>' +
          '<button type="button" class="icon-btn sm" data-action="remove-pending" data-index="' + pi + '" title="' + esc(t('common.delete')) + '">' + icon('cross') + '</button></li>';
      }
      var q = store.getQuestion(id);
      if (!q) return '';
      return '<li><span class="pick-index">' + num(idx + 1) + '</span>' +
        '<span class="pick-text">' + esc(truncate(qText(q), 90)) + '</span>' +
        badge(subjectOf(q), 'soft') +
        '<button type="button" class="icon-btn sm" data-action="remove-selected" data-id="' + esc(id) + '">' + icon('cross') + '</button></li>';
    }).join('') : '<li class="muted small">' + esc(t('exam.noSelected')) + '</li>';

    return '<form id="exam-form" class="card form-card" data-editor-form="exam">' +
      '<div class="form-card-head"><h2>' + esc(draft.id ? t('exam.edit') : t('exam.new')) + '</h2>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-action="exam-cancel">' + esc(t('common.cancel')) + '</button></div>' +
      '<div class="grid-2">' +
        '<div class="field"><label>' + esc(t('exam.name')) + '</label><input data-f="title" value="' + esc(draft.title) + '" /></div>' +
        '<div class="field"><label>' + esc(t('exam.nameEn')) + ' <span class="hint">(' + esc(t('common.optional')) + ')</span></label>' +
          '<input data-f="titleEn" dir="ltr" value="' + esc(draft.titleEn) + '" /></div>' +
      '</div>' +
      '<div class="grid-4">' +
        '<div class="field"><label>' + esc(t('exam.class')) + '</label><select data-f="classId">' + classOptions + '</select></div>' +
        '<div class="field"><label>' + esc(t('exam.duration')) + '</label><input data-f="durationMin" type="number" min="1" max="180" value="' + esc(draft.durationMin) + '" /></div>' +
        '<div class="field"><label>' + esc(t('exam.startAt')) + '</label>' + dateFieldHtml('startAt', draft.startAt) + '</div>' +
        '<div class="field"><label>' + esc(t('exam.endAt')) + '</label>' + dateFieldHtml('endAt', draft.endAt) + '</div>' +
      '</div>' +
      '<label class="check-label"><input type="checkbox" data-f="published"' + (draft.published ? ' checked' : '') + ' /><span>' + esc(t('exam.publish')) + '</span></label>' +
      '<p class="form-hint muted small">' + esc(t('exam.scheduleHint')) + '</p>' +
      '<fieldset class="picker"><legend>' + esc(t('exam.selected')) + ' <span class="badge badge-soft">' + num(draft.questionIds.length + draft.pending.length) + '</span></legend>' +
        '<ul class="selected-list">' + selectedList + '</ul></fieldset>' +
      '<div class="exam-modes">' +
        '<button type="button" class="btn btn-sm ' + (state.examMode === 'bank' ? 'btn-primary' : 'btn-ghost') + '" data-action="exam-mode" data-mode="bank">' + esc(t('exam.pickFromBank')) + '</button>' +
        '<button type="button" class="btn btn-sm ' + (state.examMode === 'new' ? 'btn-primary' : 'btn-ghost') + '" data-action="exam-mode" data-mode="new">' + esc(t('exam.buildNew')) + '</button>' +
      '</div>' +
      (state.examMode === 'bank'
        ? '<div class="bank-picker"><div class="bank-toolbar">' +
            '<label class="search-field">' + icon('search') + '<input type="search" data-action="exam-bank-search" value="' + esc(draft.bankSearch || '') + '" placeholder="' + esc(t('exam.searchBank')) + '" /></label></div>' +
            '<div class="picker-list">' + bankList + '</div></div>'
        : '<div class="new-question-box">' +
          (state.pendingEditIndex !== null && state.pendingEditIndex !== undefined
            ? '<div class="edit-banner">' + icon('edit') + '<span>' + esc(t('exam.editingPending')) + '</span>' +
                '<button type="button" class="btn btn-ghost btn-sm" data-action="cancel-pending-edit">' + esc(t('common.cancel')) + '</button></div>'
            : '') +
          questionEditorHtml(state.editorDraft.exam, 'exam') +
          '<div class="form-actions"><button type="button" class="btn btn-ghost btn-sm" data-action="add-pending">' + icon('plus') +
            esc(state.pendingEditIndex !== null && state.pendingEditIndex !== undefined ? t('common.save') : t('exam.addPending')) + '</button></div>' +
        '</div>') +
      '<p class="form-error" id="form-error" hidden></p>' +
      '<div class="form-actions">' +
        '<button class="btn btn-primary" type="submit">' + esc(t('common.save')) + '</button>' +
        '<button type="button" class="btn btn-ghost" data-action="exam-cancel">' + esc(t('common.cancel')) + '</button>' +
      '</div>' +
    '</form>';
  }

  function toLocalInput(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }


  function syncExamDraft() {
    var form = document.getElementById('exam-form');
    if (!form || !state.examDraft) return;
    var get = function (f) { return form.querySelector('[data-f="' + f + '"]'); };
    state.examDraft.title = get('title').value;
    state.examDraft.titleEn = get('titleEn').value;
    state.examDraft.classId = get('classId').value;
    state.examDraft.durationMin = Number(get('durationMin').value) || 10;
    state.examDraft.startAt = get('startAt').value;
    state.examDraft.endAt = get('endAt').value;
    state.examDraft.published = get('published').checked;
    var draft = readEditor('exam');
    if (draft) state.editorDraft.exam = draft;
  }

  /* ---------------- پنل: کلاس‌ها ---------------- */

  function viewAdminClasses() {
    if (state.editingClass) return classFormCard(state.editingClass === 'new' ? null : store.getClass(state.editingClass));
    var classes = store.listClasses();
    var list = classes.map(function (c) {
      var stats = store.classStats(c.id);
      var expanded = state.expandedClass === c.id;
      var students = expanded ? store.studentsOfClass(c.id) : [];
      var studentsHtml = expanded
        ? '<div class="class-students">' +
            (students.length ? students.map(function (s) {
              var attempts = store.doneAttemptsOfUser(s.id);
              var avg = attempts.length ? Math.round(attempts.reduce(function (a, x) { return a + x.percent; }, 0) / attempts.length) : 0;
              return '<a class="class-student" href="#/student/' + esc(s.id) + '">' +
                '<span class="avatar sm">' + esc((s.name || '?').charAt(0)) + '</span>' +
                '<span class="class-student-main"><strong>' + esc(s.name) + '</strong><small><bdi>' + esc(s.username) + '</bdi></small></span>' +
                '<span class="muted small">' + num(attempts.length) + ' ' + esc(t('student.attempts')) + ' · ' + (attempts.length ? num(avg) + '%' : '—') + '</span>' +
              '</a>';
            }).join('') : '<p class="muted small">' + esc(t('class.noStudents')) + '</p>') +
          '</div>' : '';

      return '<article class="class-row card' + (expanded ? ' is-open' : '') + '">' +
        '<div class="class-row-main">' +
          '<h3>' + esc(clsName(c)) + '</h3>' +
          '<p class="muted small">' + esc(t('class.stats', { s: num(stats.students), e: num(stats.exams), a: num(stats.attempts) })) + '</p>' +
        '</div>' +
        '<div class="class-row-actions">' +
          '<button type="button" class="btn btn-ghost btn-sm" data-action="toggle-class" data-id="' + esc(c.id) + '">' +
            (expanded ? esc(t('class.hideStudents')) : esc(t('class.showStudents'))) + '</button>' +
          '<a class="btn btn-ghost btn-sm" href="#/admin/reports/class/' + esc(c.id) + '">' + icon('chart') + '<span>' + esc(t('class.viewReport')) + '</span></a>' +
          (c.id !== store.OTHER_CLASS_ID
            ? '<button type="button" class="icon-btn sm" data-action="class-edit" data-id="' + esc(c.id) + '">' + icon('edit') + '</button>' +
              '<button type="button" class="icon-btn sm danger" data-action="class-delete" data-id="' + esc(c.id) + '">' + icon('trash') + '</button>'
            : '') +
        '</div>' + studentsHtml +
      '</article>';
    }).join('');

    return '<section class="toolbar"><div class="toolbar-left"><span class="muted small">' + esc(t('admin.statClasses')) + ' · ' + num(classes.length) + '</span></div>' +
        '<button type="button" class="btn btn-primary btn-sm" data-action="class-new">' + icon('plus') + '<span>' + esc(t('class.new')) + '</span></button></section>' +
      '<div class="class-list">' + list + '</div>';
  }

  function classFormCard(cls) {
    var isEdit = !!cls;
    var grade = cls ? cls.grade : 10;
    var major = cls ? cls.major : 'math';
    var names = store.classNames(grade, major);
    var gradeOptions = store.GRADES.map(function (g) {
      return '<option value="' + g.n + '"' + (Number(grade) === g.n ? ' selected' : '') + '>پایه ' + esc(g.fa) + '</option>';
    }).join('');
    var majorOptions = store.MAJORS.map(function (m) {
      return '<option value="' + m.key + '"' + (major === m.key ? ' selected' : '') + '>' + esc(m.fa) + '</option>';
    }).join('');

    return '<form id="class-form" class="card form-card">' +
      '<div class="form-card-head"><h2>' + esc(isEdit ? t('class.edit') : t('class.new')) + '</h2>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-action="class-cancel">' + esc(t('common.cancel')) + '</button></div>' +
      '<div class="grid-3">' +
        '<div class="field"><label>' + esc(t('class.grade')) + '</label><select data-f="grade" data-action="class-grade">' + gradeOptions + '</select></div>' +
        '<div class="field"><label>' + esc(t('class.major')) + '</label><select data-f="major" data-action="class-major"' + (Number(grade) >= 10 ? '' : ' disabled') + '>' + majorOptions + '</select></div>' +
        '<div class="field"><label>' + esc(t('class.preview', { name: '' })) + '</label>' +
          '<div class="preview-name" data-preview="class-name">' + esc(clsName({ name: names.name, nameEn: names.nameEn })) + '</div></div>' +
      '</div>' +
      '<p class="form-hint muted small">' + esc(t('class.firstCycleHint')) + '</p>' +
      '<p class="form-error" id="form-error" hidden></p>' +
      '<div class="form-actions"><button class="btn btn-primary" type="submit">' + esc(t('common.save')) + '</button>' +
        '<button type="button" class="btn btn-ghost" data-action="class-cancel">' + esc(t('common.cancel')) + '</button></div>' +
    '</form>';
  }

  /* ---------------- پنل: دانش‌آموزان ---------------- */

  function viewAdminStudents() {
    if (state.editingStudent) return studentFormCard(state.editingStudent === 'new' ? null : store.getStudent(state.editingStudent));
    var filter = state.studentFilter;
    var students = store.listStudents(filter.classId ? { classId: filter.classId } : null);
    if (filter.search) {
      var needle = filter.search.toLowerCase();
      students = students.filter(function (s) {
        return s.name.toLowerCase().indexOf(needle) !== -1 || s.username.toLowerCase().indexOf(needle) !== -1;
      });
    }
    var classOptions = '<option value="">' + esc(t('common.all')) + '</option>' + store.listClasses().map(function (c) {
      return '<option value="' + esc(c.id) + '"' + (filter.classId === c.id ? ' selected' : '') + '>' + esc(clsName(c)) + '</option>';
    }).join('');

    var rows = students.length ? students.map(function (s) {
      var attempts = store.doneAttemptsOfUser(s.id).filter(function (a) { return !a.practice; });
      var avg = attempts.length ? Math.round(attempts.reduce(function (a, x) { return a + x.percent; }, 0) / attempts.length) : 0;
      var last = attempts[0];
      return '<tr>' +
        '<td data-label="' + esc(t('student.name')) + '"><a href="#/student/' + esc(s.id) + '"><strong>' + esc(s.name) + '</strong></a></td>' +
        '<td data-label="' + esc(t('student.username')) + '"><bdi>' + esc(s.username) + '</bdi></td>' +
        '<td data-label="' + esc(t('student.class')) + '">' + esc(clsName(store.getClass(s.classId || store.OTHER_CLASS_ID))) + '</td>' +
        '<td data-label="' + esc(t('student.attempts')) + '">' + num(attempts.length) + '</td>' +
        '<td data-label="' + esc(t('student.avg')) + '">' + (attempts.length ? num(avg) + '%' : '—') + '</td>' +
        '<td data-label="' + esc(t('student.last')) + '">' + (last ? esc(dateText(last.submittedAt, true)) : '—') + '</td>' +
        '<td class="cell-action">' +
          '<a class="icon-btn sm" href="#/student/' + esc(s.id) + '" title="' + esc(t('student.detail')) + '">' + icon('chart') + '</a>' +
          '<button type="button" class="icon-btn sm" data-action="student-edit" data-id="' + esc(s.id) + '">' + icon('edit') + '</button>' +
          '<button type="button" class="icon-btn sm danger" data-action="student-delete" data-id="' + esc(s.id) + '">' + icon('trash') + '</button>' +
        '</td></tr>';
    }).join('') : '<tr><td colspan="7" class="muted">' + esc(t('student.noStudents')) + '</td></tr>';

    return '<section class="toolbar"><div class="toolbar-left">' +
        '<label class="inline-field"><span>' + esc(t('student.filterClass')) + '</span><select data-action="student-filter-class">' + classOptions + '</select></label>' +
        '<label class="search-field">' + icon('search') + '<input type="search" data-action="student-search" value="' + esc(filter.search) + '" placeholder="' + esc(t('student.searchPlaceholder')) + '" /></label>' +
      '</div>' +
      '<button type="button" class="btn btn-primary btn-sm" data-action="student-new">' + icon('plus') + '<span>' + esc(t('student.new')) + '</span></button></section>' +
      '<div class="table-wrap card"><table class="table"><thead><tr>' +
        '<th>' + esc(t('student.name')) + '</th><th>' + esc(t('student.username')) + '</th><th>' + esc(t('student.class')) + '</th>' +
        '<th>' + esc(t('student.attempts')) + '</th><th>' + esc(t('student.avg')) + '</th><th>' + esc(t('student.last')) + '</th><th></th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function studentFormCard(student) {
    var isEdit = !!student;
    var classOptions = store.listClasses().map(function (c) {
      return '<option value="' + esc(c.id) + '"' + (student && (student.classId || store.OTHER_CLASS_ID) === c.id ? ' selected' : '') + '>' + esc(clsName(c)) + '</option>';
    }).join('');
    return '<form id="student-form" class="card form-card">' +
      '<div class="form-card-head"><h2>' + esc(isEdit ? t('student.edit') : t('student.new')) + '</h2>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-action="student-cancel">' + esc(t('common.cancel')) + '</button></div>' +
      '<div class="grid-2">' +
        '<div class="field"><label>' + esc(t('student.name')) + '</label><input data-f="name" value="' + esc(student ? student.name : '') + '" /></div>' +
        '<div class="field"><label>' + esc(t('student.username')) + '</label><input data-f="username" dir="ltr" value="' + esc(student ? student.username : '') + '" /></div>' +
        '<div class="field"><label>' + esc(t('student.password')) + '</label><input data-f="password" type="text" dir="ltr" value="" placeholder="' + esc(isEdit ? '••••' : '') + '" /></div>' +
        '<div class="field"><label>' + esc(t('student.class')) + '</label><select data-f="classId">' + classOptions + '</select></div>' +
      '</div>' +
      '<p class="form-hint muted small">' + esc(t('student.classHint')) + '</p>' +
      '<p class="form-error" id="form-error" hidden></p>' +
      '<div class="form-actions"><button class="btn btn-primary" type="submit">' + esc(t('common.save')) + '</button>' +
        '<button type="button" class="btn btn-ghost" data-action="student-cancel">' + esc(t('common.cancel')) + '</button></div>' +
    '</form>';
  }

  /* ---------------- پنل: ادمین‌ها و تنظیمات ---------------- */

  function viewAdminAdmins() {
    var admins = store.listAdmins();
    var me = store.currentUser();
    var list = admins.map(function (a) {
      return '<article class="class-row card">' +
        '<div class="class-row-main"><h3>' + esc(a.name) + (a.id === me.id ? ' <span class="badge badge-soft">' + esc(t('admins.you')) + '</span>' : '') + '</h3>' +
          '<p class="muted small"><bdi>' + esc(a.username) + '</bdi> · ' + esc(dateText(a.createdAt)) + '</p></div>' +
        '<div class="exam-actions">' +
          '<button type="button" class="icon-btn sm" data-action="admin-edit" data-id="' + esc(a.id) + '">' + icon('edit') + '</button>' +
          (admins.length > 1 ? '<button type="button" class="icon-btn sm danger" data-action="admin-delete" data-id="' + esc(a.id) + '">' + icon('trash') + '</button>' : '') +
        '</div></article>';
    }).join('');

    var settings = store.getSettings();
    var form = state.editingAdmin ? adminFormCard(state.editingAdmin === 'new' ? null : admins.filter(function (a) { return a.id === state.editingAdmin; })[0]) : '';

    return '<section class="section"><div class="section-head"><div><h2>' + esc(t('admins.title')) + '</h2>' +
        '<p class="muted small">' + esc(t('admins.subtitle')) + '</p></div>' +
        '<button type="button" class="btn btn-primary btn-sm" data-action="admin-new">' + icon('plus') + '<span>' + esc(t('admins.new')) + '</span></button></div>' +
      form + '<div class="class-list">' + list + '</div></section>' +
      '<section class="card settings-card"><h2>' + esc(t('admins.settingsTitle')) + '</h2>' +
        '<div class="settings-grid">' +
          '<div class="settings-block"><h3>' + esc(t('admins.aiTitle')) + '</h3>' +
            '<p class="muted small">' + esc(t('admins.aiHint')) + '</p>' +
            '<div class="field"><label>' + esc(t('ai.baseUrl')) + '</label><input data-setting="ai-baseUrl" dir="ltr" value="' + esc(settings.ai.baseUrl) + '" placeholder="https://api.deepseek.com/v1" /></div>' +
            '<div class="field"><label>' + esc(t('ai.apiKey')) + '</label><input data-setting="ai-apiKey" dir="ltr" type="password" value="' + esc(settings.ai.apiKey) + '" placeholder="sk-..." /></div>' +
            '<div class="field"><label>' + esc(t('ai.model')) + '</label><input data-setting="ai-model" dir="ltr" value="' + esc(settings.ai.model) + '" placeholder="deepseek-chat" /></div>' +
            '<p class="muted small">' + esc(t('ai.hintKey')) + '</p>' +
            '<p class="muted small">' + esc(t('ai.hintKey2')) + '</p>' +
            '<div class="ai-actions">' +
              '<button type="button" class="btn btn-primary btn-sm" data-action="save-ai">' + esc(t('common.save')) + '</button>' +
              '<button type="button" class="btn btn-ghost btn-sm" data-action="ai-preset">' + esc(t('ai.preset')) + '</button>' +
              '<button type="button" class="btn btn-ghost btn-sm" data-action="ai-test">' + esc(t('ai.test')) + '</button>' +
            '</div>' +
            '<div class="ai-status" id="ai-status" hidden></div>' +          '</div>' +
          '<div class="settings-block"><h3>' + esc(t('quiz.security')) + '</h3>' +
            '<label class="check-label"><input type="checkbox" data-setting="camera"' + (settings.security.camera ? ' checked' : '') + ' /><span>' + esc(t('admins.cameraSecurity')) + '</span></label>' +
            '<p class="muted small">' + esc(t('admins.cameraHint')) + '</p>' +
            '<button type="button" class="btn btn-ghost btn-sm" data-action="save-security">' + esc(t('common.save')) + '</button>' +
            '<hr class="sep" />' +
            '<button type="button" class="btn btn-ghost btn-sm" data-action="db-test">' + icon('shield') + '<span>' + esc(t('db.test')) + '</span></button>' +
            '<pre class="db-status" id="db-status" hidden></pre>' +
            '<hr class="sep" />' +
            '<button type="button" class="btn btn-ghost btn-sm danger" data-action="reset-demo">' + icon('reset') + '<span>' + esc(t('admins.resetDemo')) + '</span></button>' +
          '</div>' +
        '</div>' +
      '</section>' + coefficientsCard();
  }

  function coefficientsCard() {
    var settings = store.getSettings();
    var overrides = settings.coefficients || {};
    var isFa = i18n.lang === 'fa';

    var blocks = store.MAJORS.map(function (m) {
      var defaults = logic.COEFFICIENTS[m.key] || {};
      var subjects = Object.keys(defaults);
      if (!subjects.length) return '';
      var rows = subjects.map(function (subj) {
        var value = overrides[m.key] && overrides[m.key][subj] !== undefined ? overrides[m.key][subj] : defaults[subj];
        return '<label class="coef-row"><span>' + esc(subj) + '</span>' +
          '<input type="number" min="0" max="10" step="1" inputmode="numeric" data-coef="' + esc(m.key + '|' + subj) + '" value="' + esc(value) + '" />' +
        '</label>';
      }).join('');
      return '<div class="coef-group"><h4>' + esc(isFa ? m.fa : m.en) + '</h4><div class="coef-grid">' + rows + '</div></div>';
    }).join('');

    return '<section class="card settings-card coefficients-card">' +
      '<h2>' + esc(t('admins.coefTitle')) + '</h2>' +
      '<p class="muted small">' + esc(t('admins.coefHint')) + '</p>' +
      '<details class="coef-details"><summary>' + esc(t('admins.coefOpen')) + '</summary>' +
        blocks + '</details>' +
      '<div class="ai-actions"><button type="button" class="btn btn-ghost btn-sm" data-action="save-coefficients">' + esc(t('common.save')) + '</button></div>' +
    '</section>';
  }

  function adminFormCard(admin) {
    var isEdit = !!admin;
    return '<form id="admin-form" class="card form-card">' +
      '<div class="form-card-head"><h2>' + esc(isEdit ? t('admins.edit') : t('admins.new')) + '</h2>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-action="admin-cancel">' + esc(t('common.cancel')) + '</button></div>' +
      '<div class="grid-3">' +
        '<div class="field"><label>' + esc(t('admins.name')) + '</label><input data-f="name" value="' + esc(admin ? admin.name : '') + '" /></div>' +
        '<div class="field"><label>' + esc(t('admins.username')) + '</label><input data-f="username" dir="ltr" value="' + esc(admin ? admin.username : '') + '" /></div>' +
        '<div class="field"><label>' + esc(t('admins.password')) + '</label><input data-f="password" type="password" dir="ltr" placeholder="' + esc(isEdit ? '••••' : '') + '" /></div>' +
      '</div>' +
      '<p class="form-error" id="form-error" hidden></p>' +
      '<div class="form-actions"><button class="btn btn-primary" type="submit">' + esc(t('common.save')) + '</button>' +
        '<button type="button" class="btn btn-ghost" data-action="admin-cancel">' + esc(t('common.cancel')) + '</button></div>' +
    '</form>';
  }

  /* ---------------- رفع اشکال ---------------- */

  function inquiryStatusBadge(status) {
    if (status === 'answered') return badge(t('inquiry.statusAnswered'), 'ok');
    if (status === 'closed') return badge(t('inquiry.statusClosed'), 'soft');
    return badge(t('inquiry.statusOpen'), 'warn');
  }

  function inquiryRepliesHtml(item, viewer) {
    if (!item.replies || !item.replies.length) {
      return '<p class="muted small inq-no-reply">' + esc(t('inquiry.noReplyYet')) + '</p>';
    }
    return '<div class="inq-replies">' + item.replies.map(function (r) {
      return '<div class="inq-reply' + (r.role === 'admin' ? ' is-admin' : '') + '">' +
        '<div class="inq-reply-head"><strong>' + esc(r.role === 'admin' ? t('inquiry.teacher') : r.byName) + '</strong>' +
          '<small class="muted">' + esc(dateText(r.createdAt, true)) + '</small></div>' +
        (r.text ? '<p>' + esc(r.text) + '</p>' : '') +
        (r.image ? '<img src="' + esc(r.image) + '" alt="" />' : '') +
      '</div>';
    }).join('') + '</div>';
  }

  /** پیام‌های گفت‌وگوی درسی با هوش مصنوعی */
  function aiAskMessagesHtml(user) {
    var messages = store.getAiChat(user.id);
    var bubbles = messages.map(function (m) {
      return '<div class="ai-bubble is-' + (m.role === 'user' ? 'user' : 'ai') + (m.error ? ' is-error' : '') + '">' +
        (m.role === 'assistant'
          ? formatAiText(m.text) + (m.imageIgnored ? '<p class="ai-note">' + esc(t('inquiry.imageNotSeen')) + '</p>' : '')
          : esc(m.text) + (m.image ? '<img src="' + esc(m.image) + '" alt="" />' : '')) +
      '</div>';
    }).join('');
    if (state.aiAskBusy) {
      bubbles += '<div class="ai-bubble is-ai is-typing"><span class="spinner"></span>' + esc(t('ai.typing')) + '</div>';
    }
    if (!messages.length && !state.aiAskBusy) {
      bubbles = '<p class="muted small inq-no-reply">' + esc(t('inquiry.aiEmpty')) + '</p>';
    }
    return bubbles;
  }

  function aiAskSection(user) {
    var configured = ai.isConfigured(store.getSettings());
    var head = '<div class="section-head ai-ask-head"><div><h2>' + icon('spark') + ' ' + esc(t('inquiry.aiTitle')) + '</h2>' +
      '<p class="muted small">' + esc(t('inquiry.aiHint')) + '</p></div>' +
      (store.getAiChat(user.id).length
        ? '<button type="button" class="btn btn-ghost btn-sm" data-action="ai-ask-clear">' + icon('reset') + '<span>' + esc(t('inquiry.clear')) + '</span></button>'
        : '') +
    '</div>';

    var body;
    if (!configured) {
      body = '<div class="ai-offline">' + icon('spark') +
        '<p>' + esc(t('inquiry.aiOffline')) + '</p></div>';
    } else {
      body = '<div class="ai-chat ai-ask-chat" id="ai-ask-chat">' + aiAskMessagesHtml(user) + '</div>' +
        '<div class="ai-compose ai-ask-compose">' +
          '<input id="ai-ask-input" type="text" autocomplete="off" placeholder="' + esc(t('inquiry.aiPlaceholder')) + '" />' +
          imageFieldHtml('ai-ask', '', 'ai', true) +
          '<button type="button" class="btn btn-primary btn-sm" data-action="ai-ask">' + esc(t('inquiry.send')) + '</button>' +
        '</div>' +
        '<p class="muted small">' + esc(t('inquiry.aiNote')) + '</p>';
    }
    return '<div class="card ai-ask">' + head + body + '</div>';
  }

  function teacherInquirySection(user) {
    var quota = store.inquiryQuota(user.id);
    var items = store.listInquiries({ userId: user.id });

    var formHtml;
    if (quota.remaining > 0) {
      formHtml = '<form id="inquiry-form" class="card form-card">' +
        '<div class="form-card-head"><h2>' + esc(t('inquiry.new')) + '</h2>' +
          '<span class="badge badge-soft">' + esc(t('inquiry.quota', { used: num(quota.used), limit: num(quota.limit) })) + '</span></div>' +
        '<div class="grid-2">' +
          '<div class="field"><label>' + esc(t('inquiry.text')) + '</label>' +
            '<textarea data-f="text" rows="3" placeholder="' + esc(t('inquiry.textPlaceholder')) + '"></textarea></div>' +
          '<div class="field"><label>' + esc(t('inquiry.subject')) + '</label>' +
            '<input data-f="subject" placeholder="' + esc(t('common.subject')) + '" /></div>' +
        '</div>' +
        '<div class="field"><label>' + esc(t('inquiry.image')) + '</label>' + imageFieldHtml('inquiry', '', 'inquiry') + '</div>' +
        '<p class="form-hint muted small">' + esc(t('inquiry.imageHint')) + '</p>' +
        '<p class="form-error" id="form-error" hidden></p>' +
        '<div class="form-actions"><button class="btn btn-primary" type="submit">' + esc(t('inquiry.submit')) + '</button></div>' +
      '</form>';
    } else {
      formHtml = '<div class="card inq-limit"><strong>' + esc(t('inquiry.limitReached')) + '</strong>' +
        '<p class="muted small">' + esc(t('inquiry.limitReset', { time: dateText(quota.resetAt, true) })) + '</p></div>';
    }

    var list = items.length ? items.map(function (item) {
      return '<article class="card inq-card">' +
        '<div class="inq-head">' +
          '<span class="badge badge-soft">' + esc(item.subject || t('inquiry.general')) + '</span>' +
          inquiryStatusBadge(item.status) +
          '<span class="spacer"></span><small class="muted">' + esc(dateText(item.createdAt, true)) + '</small></div>' +
        '<p class="inq-text">' + esc(item.text) + '</p>' +
        (item.image ? '<img class="inq-image" src="' + esc(item.image) + '" alt="" />' : '') +
        inquiryRepliesHtml(item, user) +
        '<div class="inq-compose">' +
          '<input id="follow-' + esc(item.id) + '" placeholder="' + esc(t('inquiry.followupPlaceholder')) + '" />' +
          '<button type="button" class="btn btn-ghost btn-sm" data-action="inquiry-followup" data-id="' + esc(item.id) + '">' + esc(t('inquiry.send')) + '</button>' +
        '</div>' +
      '</article>';
    }).join('') : '<div class="empty card">' + esc(t('inquiry.none')) + '</div>';

    return formHtml + '<div class="inq-list">' + list + '</div>';
  }

  function viewStudentInquiries(user) {
    var tab = state.inquiryTab === 'teacher' ? 'teacher' : 'ai';
    var quota = store.inquiryQuota(user.id);

    var tabsHtml = '<div class="seg-tabs">' +
      '<button type="button" class="seg-tab' + (tab === 'ai' ? ' is-active' : '') + '" data-action="inquiry-tab" data-tab="ai">' +
        icon('spark') + '<span>' + esc(t('inquiry.tabAi')) + '</span></button>' +
      '<button type="button" class="seg-tab' + (tab === 'teacher' ? ' is-active' : '') + '" data-action="inquiry-tab" data-tab="teacher">' +
        icon('users') + '<span>' + esc(t('inquiry.tabTeacher')) + '</span>' +
        '<b class="tab-count">' + num(quota.remaining) + '</b></button>' +
    '</div>';

    return '<section class="section">' +
      '<div class="section-head"><div><h1>' + esc(t('inquiry.title')) + '</h1>' +
        '<p class="muted small">' + esc(t('inquiry.subtitle')) + '</p></div></div>' +
      tabsHtml +
      (tab === 'ai' ? aiAskSection(user) : teacherInquirySection(user)) +
    '</section>';
  }

  function viewAdminInquiries() {
    var filter = state.inquiryFilter || 'all';
    var all = store.listInquiries(filter === 'all' ? null : { status: filter });
    var openCount = store.listInquiries({ status: 'open' }).length;
    var filterOptions = [['all', t('common.all')], ['open', t('inquiry.statusOpen')], ['answered', t('inquiry.statusAnswered')], ['closed', t('inquiry.statusClosed')]]
      .map(function (f) {
        return '<option value="' + f[0] + '"' + (filter === f[0] ? ' selected' : '') + '>' + esc(f[1]) + '</option>';
      }).join('');

    var list = all.length ? all.map(function (item) {
      var student = store.getStudent(item.userId);
      return '<article class="card inq-card is-admin">' +
        '<div class="inq-head">' +
          '<span class="badge badge-soft">' + esc(student ? student.name : '—') + '</span>' +
          (student ? '<span class="badge badge-soft">' + esc(clsName(store.getClass(student.classId || store.OTHER_CLASS_ID))) + '</span>' : '') +
          (item.subject ? '<span class="badge badge-soft">' + esc(item.subject) + '</span>' : '') +
          inquiryStatusBadge(item.status) +
          '<span class="spacer"></span><small class="muted">' + esc(dateText(item.createdAt, true)) + '</small>' +
          (item.status !== 'closed'
            ? '<button type="button" class="icon-btn sm" data-action="inquiry-close" data-id="' + esc(item.id) + '" title="' + esc(t('inquiry.close')) + '">' + icon('check') + '</button>'
            : '') +
          '<button type="button" class="icon-btn sm danger" data-action="inquiry-delete" data-id="' + esc(item.id) + '" title="' + esc(t('common.delete')) + '">' + icon('trash') + '</button>' +
        '</div>' +
        '<p class="inq-text">' + esc(item.text) + '</p>' +
        (item.image ? '<img class="inq-image" src="' + esc(item.image) + '" alt="" />' : '') +
        inquiryRepliesHtml(item, store.currentUser()) +
        '<div class="inq-compose">' +
          '<input id="reply-' + esc(item.id) + '" placeholder="' + esc(t('inquiry.replyPlaceholder')) + '" />' +
          imageFieldHtml('reply-img-' + item.id, '', 'reply', true) +
          '<button type="button" class="btn btn-primary btn-sm" data-action="inquiry-reply" data-id="' + esc(item.id) + '">' + esc(t('inquiry.sendReply')) + '</button>' +
        '</div>' +
      '</article>';
    }).join('') : '<div class="empty card">' + esc(t('inquiry.noForFilter')) + '</div>';

    return '<section class="section">' +
      '<div class="section-head"><div><h2>' + esc(t('inquiry.title')) + '</h2>' +
        '<p class="muted small">' + esc(t('inquiry.adminSubtitle')) + '</p></div></div>' +
      '<div class="toolbar"><div class="toolbar-left">' +
        '<label class="inline-field"><span>' + esc(t('inquiry.filter')) + '</span>' +
          '<select data-action="inquiry-filter">' + filterOptions + '</select></label>' +
        '<span class="badge badge-warn">' + esc(t('inquiry.openCount', { n: num(openCount) })) + '</span>' +
      '</div></div>' +
      '<div class="inq-list">' + list + '</div></section>';
  }

  function handleInquirySubmit(form) {
    var user = store.currentUser();
    if (!user) return;
    var text = form.querySelector('[data-f="text"]').value.trim();
    var subject = form.querySelector('[data-f="subject"]').value.trim();
    var image = (form.querySelector('[data-img="inquiry"]') || {}).value || '';
    clearError();
    if (!text && !image) { showError(t('inquiry.empty')); return; }
    var res = store.createInquiry({ userId: user.id, text: text, subject: subject, image: image });
    if (!res.ok) {
      showError(t('inquiry.limitReached'));
      render();
      return;
    }
    toast(t('inquiry.sent'));
    render();
  }

  /* ---------------- کارنامه‌های مدیر ---------------- */

  function viewAdminReports() {
    var exams = store.listExams();
    var classes = store.listClasses();

    var examRows = exams.length ? exams.map(function (exam) {
      var sum = report.examSummary(exam);
      return '<tr>' +
        '<td data-label="' + esc(t('exam.title')) + '"><a href="#/admin/reports/' + esc(exam.id) + '"><strong>' + esc(examTitle(exam)) + '</strong></a>' +
          '<small class="cell-sub">' + esc(clsName(store.getClass(exam.classId))) + '</small></td>' +
        '<td data-label="' + esc(t('reports.participants')) + '">' + num(sum.n) + '</td>' +
        '<td data-label="' + esc(t('reports.avg')) + '">' + (sum.n ? num(sum.avgPercent) + '%' : '—') + '</td>' +
        '<td data-label="' + esc(t('reports.best')) + '">' + (sum.n ? num(sum.bestPercent) + '%' : '—') + '</td>' +
        '<td data-label="' + esc(t('reports.taraz')) + '">' + (sum.n ? num(sum.avgTaraz) : '—') + '</td>' +
        '<td class="cell-action"><a class="btn btn-ghost btn-sm" href="#/admin/reports/' + esc(exam.id) + '">' + esc(t('reports.open')) + '</a>' +
          '<button type="button" class="icon-btn sm" data-action="csv-exam" data-id="' + esc(exam.id) + '" title="' + esc(t('reports.csv')) + '">' + icon('download') + '</button></td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="6" class="muted">' + esc(t('reports.noExams')) + '</td></tr>';

    var classRows = classes.map(function (c) {
      var stats = store.classStats(c.id);
      return '<tr>' +
        '<td data-label="' + esc(t('common.class')) + '"><a href="#/admin/reports/class/' + esc(c.id) + '"><strong>' + esc(clsName(c)) + '</strong></a></td>' +
        '<td data-label="' + esc(t('class.students')) + '">' + num(stats.students) + '</td>' +
        '<td data-label="' + esc(t('student.attempts')) + '">' + num(stats.attempts) + '</td>' +
        '<td data-label="' + esc(t('reports.avg')) + '">' + (stats.attempts ? num(stats.avg) + '%' : '—') + '</td>' +
        '<td class="cell-action"><a class="btn btn-ghost btn-sm" href="#/admin/reports/class/' + esc(c.id) + '">' + esc(t('reports.open')) + '</a>' +
          '<button type="button" class="icon-btn sm" data-action="csv-class" data-id="' + esc(c.id) + '" title="' + esc(t('reports.csv')) + '">' + icon('download') + '</button></td>' +
      '</tr>';
    }).join('');

    return '<section class="section"><div class="section-head"><div><h1>' + esc(t('reports.title')) + '</h1>' +
        '<p class="muted small">' + esc(t('reports.subtitle')) + '</p></div></div>' +
      '<h2 class="sub-title">' + esc(t('reports.examsSection')) + '</h2>' +
      '<div class="table-wrap card"><table class="table"><thead><tr>' +
        '<th>' + esc(t('exam.title')) + '</th><th>' + esc(t('reports.participants')) + '</th>' +
        '<th>' + esc(t('reports.avg')) + '</th><th>' + esc(t('reports.best')) + '</th><th>' + esc(t('reports.taraz')) + '</th><th></th>' +
      '</tr></thead><tbody>' + examRows + '</tbody></table></div>' +
      '<h2 class="sub-title">' + esc(t('reports.classesSection')) + '</h2>' +
      '<div class="table-wrap card"><table class="table"><thead><tr>' +
        '<th>' + esc(t('common.class')) + '</th><th>' + esc(t('class.students')) + '</th>' +
        '<th>' + esc(t('student.attempts')) + '</th><th>' + esc(t('reports.avg')) + '</th><th></th>' +
      '</tr></thead><tbody>' + classRows + '</tbody></table></div>' +
    '</section>';
  }

  function viewExamReport(examId) {
    var exam = store.getExam(examId);
    if (!exam) return notFound();
    var sum = report.examSummary(exam);
    var cls = store.getClass(exam.classId);
    var clsStats = store.classStats(exam.classId);

    var rows = sum.rows.length ? sum.rows.map(function (r) {
      return '<tr>' +
        '<td data-label="' + esc(t('reports.rank')) + '"><span class="rank-badge">' + num(r.rank) + '</span></td>' +
        '<td data-label="' + esc(t('reports.student')) + '">' +
          (r.student
            ? '<a href="#/student/' + esc(r.student.id) + '"><strong>' + esc(r.name) + '</strong></a>'
            : '<strong>' + esc(r.name) + '</strong>') +
          '<small class="cell-sub"><bdi>' + esc(r.username) + '</bdi></small></td>' +        '<td data-label="' + esc(t('reports.correct')) + '">' + num(r.correct) + '</td>' +
        '<td data-label="' + esc(t('reports.wrong')) + '">' + num(r.wrong) + '</td>' +
        '<td data-label="' + esc(t('reports.blank')) + '">' + num(r.blank) + '</td>' +
        '<td data-label="' + esc(t('reports.percent')) + '"><span class="score-pill ' + toneOf(r.percent) + '">' + num(r.percent) + '%</span></td>' +
        '<td data-label="' + esc(t('reports.score20')) + '">' + num(r.score20) + '</td>' +
        '<td data-label="' + esc(t('reports.taraz')) + '">' + num(r.taraz) + '</td>' +
        '<td data-label="' + esc(t('reports.time')) + '">' + esc(timeText(r.timeSec)) + '</td>' +
        '<td data-label="' + esc(t('reports.incidents')) + '">' + (r.incidents ? '<span class="badge badge-bad">' + esc(t('reports.incidentCount', { n: num(r.incidents) })) + '</span>' : '<span class="muted small">' + esc(t('reports.noIncidents')) + '</span>') + '</td>' +
        '<td class="cell-action"><a class="btn btn-ghost btn-sm" href="#/result/' + esc(r.attempt.id) + '">' + esc(t('reports.open')) + '</a></td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="11" class="muted">' + esc(t('reports.noAttempts')) + '</td></tr>';

    return '<section class="section"><div class="section-head"><div>' +
        '<a class="link" href="#/admin/reports">' + esc(t('reports.backReports')) + '</a>' +
        '<h1>' + esc(examTitle(exam)) + '</h1>' +
        '<p class="muted small">' + esc(clsName(cls)) + ' · ' + num(clsStats.students) + ' ' + esc(t('class.students')) +
          ' · ' + num(clsStats.exams) + ' ' + esc(t('nav.exams')) +
          (clsStats.attempts ? ' · ' + esc(t('reports.avg')) + ': ' + num(clsStats.avg) + '%' : '') +
          ' · ' + esc(scheduleText(exam)) + ' · ' + num(exam.durationMin) + ' ' + esc(t('common.min')) + '</p></div>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-action="csv-exam" data-id="' + esc(exam.id) + '">' + icon('download') + '<span>' + esc(t('reports.csv')) + '</span></button></div>' +
      '<div class="stats stats-4">' +
        statCard('users', num(sum.n), t('reports.participants')) +
        statCard('chart', sum.n ? num(sum.avgPercent) + '%' : '—', t('reports.avg')) +
        statCard('flag', sum.n ? num(sum.bestPercent) + '%' : '—', t('reports.best')) +
        statCard('shield', sum.n ? num(sum.avgTaraz) : '—', t('reports.taraz')) +
      '</div>' +
      '<div class="table-wrap card"><table class="table"><thead><tr>' +
        '<th>' + esc(t('reports.rank')) + '</th><th>' + esc(t('reports.student')) + '</th>' +
        '<th>' + esc(t('reports.correct')) + '</th><th>' + esc(t('reports.wrong')) + '</th><th>' + esc(t('reports.blank')) + '</th>' +
        '<th>' + esc(t('reports.percent')) + '</th><th>' + esc(t('reports.score20')) + '</th><th>' + esc(t('reports.taraz')) + '</th>' +
        '<th>' + esc(t('reports.time')) + '</th><th>' + esc(t('reports.incidents')) + '</th><th></th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div></section>';
  }

  function viewClassReport(classId) {
    var cls = store.getClass(classId);
    if (!cls) return notFound();
    var data = report.classMatrix(classId);
    var stats = store.classStats(classId);

    var head = '<tr><th>' + esc(t('reports.student')) + '</th>' +
      data.exams.map(function (e) { return '<th class="rot-th">' + esc(examTitle(e)) + '</th>'; }).join('') +
      '<th>' + esc(t('reports.avg')) + '</th></tr>';

    var body = data.matrix.length ? data.matrix.map(function (row) {
      var values = row.cells.filter(Boolean).map(function (c) { return c.percent; });
      var avg = values.length ? Math.round(values.reduce(function (s, v) { return s + v; }, 0) / values.length) : null;
      return '<tr><td data-label="' + esc(t('reports.student')) + '"><a href="#/student/' + esc(row.student.id) + '"><strong>' + esc(row.student.name) + '</strong></a></td>' +
        row.cells.map(function (cell) {
          return '<td data-label="">' + (cell ? '<span class="score-pill ' + toneOf(cell.percent) + '">' + num(cell.percent) + '%</span>' : '<span class="muted">—</span>') + '</td>';
        }).join('') +
        '<td>' + (avg === null ? '—' : num(avg) + '%') + '</td></tr>';
    }).join('') : '<tr><td colspan="' + (data.exams.length + 2) + '" class="muted">' + esc(t('class.noStudents')) + '</td></tr>';

    return '<section class="section"><div class="section-head"><div>' +
        '<a class="link" href="#/admin/reports">' + esc(t('reports.backReports')) + '</a>' +
        '<h1>' + esc(clsName(cls)) + '</h1>' +
        '<p class="muted small">' + esc(t('class.stats', { s: num(stats.students), e: num(stats.exams), a: num(stats.attempts) })) + '</p></div>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-action="csv-class" data-id="' + esc(cls.id) + '">' + icon('download') + '<span>' + esc(t('reports.csv')) + '</span></button></div>' +
      (data.exams.length
        ? '<div class="table-wrap card"><table class="table matrix-table"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
          '<p class="muted small">' + esc(t('reports.matrixHint')) + '</p>'
        : '<div class="empty card">' + esc(t('reports.noExamsForClass')) + '</div>') +
    '</section>';
  }

  function viewStudentDetail(studentId) {
    var summary = report.studentSummary(studentId);
    if (!summary) return notFound();
    var s = summary.student;
    var rows = summary.attempts.slice().reverse().map(function (a) {
      var exam = store.getExam(a.examId);
      var taraz = tarazOfAttempt(a, exam);
      return '<tr>' +
        '<td data-label="' + esc(t('exam.title')) + '"><a href="#/result/' + esc(a.id) + '"><strong>' + esc(examTitle(exam)) + '</strong></a>' +
          (a.practice ? ' <span class="badge badge-warn">' + esc(t('practice.badge')) + '</span>' : '') + '</td>' +
        '<td data-label="' + esc(t('reports.date')) + '">' + esc(dateText(a.submittedAt, true)) + '</td>' +
        '<td data-label="' + esc(t('reports.percent')) + '"><span class="score-pill ' + toneOf(a.percent) + '">' + num(a.percent) + '%</span></td>' +
        '<td data-label="' + esc(t('reports.taraz')) + '">' + num(taraz) + '</td>' +
        '<td data-label="' + esc(t('result.rank')) + '">' + num(rankOfAttempt(a, exam)) + '</td>' +
        '<td class="cell-action"><a class="btn btn-ghost btn-sm" href="#/result/' + esc(a.id) + '">' + esc(t('reports.open')) + '</a></td>' +
      '</tr>';
    }).join('');

    return '<section class="section"><div class="section-head"><div>' +
        '<a class="link" href="#/admin/students">' + esc(t('common.back')) + '</a>' +
        '<h1>' + esc(s.name) + '</h1>' +
        '<p class="muted small"><bdi>' + esc(s.username) + '</bdi> · ' + esc(clsName(summary.classObj)) + '</p></div>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-action="csv-student" data-id="' + esc(s.id) + '">' + icon('download') + '<span>' + esc(t('sd.csv')) + '</span></button></div>' +
      '<div class="stats stats-4">' +
        statCard('list', num(summary.count), t('sd.count')) +
        statCard('chart', num(summary.avgPercent) + '%', t('sd.avg')) +
        statCard('flag', num(summary.bestPercent) + '%', t('sd.best')) +
        statCard('shield', num(summary.bestTaraz), t('sd.bestTaraz')) +
      '</div>' +
      (summary.count
        ? '<div class="table-wrap card"><table class="table"><thead><tr>' +
            '<th>' + esc(t('exam.title')) + '</th><th>' + esc(t('reports.date')) + '</th>' +
            '<th>' + esc(t('reports.percent')) + '</th><th>' + esc(t('reports.taraz')) + '</th>' +
            '<th>' + esc(t('result.rank')) + '</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<div class="empty card">' + esc(t('sd.noAttempts')) + '</div>') +
    '</section>';
  }

  function emptyPage(title, text, href, actionLabel) {
    return '<div class="empty-page card"><span class="big-ico">' + icon('clock') + '</span>' +
      '<h2>' + esc(title) + '</h2>' + (text ? '<p class="muted">' + esc(text) + '</p>' : '') +
      (href ? '<a class="btn btn-primary" href="' + href + '">' + esc(actionLabel || t('common.back')) + '</a>' : '') + '</div>';
  }

  function notFound() {
    return '<div class="empty-page card"><span class="big-ico">' + icon('cross') + '</span>' +
      '<h2>' + esc(t('common.none')) + '</h2><a class="btn btn-primary" href="#/dashboard">' + esc(t('result.backDash')) + '</a></div>';
  }

  /* ---------------- مودال، پیام، دانلود ---------------- */

  function closeModal() { modalRoot.innerHTML = ''; }

  /** نمایش بزرگ عکس (لایت‌باکس) */
  function openImage(src, alt) {
    if (!src) return;
    var box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('data-lightbox', '1');
    box.innerHTML = '<img src="' + esc(src) + '" alt="' + esc(alt || '') + '" />' +
      '<button type="button" class="btn lightbox-close" data-lightbox-close="1">' + esc(t('common.close')) + '</button>';

    function close() {
      if (box.parentNode) box.parentNode.removeChild(box);
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    box.addEventListener('click', function (e) {
      if (e.target === box || e.target.getAttribute('data-lightbox-close')) close();
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(box);
  }

  function openModal(opts) {
    modalRoot.innerHTML = '<div class="modal-backdrop" data-modal-backdrop>' +
      '<div class="modal card" role="dialog" aria-modal="true">' +
        '<h3>' + esc(opts.title || '') + '</h3>' +
        (opts.bodyHtml ? '<div class="modal-body">' + opts.bodyHtml + '</div>' : (opts.body ? '<p class="modal-body">' + esc(opts.body) + '</p>' : '')) +
        '<div class="modal-actions">' +
          '<button type="button" class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-modal-ok>' + esc(opts.confirmText || t('common.confirm')) + '</button>' +
          (opts.onCancel === null ? '' : '<button type="button" class="btn btn-ghost" data-modal-cancel>' + esc(opts.cancelText || t('common.cancel')) + '</button>') +
        '</div>' +
      '</div></div>';

    var backdrop = modalRoot.querySelector('[data-modal-backdrop]');
    var okBtn = modalRoot.querySelector('[data-modal-ok]');
    var cancelBtn = modalRoot.querySelector('[data-modal-cancel]');
    okBtn.addEventListener('click', function () {
      var keep = opts.onConfirm ? opts.onConfirm() : null;
      if (keep !== false) closeModal();
    });
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) closeModal(); });
    try { okBtn.focus(); } catch (e) { /* ignore */ }
  }

  function toast(message, type) {
    var el = document.createElement('div');
    el.className = 'toast toast-' + (type || 'ok');
    el.textContent = message;
    toastRoot.appendChild(el);
    setTimeout(function () {
      el.classList.add('is-out');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 250);
    }, 2800);
  }

  function showError(message, id) {
    var el = document.getElementById(id || 'form-error');
    if (!el) { toast(message, 'bad'); return; }
    el.textContent = message;
    el.hidden = false;
  }

  function clearError(id) {
    var el = document.getElementById(id || 'form-error');
    if (el) { el.hidden = true; el.textContent = ''; }
  }

  function download(filename, content) {
    try {
      var blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 600);
    } catch (e) {
      toast(t('common.none'), 'bad');
    }
  }

  /* ---------------- پردازش تصویر ---------------- */

  function compressImage(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type)) return reject(new Error('type'));
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var max = 900;
          var w = img.width;
          var h = img.height;
          if (w > max || h > max) {
            var ratio = Math.min(max / w, max / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }
          var canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          var out = canvas.toDataURL('image/jpeg', 0.72);
          if (out.length > 900000) return reject(new Error('big'));
          resolve(out);
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* ---------------- هندلرها: ورود ---------------- */

  function handleLogin(form) {
    var fd = new FormData(form);
    var username = String(fd.get('username') || '').trim();
    var password = String(fd.get('password') || '');
    clearError('auth-error');
    if (!username || !password) { showError(t('auth.errEmpty'), 'auth-error'); return; }
    var res = store.login(username, password);
    if (!res.ok) { showError(t('auth.errInvalid'), 'auth-error'); return; }
    state.quiz = null;
    state.ai = emptyAiState();
    state.pendingEditIndex = null;
    toast(t('dash.greeting', { name: res.user.name }));
    navigate('dashboard');
    render();
  }

  function handleQuestionSubmit(form) {
    var draft = readEditor('bank');
    clearError();
    var v = validateDraft(draft);
    if (!v.ok) { showError(v.error); return; }
    if (state.editingQuestion === 'new') store.createQuestion(draft);
    else store.updateQuestion(state.editingQuestion, draft);
    state.editingQuestion = null;
    state.editorDraft = {};
    toast(t('qbank.saved'));
    render();
  }

  function handleExamSubmit(form) {
    syncExamDraft();
    var draft = state.examDraft;
    clearError();
    if (!draft.title.trim()) { showError(t('exam.errTitle')); return; }
    if (!draft.classId) { showError(t('exam.errClass')); return; }
    if (!(draft.durationMin >= 1 && draft.durationMin <= 180)) { showError(t('exam.errDuration')); return; }
    if (!draft.questionIds.length && !draft.pending.length) { showError(t('exam.errQuestions')); return; }
    if (draft.startAt && draft.endAt && new Date(draft.endAt) <= new Date(draft.startAt)) {
      showError(t('exam.errSchedule')); return;
    }

    var payload = {
      title: draft.title,
      titleEn: draft.titleEn,
      classId: draft.classId,
      durationMin: draft.durationMin,
      startAt: draft.startAt ? new Date(draft.startAt).toISOString() : '',
      endAt: draft.endAt ? new Date(draft.endAt).toISOString() : '',
      published: draft.published,
      questionIds: draft.questionIds.slice(),
      pendingQuestions: draft.pending.slice()
    };

    var res = draft.id ? store.updateExam(draft.id, payload) : store.createExam(payload);
    state.editingExam = null;
    state.examDraft = null;
    state.editorDraft = {};
    state.pendingEditIndex = null;
    toast(t('exam.saved'));
    if (draft.published && draft.pending.length) toast(t('exam.materialized', { n: num(draft.pending.length) }));
    render();
    return res;
  }

  function handleClassSubmit(form) {
    var grade = form.querySelector('[data-f="grade"]').value;
    var major = form.querySelector('[data-f="major"]').value;
    clearError();
    if (!grade) { showError(t('class.errGrade')); return; }
    var res = state.editingClass === 'new' ? store.createClass({ grade: grade, major: major }) : store.updateClass(state.editingClass, { grade: grade, major: major });
    if (!res.ok) { showError(t(res.error === 'protected' ? 'class.protected' : 'class.notEmpty')); return; }
    state.editingClass = null;
    toast(t('class.saved'));
    render();
  }

  function handleStudentSubmit(form) {
    var data = {
      name: form.querySelector('[data-f="name"]').value.trim(),
      username: form.querySelector('[data-f="username"]').value.trim(),
      password: form.querySelector('[data-f="password"]').value,
      classId: form.querySelector('[data-f="classId"]').value
    };
    clearError();
    if (!data.name) { showError(t('student.errName')); return; }
    if (data.username.length < 3) { showError(t('student.errUsername')); return; }

    var res;
    if (state.editingStudent === 'new') {
      if (data.password.length < 4) { showError(t('student.errPassword')); return; }
      res = store.createStudent(data);
    } else {
      res = store.updateStudent(state.editingStudent, data);
    }
    if (!res.ok) { showError(t('student.exists')); return; }
    state.editingStudent = null;
    toast(t('student.saved'));
    render();
  }

  function handleAdminSubmit(form) {
    var data = {
      name: form.querySelector('[data-f="name"]').value.trim(),
      username: form.querySelector('[data-f="username"]').value.trim(),
      password: form.querySelector('[data-f="password"]').value
    };
    clearError();
    if (!data.name) { showError(t('student.errName')); return; }
    if (data.username.length < 3) { showError(t('student.errUsername')); return; }

    var res;
    if (state.editingAdmin === 'new') {
      if (data.password.length < 4) { showError(t('student.errPassword')); return; }
      res = store.createAdmin(data);
    } else {
      res = store.updateAdmin(state.editingAdmin, data);
    }
    if (!res.ok) { showError(t('student.exists')); return; }
    state.editingAdmin = null;
    toast(t('admins.saved'));
    render();
  }

  /* ---------------- کارنامه: تحلیل هوش مصنوعی ---------------- */

  function readAiInputs() {
    function get(name) {
      var el = document.querySelector('[data-setting="' + name + '"]');
      return el ? el.value.trim() : '';
    }
    return ai.normalizeConfig({
      baseUrl: get('ai-baseUrl'),
      apiKey: get('ai-apiKey'),
      model: get('ai-model')
    });
  }

  function aiHintFor(res) {
    if (!res) return '';
    if (res.network) return res.error === 'timeout' ? t('ai.hintTimeout') : t('ai.hintNetwork');
    if (res.status === 401 || res.status === 403) return t('ai.hint401');
    if (res.status === 402) return t('ai.hint402');
    if (res.status === 404) return t('ai.hint404');
    if (res.status === 429) return t('ai.hint429');
    return '';
  }

  function aiHintForError(message) {
    var msg = String(message || '');
    if (/Failed to fetch|NetworkError|load failed|timeout/i.test(msg)) {
      return /timeout/i.test(msg) ? t('ai.hintTimeout') : t('ai.hintNetwork');
    }
    if (/\b401\b|\b403\b/.test(msg)) return t('ai.hint401');
    if (/\b402\b/.test(msg)) return t('ai.hint402');
    if (/\b404\b/.test(msg)) return t('ai.hint404');
    if (/\b429\b/.test(msg)) return t('ai.hint429');
    return '';
  }

  function showAiStatus(kind, main, hint, meta) {
    var el = document.getElementById('ai-status');
    if (!el) return;
    el.hidden = false;
    el.className = 'ai-status' + (kind === 'ok' ? ' is-ok' : ' is-err');
    el.innerHTML = '<span class="ai-status-main">' + esc(main) + '</span>' +
      (hint ? '<span class="ai-status-hint">' + esc(hint) + '</span>' : '') +
      (meta ? '<code class="ai-status-meta">' + esc(meta) + '</code>' : '');
  }

  function runAi(attemptId) {
    var data = report.build(attemptId);
    if (!data) return;
    var viewer = store.currentUser();
    if (!viewer || viewer.role !== 'student' || data.attempt.userId !== viewer.id) return;
    var key = aiKeyFor(attemptId, viewer);
    state.ai = emptyAiState();
    state.ai.key = key;
    state.ai.attemptId = attemptId;
    state.ai.busy = true;
    render();
    ai.analyze(data, store.getSettings()).then(function (res) {
      state.ai = emptyAiState();
      state.ai.key = key;
      state.ai.attemptId = attemptId;
      state.ai.text = res.text;
      state.ai.source = res.source;
      state.ai.error = res.error || '';
      render();
    }).catch(function (err) {
      state.ai = emptyAiState();
      state.ai.key = key;
      state.ai.attemptId = attemptId;
      state.ai.error = err.message || String(err);
      render();
    });
  }

  function sendAiAsk() {
    var user = store.currentUser();
    if (!user) return;
    var input = document.getElementById('ai-ask-input');
    var text = input ? String(input.value || '').trim() : '';
    var imgEl = document.querySelector('[data-img="ai-ask"]');
    var image = imgEl ? String(imgEl.value || '') : '';
    if (!text && !image) return;

    var history = store.getAiChat(user.id);
    store.pushAiChat(user.id, { role: 'user', text: text, image: image });
    state.aiAskBusy = true;
    render();

    var cls = store.getClass(user.classId || store.OTHER_CLASS_ID);
    var grade = cls && store.gradeInfo(cls.grade) ? store.gradeInfo(cls.grade).fa : '';
    ai.tutor(text, store.getSettings(), {
      student: { name: user.name, grade: grade },
      history: history,
      image: image
    }).then(function (res) {
      state.aiAskBusy = false;
      if (res.ok) {
        store.pushAiChat(user.id, { role: 'assistant', text: res.text, imageIgnored: !!res.imageIgnored });
      } else {
        store.pushAiChat(user.id, {
          role: 'assistant',
          error: true,
          text: t('ai.chatError', { msg: res.error === 'not-configured' ? t('ai.needConnect') : res.error })
        });
      }
      render();
      var box = document.getElementById('ai-ask-chat');
      if (box) box.scrollTop = box.scrollHeight;
    });
  }

  function sendAiMessage() {
    var input = document.getElementById('ai-input');
    if (!input || !state.ai.attemptId || !state.ai.key) return;
    var text = String(input.value || '').trim();
    if (!text) return;
    var data = report.build(state.ai.attemptId);
    var viewer = store.currentUser();
    if (!data || !viewer || viewer.role !== 'student' || data.attempt.userId !== viewer.id) return;

    state.ai.chat.push({ role: 'user', text: text });

    /* حریم موضوعی: بیرون از درس، پاسخ به سرویس فرستاده نمی‌شود */
    if (ai.isOffTopic(text)) {
      state.ai.chat.push({ role: 'assistant', text: ai.offTopicReply(data), blocked: true });
      render();
      var blockedBox = document.getElementById('ai-chat');
      if (blockedBox) blockedBox.scrollTop = blockedBox.scrollHeight;
      return;
    }

    state.ai.chatBusy = true;
    render();

    var firstAnalysis = state.ai.source === 'ai' ? state.ai.text : '';
    ai.chat(data, store.getSettings(), state.ai.chat, firstAnalysis).then(function (res) {
      state.ai.chatBusy = false;
      if (res.ok) {
        state.ai.chat.push({ role: 'assistant', text: res.text });
      } else {
        var msg = res.error === 'not-configured' ? t('ai.needConnect') : res.error;
        state.ai.chat.push({ role: 'assistant', text: t('ai.chatError', { msg: msg }), error: true });
      }
      render();
      var box = document.getElementById('ai-chat');
      if (box) box.scrollTop = box.scrollHeight;
    });
  }

  /* ---------------- پروفایل کاربر ---------------- */

  function openProfileModal() {
    var me = store.currentUser();
    if (!me) return;
    openModal({
      title: t('profile.title'),
      bodyHtml: '<p class="muted small profile-hint">' + esc(t('profile.subtitle')) + '</p>' +
        '<div class="field"><label for="profile-username">' + esc(t('profile.username')) + '</label>' +
          '<input id="profile-username" dir="ltr" autocomplete="username" value="' + esc(me.username) + '" /></div>' +
        '<div class="grid-2 profile-pass">' +
          '<div class="field"><label for="profile-pass">' + esc(t('profile.newPass')) + '</label>' +
            '<input id="profile-pass" type="password" dir="ltr" autocomplete="new-password" placeholder="' + esc(t('profile.passHint')) + '" /></div>' +
          '<div class="field"><label for="profile-pass2">' + esc(t('profile.confirmPass')) + '</label>' +
            '<input id="profile-pass2" type="password" dir="ltr" autocomplete="new-password" placeholder="' + esc(t('profile.passHint')) + '" /></div>' +
        '</div>' +
        '<p class="form-error" id="profile-error" hidden></p>',
      confirmText: t('common.save'),
      onConfirm: function () {
        var usernameEl = document.getElementById('profile-username');
        var passEl = document.getElementById('profile-pass');
        var pass2El = document.getElementById('profile-pass2');
        if (!usernameEl || !passEl || !pass2El) return true;

        var username = usernameEl.value.trim();
        var pass = passEl.value;
        var pass2 = pass2El.value;

        if ((pass || pass2) && pass !== pass2) {
          showError(t('profile.passMismatch'), 'profile-error');
          return false;
        }

        var res = store.updateUserProfile({ username: username, password: pass, confirm: pass2 });
        if (!res.ok) {
          var messages = {
            exists: t('profile.usernameExists'),
            short: t('profile.usernameShort'),
            invalid: t('profile.usernameInvalid'),
            weak: t('profile.passShort'),
            mismatch: t('profile.passMismatch'),
            empty: t('profile.nothingChanged'),
            'not-found': t('auth.errInvalid')
          };
          showError(messages[res.error] || t('profile.savedFail'), 'profile-error');
          return false;
        }

        toast(t('profile.saved'));
        render();
        return true;
      }
    });
  }

  /* ---------------- منوی موبایل ---------------- */

  function setMobileMenu(open) {
    var menu = document.getElementById('mobile-menu');
    var btn = document.querySelector('[data-action="toggle-mobile-menu"]');
    var backdrop = document.querySelector('.mobile-menu-backdrop');
    document.body.classList.toggle('menu-open', !!open);
    if (menu) {
      menu.classList.toggle('is-open', !!open);
      menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    }
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (backdrop) backdrop.classList.toggle('is-visible', !!open);
  }

  function closeMobileMenu() { setMobileMenu(false); }
  function toggleMobileMenu() { setMobileMenu(!document.body.classList.contains('menu-open')); }

  function openAiSettings() {
    var settings = store.getSettings();
    openModal({
      title: t('ai.connect'),
      bodyHtml: '<div class="field"><label>' + esc(t('ai.baseUrl')) + '</label><input id="ai-base" dir="ltr" value="' + esc(settings.ai.baseUrl) + '" placeholder="https://openrouter.ai/api/v1" /></div>' +
        '<div class="field"><label>' + esc(t('ai.apiKey')) + '</label><input id="ai-key" dir="ltr" type="password" value="' + esc(settings.ai.apiKey) + '" /></div>' +
        '<div class="field"><label>' + esc(t('ai.model')) + '</label><input id="ai-model" dir="ltr" value="' + esc(settings.ai.model) + '" placeholder="deepseek-chat" /></div>' +
        '<p class="muted small">' + esc(t('ai.hintKey')) + '</p>',
      confirmText: t('common.save'),
      onConfirm: function () {
        var base = document.getElementById('ai-base').value.trim();
        var key = document.getElementById('ai-key').value.trim();
        var model = document.getElementById('ai-model').value.trim();
        store.updateSettings({ ai: { baseUrl: base, apiKey: key, model: model } });
        toast(t('ai.saved'));
        render();
      }
    });
  }

  /* ---------------- رویدادها ---------------- */

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form) return;
    if (form.id) {
      e.preventDefault();
      if (form.id === 'login-form') return handleLogin(form);
      if (form.id === 'question-form') return handleQuestionSubmit(form);
      if (form.id === 'exam-form') return handleExamSubmit(form);
      if (form.id === 'class-form') return handleClassSubmit(form);
      if (form.id === 'student-form') return handleStudentSubmit(form);
      if (form.id === 'admin-form') return handleAdminSubmit(form);
      if (form.id === 'inquiry-form') return handleInquirySubmit(form);
    }
  });

  document.addEventListener('click', function (e) {
    /* لینک‌های منوی موبایل: منو بسته شود */
    if (e.target.closest && e.target.closest('#mobile-menu a')) setMobileMenu(false);

    /* عکس‌ها: بزرگ‌نمایی با کلیک (به‌جز داخل آزمون) */
    if (e.target && e.target.tagName === 'IMG' && e.target.closest('#app') && !(state.quiz && parseHash().name === 'exam')) {
      openImage(e.target.getAttribute('src'), e.target.getAttribute('alt'));
      return;
    }
    var target = e.target.closest('[data-action]');
    if (!target) return;
    var action = target.getAttribute('data-action');
    var id = target.getAttribute('data-id');

    switch (action) {
      case 'toggle-lang': i18n.setLang(i18n.lang === 'fa' ? 'en' : 'fa'); render(); break;
      case 'toggle-theme': applyTheme(currentTheme() === 'dark' ? 'light' : 'dark'); render(); break;
      case 'open-profile': closeMobileMenu(); openProfileModal(); break;
      case 'toggle-mobile-menu': toggleMobileMenu(); break;
      case 'close-mobile-menu': closeMobileMenu(); break;
      case 'logout': store.logout(); state.quiz = null; state.ai = emptyAiState(); state.pendingEditIndex = null; stopTimer(); detachSecurity(); navigate('login'); toast(t('auth.loggedOut')); render(); break;

      case 'start-exam': startExam(id); break;

      case 'share-screen':
        setLoadingText(t('quiz.shareAsking'));
        security.startScreen().then(function (res) {
          if (res && res.ok) toast(t('quiz.shareOn'));
          else toast(t('quiz.shareDenied'), 'bad');
          render();
        });
        break;

      case 'exit-exam':
        e.preventDefault();
        openModal({
          title: t('quiz.exitTitle'), body: t('quiz.exitBody'), confirmText: t('quiz.exitYes'),
          onConfirm: function () { persistAnswers(); navigate('dashboard'); }
        });
        break;

      case 'quiz-prev': if (state.quiz && state.quiz.index > 0) { state.quiz.index--; render(); } break;
      case 'quiz-next': if (state.quiz && state.quiz.index < state.quiz.questions.length - 1) { state.quiz.index++; render(); } break;
      case 'quiz-goto': {
        var idx = Number(target.getAttribute('data-i'));
        if (state.quiz && isFinite(idx)) { state.quiz.index = idx; render(); }
        break;
      }
      case 'quiz-mark': {
        var q = currentQuestion();
        if (state.quiz && q) {
          if (state.quiz.marked[q.id]) delete state.quiz.marked[q.id];
          else state.quiz.marked[q.id] = true;
          render();
        }
        break;
      }
      case 'quiz-clear': {
        var cur = currentQuestion();
        if (state.quiz && cur) {
          delete state.quiz.answers[cur.id];
          persistAnswers();
          syncQuizUI();
        }
        break;
      }
      case 'quiz-submit': {
        var answered = state.quiz ? logic.answeredCount(state.quiz.questions, state.quiz.answers) : 0;
        var total = state.quiz ? state.quiz.questions.length : 0;
        openModal({
          title: t('quiz.confirmTitle'),
          body: t('quiz.confirmBody', { a: num(answered), b: num(total) }),
          confirmText: t('quiz.confirmYes'),
          onConfirm: function () { submitQuiz(false); }
        });
        break;
      }

      case 'focus-question': {
        var n = Number(target.getAttribute('data-index'));
        var el = document.getElementById('rq-' + n);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      }

      case 'question-new': state.editorDraft = {}; state.editingQuestion = 'new'; render(); break;
      case 'question-edit': state.editorDraft = {}; state.editingQuestion = id; render(); break;
      case 'question-cancel': state.editorDraft = {}; state.editingQuestion = null; render(); break;
      case 'question-delete':
        openModal({
          title: t('common.delete'), body: t('qbank.confirmDelete'), confirmText: t('common.delete'), danger: true,
          onConfirm: function () { store.removeQuestion(id); toast(t('qbank.deleted')); render(); }
        });
        break;

      case 'exam-new': state.editingExam = 'new'; state.examDraft = null; state.editorDraft = {}; state.examMode = 'bank'; state.pendingEditIndex = null; render(); break;
      case 'exam-edit': state.editingExam = id; state.examDraft = null; state.editorDraft = {}; state.examMode = 'bank'; state.pendingEditIndex = null; render(); break;
      case 'exam-cancel': state.editingExam = null; state.examDraft = null; state.pendingEditIndex = null; render(); break;
      case 'exam-mode': {
        syncExamDraft();
        state.examMode = target.getAttribute('data-mode');
        render();
        break;
      }
      case 'exam-publish':
        store.setExamPublished(id, !store.getExam(id).published);
        toast(t('exam.saved'));
        render();
        break;
      case 'exam-delete':
        openModal({
          title: t('common.delete'), body: t('exam.confirmDelete'), confirmText: t('common.delete'), danger: true,
          onConfirm: function () { store.removeExam(id); toast(t('exam.deleted')); render(); }
        });
        break;
      case 'pick-question': {
        syncExamDraft();
        var qid = target.getAttribute('data-id');
        var draft = state.examDraft;
        var pos = draft.questionIds.indexOf(qid);
        if (target.checked && pos === -1) draft.questionIds.push(qid);
        if (!target.checked && pos !== -1) draft.questionIds.splice(pos, 1);
        render();
        break;
      }
      case 'remove-selected': {
        syncExamDraft();
        state.examDraft.questionIds = state.examDraft.questionIds.filter(function (x) { return x !== id; });
        render();
        break;
      }
      case 'remove-pending': {
        syncExamDraft();
        var rpIndex = Number(target.getAttribute('data-index'));
        state.examDraft.pending.splice(rpIndex, 1);
        if (state.pendingEditIndex === rpIndex) {
          state.pendingEditIndex = null;
          state.editorDraft.exam = blankDraft(4);
        } else if (state.pendingEditIndex !== null && rpIndex < state.pendingEditIndex) {
          state.pendingEditIndex -= 1;
        }
        render();
        break;
      }
      case 'add-pending': {
        var pdraft = readEditor('exam');
        var pv = validateDraft(pdraft);
        if (!pv.ok) { toast(pv.error, 'bad'); break; }
        syncExamDraft();
        if (state.pendingEditIndex !== null && state.pendingEditIndex !== undefined &&
            state.examDraft.pending[state.pendingEditIndex]) {
          state.examDraft.pending[state.pendingEditIndex] = pdraft;
          state.pendingEditIndex = null;
          toast(t('exam.pendingUpdated'));
        } else {
          state.examDraft.pending.push(pdraft);
          toast(t('common.add'));
        }
        state.editorDraft.exam = blankDraft(pdraft.options.length || 4);
        render();
        break;
      }
      case 'edit-pending': {
        syncExamDraft();
        var pi = Number(target.getAttribute('data-index'));
        var pendingItem = state.examDraft && state.examDraft.pending[pi];
        if (pendingItem) {
          state.editorDraft.exam = draftFromQuestion(pendingItem);
          state.pendingEditIndex = pi;
          state.examMode = 'new';
          render();
        }
        break;
      }
      case 'cancel-pending-edit': {
        syncExamDraft();
        state.pendingEditIndex = null;
        state.editorDraft.exam = blankDraft(4);
        render();
        break;
      }

      case 'class-new': state.editingClass = 'new'; render(); break;
      case 'class-edit': state.editingClass = id; render(); break;
      case 'class-cancel': state.editingClass = null; render(); break;
      case 'toggle-class':
        state.expandedClass = state.expandedClass === id ? null : id;
        render();
        break;
      case 'class-delete':
        openModal({
          title: t('common.delete'), body: t('class.confirmDelete'), confirmText: t('common.delete'), danger: true,
          onConfirm: function () {
            var res = store.removeClass(id);
            if (!res.ok) { toast(t(res.error === 'protected' ? 'class.protected' : 'class.notEmpty'), 'bad'); return; }
            toast(t('class.deleted'));
            render();
          }
        });
        break;

      case 'student-new': state.editingStudent = 'new'; render(); break;
      case 'student-edit': state.editingStudent = id; render(); break;
      case 'student-cancel': state.editingStudent = null; render(); break;
      case 'student-delete':
        openModal({
          title: t('common.delete'), body: t('student.confirmDelete'), confirmText: t('common.delete'), danger: true,
          onConfirm: function () { store.removeUser(id); toast(t('student.deleted')); render(); }
        });
        break;

      case 'admin-new': state.editingAdmin = 'new'; render(); break;
      case 'admin-edit': state.editingAdmin = id; render(); break;
      case 'admin-cancel': state.editingAdmin = null; render(); break;
      case 'admin-delete':
        openModal({
          title: t('common.delete'), body: t('admins.confirmDelete'), confirmText: t('common.delete'), danger: true,
          onConfirm: function () {
            var res = store.removeUser(id);
            if (!res.ok) { toast(t('admins.lastAdmin'), 'bad'); return; }
            toast(t('admins.deleted'));
            render();
          }
        });
        break;

      case 'save-ai': {
        var savedCfg = readAiInputs();
        store.updateSettings({ ai: savedCfg });
        showAiStatus('ok', t('ai.saved'), '', savedCfg.baseUrl + ' · ' + savedCfg.model);
        toast(t('ai.saved'));
        break;
      }
      case 'ai-preset': {
        var baseInput = document.querySelector('[data-setting="ai-baseUrl"]');
        var modelInput = document.querySelector('[data-setting="ai-model"]');
        if (baseInput) baseInput.value = 'https://api.deepseek.com/v1';
        if (modelInput) modelInput.value = 'deepseek-chat';
        showAiStatus('ok', t('ai.presetDone'), '', '');
        break;
      }
      case 'ai-test': {
        var cfg = readAiInputs();
        if (!cfg.baseUrl || !cfg.apiKey || !cfg.model) {
          showAiStatus('err', t('ai.incomplete'), '', '');
          toast(t('ai.incomplete'), 'bad');
          break;
        }
        showAiStatus('ok', t('ai.testing'), '', cfg.baseUrl + ' · ' + cfg.model);
        ai.testConnection(cfg).then(function (res) {
          if (res.ok) {
            store.updateSettings({ ai: cfg });
            showAiStatus('ok', t('ai.testOk'), '', (res.url || '') + ' · ' + (res.model || ''));
            toast(t('ai.testOk'));
          } else {
            var msg = res.error === 'incomplete' ? t('ai.incomplete') : res.error;
            showAiStatus('err', t('ai.testFail', { msg: msg }), aiHintFor(res),
              (res.url || '') + ' · ' + (res.model || '') + (res.body ? ' · ' + res.body.slice(0, 220) : ''));
            toast(t('ai.testFail', { msg: msg }), 'bad');
          }
        });
        break;
      }
      case 'save-security':
        store.updateSettings({ security: { camera: document.querySelector('[data-setting="camera"]').checked } });
        toast(t('admins.securitySaved'));
        render();
        break;
      case 'db-test': {
        var dbStatus = document.getElementById('db-status');
        if (dbStatus) { dbStatus.hidden = false; dbStatus.textContent = t('db.testing'); }
        store.dbHealth().then(function (res) {
          var el = document.getElementById('db-status');
          if (!el) return;
          el.hidden = false;
          if (res.offline) {
            el.textContent = t('db.fail', { msg: res.error || 'client' });
            return;
          }
          var names = Object.keys(res.tables || {});
          var allOk = names.every(function (k) { return res.tables[k] === 'ok'; });
          var lines = names.map(function (k) {
            return k + ': ' + (res.tables[k] === 'ok' ? t('db.tableOk') : res.tables[k]);
          });
          el.textContent = (allOk ? t('db.ok') : t('db.fail', { msg: '' })) + '\n' + lines.join('\n');
        });
        break;
      }
      case 'save-coefficients': {        var patch = {};
        var coefInputs = document.querySelectorAll('[data-coef]');
        for (var ci = 0; ci < coefInputs.length; ci++) {
          var attr = coefInputs[ci].getAttribute('data-coef');
          var sep = attr.indexOf('|');
          if (sep < 0) continue;
          var majorKey = attr.slice(0, sep);
          var subjectName = attr.slice(sep + 1);
          var numVal = Number(coefInputs[ci].value);
          if (!isFinite(numVal)) continue;
          patch[majorKey] = patch[majorKey] || {};
          patch[majorKey][subjectName] = Math.max(0, Math.min(10, Math.round(numVal)));
        }
        store.updateSettings({ coefficients: patch });
        toast(t('admins.coefSaved'));
        render();
        break;
      }
      case 'reset-demo':
        openModal({
          title: t('admins.resetDemo'), body: t('admins.confirmReset'), confirmText: t('common.yes'), danger: true,
          onConfirm: function () { store.resetAll(); state.quiz = null; navigate('login'); render(); }
        });
        break;

      case 'open-date': {
        var dateField = target.getAttribute('data-field');
        var dateHidden = document.querySelector('[data-f="' + dateField + '"]');
        var dateWrap = target.closest('.dt-field');
        AZ.picker.open(target, dateHidden ? dateHidden.value : '', function (iso) {
          if (dateHidden) dateHidden.value = iso;
          var valueEl = dateWrap ? dateWrap.querySelector('.dt-value') : null;
          var clearEl = dateWrap ? dateWrap.querySelector('.dt-clear') : null;
          if (valueEl) valueEl.textContent = iso ? jalaliText(iso) : t('exam.pickDateTime');
          if (clearEl) clearEl.hidden = !iso;
          target.classList.toggle('is-empty', !iso);
          if (state.examDraft) state.examDraft[dateField] = iso;
        });
        break;
      }
      case 'clear-date': {
        var fieldName = target.getAttribute('data-field');
        var hiddenField = document.querySelector('[data-f="' + fieldName + '"]');
        if (hiddenField) hiddenField.value = '';
        var wrapEl = target.closest('.dt-field');
        var btnEl = wrapEl ? wrapEl.querySelector('.dt-btn') : null;
        var valEl = wrapEl ? wrapEl.querySelector('.dt-value') : null;
        if (valEl) valEl.textContent = t('exam.pickDateTime');
        if (btnEl) btnEl.classList.add('is-empty');
        target.hidden = true;
        if (state.examDraft) state.examDraft[fieldName] = '';
        break;
      }

      case 'clear-image': {        var tgt = target.getAttribute('data-target');
        var hidden = document.querySelector('[data-img="' + tgt + '"]');
        var preview = document.querySelector('[data-img-preview="' + tgt + '"]');
        if (hidden) hidden.value = '';
        if (preview) { preview.src = ''; preview.hidden = true; }
        break;
      }

      case 'csv-exam': {
        var ex = report.csvExam(id);
        download(ex.filename, ex.content);
        break;
      }
      case 'csv-class': {
        var cl = report.csvClass(id);
        download(cl.filename, cl.content);
        break;
      }
      case 'csv-student': {
        var st = report.csvStudent(id);
        download(st.filename, st.content);
        break;
      }

      case 'ai-run': runAi(id); break;
      case 'ai-send': sendAiMessage(); break;
      case 'ai-settings': openAiSettings(); break;

      case 'inquiry-reply': {
        var replyInput = document.getElementById('reply-' + id);
        var replyText = replyInput ? String(replyInput.value || '').trim() : '';
        var replyImgEl = document.querySelector('[data-img="reply-img-' + id + '"]');
        var replyImg = replyImgEl ? String(replyImgEl.value || '') : '';
        if (!replyText && !replyImg) break;
        var replyRes = store.addInquiryReply(id, { byUserId: store.currentUser().id, text: replyText, image: replyImg });
        if (replyRes.ok) { toast(t('inquiry.answered')); render(); }
        break;
      }
      case 'inquiry-tab':
        state.inquiryTab = target.getAttribute('data-tab') === 'teacher' ? 'teacher' : 'ai';
        render();
        break;
      case 'ai-ask': sendAiAsk(); break;
      case 'ai-ask-clear':
        store.clearAiChat(store.currentUser().id);
        state.aiAskBusy = false;
        render();
        break;
      case 'inquiry-followup': {
        var followInput = document.getElementById('follow-' + id);
        var followText = followInput ? String(followInput.value || '').trim() : '';
        if (!followText) break;
        var followRes = store.addInquiryReply(id, { byUserId: store.currentUser().id, text: followText });
        if (followRes.ok) { toast(t('inquiry.sent')); render(); }
        break;
      }
      case 'inquiry-close':
        store.setInquiryStatus(id, 'closed');
        toast(t('inquiry.closed'));
        render();
        break;
      case 'inquiry-delete':
        openModal({
          title: t('common.delete'), body: t('inquiry.confirmDelete'), confirmText: t('common.delete'), danger: true,
          onConfirm: function () { store.removeInquiry(id); toast(t('inquiry.deleted')); render(); }
        });
        break;

      default: break;
    }
  });

  /* انتخاب گزینه در آزمون */
  document.addEventListener('change', function (e) {
    var input = e.target;

    if (input.type === 'file' && input.getAttribute('data-img-file')) {
      var targetName = input.getAttribute('data-img-file');
      var file = input.files && input.files[0];
      if (!file) return;
      compressImage(file).then(function (dataUrl) {
        var hidden = document.querySelector('[data-img="' + targetName + '"]');
        var preview = document.querySelector('[data-img-preview="' + targetName + '"]');
        if (hidden) hidden.value = dataUrl;
        if (preview) { preview.src = dataUrl; preview.hidden = false; }
      }).catch(function () { toast(t('qbank.errImage'), 'bad'); });
      return;
    }

    if (input.type === 'radio' && input.name === 'opt' && state.quiz) {
      var q = currentQuestion();
      if (!q) return;
      state.quiz.answers[q.id] = Number(input.value);
      persistAnswers();
      syncQuizUI();
      return;
    }

    var action = input.getAttribute('data-action');

    if (action === 'option-count') {
      var prefix = input.getAttribute('data-prefix');
      var draft = readEditor(prefix);
      var count = Number(input.value);
      var opts = draft.options.slice(0, count);
      while (opts.length < count) opts.push({ text: '', textEn: '', image: '' });
      draft.options = opts;
      if (draft.correct >= count) draft.correct = 0;
      if (prefix === 'exam') {
        state.editorDraft.exam = draft;
        render();
      } else {
        state.editorDraft.bank = draft;
        state.editorDraft[prefix] = draft;
        if (state.editingQuestion) render();
      }
      return;
    }

    if (action === 'bank-filter-subject') { state.bankFilter.subject = input.value; render(); return; }
    if (action === 'bank-search') { state.bankFilter.search = input.value; render(); return; }
    if (action === 'exam-bank-search') { syncExamDraft(); state.examDraft.bankSearch = input.value; render(); return; }
    if (action === 'student-filter-class') { state.studentFilter.classId = input.value; render(); return; }
    if (action === 'student-search') { state.studentFilter.search = input.value; render(); return; }
    if (action === 'inquiry-filter') { state.inquiryFilter = input.value; render(); return; }

    if (action === 'class-grade') {
      var form = input.form;
      var major = form.querySelector('[data-f="major"]');
      var grade = input.value;
      major.disabled = !(Number(grade) >= 10);
      var names = store.classNames(grade, major.value);
      var preview = form.querySelector('[data-preview="class-name"]');
      if (preview) preview.textContent = i18n.lang === 'fa' ? names.name : names.nameEn;
      return;
    }
    if (action === 'class-major') {
      var f = input.form;
      var g = f.querySelector('[data-f="grade"]').value;
      var nm = store.classNames(g, input.value);
      var p = f.querySelector('[data-preview="class-name"]');
      if (p) p.textContent = i18n.lang === 'fa' ? nm.name : nm.nameEn;
      return;
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modalRoot.firstChild) closeModal();
    if (e.key === 'Escape' && document.body.classList.contains('menu-open')) closeMobileMenu();
    if (e.key === 'Enter' && e.target && e.target.id === 'ai-input') {
      e.preventDefault();
      sendAiMessage();
    }
    if (e.key === 'Enter' && e.target && e.target.id === 'ai-ask-input') {
      e.preventDefault();
      sendAiAsk();
    }
  });

  window.addEventListener('hashchange', function () {
    closeMobileMenu();
    render();
    if (parseHash().name !== 'exam') stopTimer();
  });

  /* ---------------- شروع ---------------- */

  async function boot() {
    i18n.init();
    var theme = 'light';
    try { theme = localStorage.getItem(THEME_KEY) || 'light'; } catch (e) { /* ignore */ }
    applyTheme(theme);
    if (i18n.checkKeys) i18n.checkKeys();

    var hadCache = false;
    try { hadCache = !!localStorage.getItem(store.DB_KEY); } catch (e) { /* ignore */ }

    /* لایه داده با الگوی Stale-While-Revalidate:
       اگر کش مرورگر موجود باشد، فوراً برمی‌گردد و تازه‌سازی در پس‌زمینه انجام می‌شود. */
    try {
      if (store.boot) await store.boot();
    } catch (e) {
      console.error('boot: store.boot failed', e);
    }

    if (!location.hash) location.hash = store.currentUser() ? '#/dashboard' : '#/login';
    render();

    /* فقط وقتی برای اولین بار کشی نداریم و اتصال هم برقرار نشد، هشدار بده */
    if (!hadCache && store.isOnline && !store.isOnline()) {
      toast(t('db.offlineNote'), 'bad');
    }

    /* وقتی دادهٔ تازه از سرور رسید، صفحه بدون رفرش و بدون صفحهٔ سفید نرم به‌روز می‌شود */
    window.addEventListener('az-store-synced', function () {
      if (state.quiz) return;
      if (parseHash().name === 'exam') return;
      var active = document.activeElement;
      if (active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName) && active.closest && active.closest('#app')) {
        return; /* وسط تایپ کاربر، فرم را از دستش نگیر */
      }
      render();
    });
  }

  window.AZ.app = { render: render, navigate: navigate, state: state };
  window.AZ.ready = boot();

  if (AZ.__exposeForTests) {
    AZ.__test = {
      viewAuth: viewAuth,
      viewStudentDashboard: viewStudentDashboard,
      viewAdminDashboard: viewAdminDashboard,
      viewQuiz: viewQuiz,
      viewResult: viewResult,
      viewStudentHistory: viewStudentHistory,
      viewAdmin: viewAdmin,
      viewAdminReports: viewAdminReports,
      viewExamReport: viewExamReport,
      viewClassReport: viewClassReport,
      viewStudentDetail: viewStudentDetail,
      viewStudentInquiries: viewStudentInquiries,
      viewAdminInquiries: viewAdminInquiries,
      handleInquirySubmit: handleInquirySubmit,
      sendAiMessage: sendAiMessage,
      openProfileModal: openProfileModal,
      toggleMobileMenu: toggleMobileMenu,
      shell: shell,
      handleLogin: handleLogin,
      handleQuestionSubmit: handleQuestionSubmit,
      handleExamSubmit: handleExamSubmit,
      handleClassSubmit: handleClassSubmit,
      handleStudentSubmit: handleStudentSubmit,
      handleAdminSubmit: handleAdminSubmit,
      startExam: startExam,
      submitQuiz: submitQuiz,
      initQuiz: initQuiz,
      currentQuestion: currentQuestion,
      state: state,
      appEl: function () { return appEl; }
    };
  }
})();
