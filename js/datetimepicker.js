/* ============================================================
   آزمون‌یار — تقویم شمسی سفارشی (تاریخ + ساعت)
   AZ.picker.open(anchorEl, isoValue, onChange)
   ============================================================ */
(function () {
  'use strict';

  var AZ = window.AZ;
  var j = AZ.jalali;

  var root = null;
  var current = null;
  var docClickBound = false;

  function t(key, vars) { return AZ.i18n.t(key, vars); }
  function num(n) { return AZ.i18n.num(n); }
  function digits(s) { return AZ.i18n.lang === 'fa' ? j.faDigits(s) : String(s); }
  function plain(value) { return digits(String(value)); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function timeStr(hh, mi) { return digits(pad(hh) + ':' + pad(mi)); }

  function ensureRoot() {
    if (root && document.body.contains(root)) return root;
    root = document.getElementById('picker-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'picker-root';
      document.body.appendChild(root);
    }
    return root;
  }

  function monthName(jm) { return t('month.' + jm); }

  function navSvg(kind) {
    var rtl = AZ.i18n.lang === 'fa';
    var dir = kind.indexOf('prev') === 0 ? (rtl ? 'right' : 'left') : (rtl ? 'left' : 'right');
    var single = '<path d="' + (dir === 'right' ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6') + '"/>';
    var second = '<path d="' + (dir === 'right' ? 'M5.5 6l6 6-6 6' : 'M18.5 6l-6 6 6 6') + '"/>';
    return '<svg class="dtp-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
      'stroke-linecap="round" stroke-linejoin="round">' + single + (kind.indexOf('year') !== -1 ? second : '') + '</svg>';
  }

  function gridHtml() {
    var view = current.view;
    var firstWeekday = j.weekday(view.jy, view.jm, 1);
    var len = j.monthLength(view.jy, view.jm);
    var todayParts = j.today();
    var html = '';

    /* روزهای کم‌رنگ ماه قبل برای پرکردن ردیف اول */
    if (firstWeekday > 0) {
      var prevY = view.jm === 1 ? view.jy - 1 : view.jy;
      var prevM = view.jm === 1 ? 12 : view.jm - 1;
      var prevLen = j.monthLength(prevY, prevM);
      for (var b = 0; b < firstWeekday; b++) {
        html += '<span class="dtp-cell dtp-cell-muted">' + plain(prevLen - firstWeekday + 1 + b) + '</span>';
      }
    }

    for (var d = 1; d <= len; d++) {
      var wd = (firstWeekday + d - 1) % 7;
      var selected = current.sel && current.sel.jy === view.jy && current.sel.jm === view.jm && current.sel.jd === d;
      var isToday = todayParts.jy === view.jy && todayParts.jm === view.jm && todayParts.jd === d;
      html += '<button type="button" class="dtp-cell dtp-day' +
        (selected ? ' is-selected' : '') +
        (isToday ? ' is-today' : '') +
        (wd === 6 ? ' is-weekend' : '') +
        '" data-dtp="day" data-day="' + d + '">' + plain(d) + '</button>';
    }

    /* روزهای کم‌رنگ ماه بعد برای تکمیل ردیف آخر */
    var filled = firstWeekday + len;
    var rest = (7 - (filled % 7)) % 7;
    for (var a = 1; a <= rest; a++) {
      html += '<span class="dtp-cell dtp-cell-muted">' + plain(a) + '</span>';
    }

    return html;
  }

  function weekdaysHtml() {
    var out = '';
    for (var i = 0; i < 7; i++) out += '<span class="dtp-wd">' + t('wd.' + i) + '</span>';
    return out;
  }

  function timeOptions() {
    var hours = '';
    for (var h = 0; h < 24; h++) {
      hours += '<option value="' + h + '"' + (h === current.hh ? ' selected' : '') + '>' + digits(pad(h)) + '</option>';
    }
    var minutes = '';
    for (var m = 0; m < 60; m++) {
      minutes += '<option value="' + m + '"' + (m === current.mi ? ' selected' : '') + '>' + digits(pad(m)) + '</option>';
    }
    return { hours: hours, minutes: minutes };
  }

  function build() {
    var view = current.view;
    var sel = current.sel;
    var time = timeOptions();
    var selLabel = sel ? (plain(sel.jd) + ' ' + monthName(sel.jm) + ' ' + plain(sel.jy)) : t('exam.pickDateTime');

    return '<div class="dtp-backdrop" data-dtp="backdrop"></div>' +
      '<div class="dtp" role="dialog" aria-modal="true" aria-label="' + t('picker.title') + '">' +
        '<div class="dtp-head">' +
          '<div class="dtp-nav">' +
            '<button type="button" class="dtp-nav-btn" data-dtp="prev-year" title="' + t('picker.prevYear') + '">' + navSvg('prev-year') + '</button>' +
            '<button type="button" class="dtp-nav-btn" data-dtp="prev-month" title="' + t('picker.prevMonth') + '">' + navSvg('prev') + '</button>' +
          '</div>' +
          '<div class="dtp-title">' +
            '<strong>' + monthName(view.jm) + ' ' + plain(view.jy) + '</strong>' +
            '<small>' + selLabel + '</small>' +
          '</div>' +
          '<div class="dtp-nav">' +
            '<button type="button" class="dtp-nav-btn" data-dtp="next-month" title="' + t('picker.nextMonth') + '">' + navSvg('next') + '</button>' +
            '<button type="button" class="dtp-nav-btn" data-dtp="next-year" title="' + t('picker.nextYear') + '">' + navSvg('next-year') + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="dtp-weekdays">' + weekdaysHtml() + '</div>' +
        '<div class="dtp-grid">' + gridHtml() + '</div>' +
        '<div class="dtp-time">' +
          '<span class="dtp-time-label">' + t('picker.time') + '</span>' +
          '<select class="dtp-select" data-dtp="hour" aria-label="' + t('picker.hour') + '">' + time.hours + '</select>' +
          '<span class="dtp-colon">:</span>' +
          '<select class="dtp-select" data-dtp="minute" aria-label="' + t('picker.minute') + '">' + time.minutes + '</select>' +
        '</div>' +
        '<div class="dtp-foot">' +
          '<button type="button" class="btn btn-ghost btn-sm dtp-today-btn" data-dtp="today">' + t('picker.today') + '</button>' +
          '<button type="button" class="btn btn-ghost btn-sm danger" data-dtp="clear">' + t('picker.clear') + '</button>' +
          '<button type="button" class="btn btn-primary btn-sm" data-dtp="ok">' + t('picker.ok') + '</button>' +
        '</div>' +
      '</div>';
  }

  function position() {
    var box = root.querySelector('.dtp');
    if (!box || !current) return;
    var rect = current.anchor.getBoundingClientRect();
    var w = box.offsetWidth || 336;
    var h = box.offsetHeight || 440;
    var gap = 10;
    var viewportW = window.innerWidth;
    var viewportH = window.innerHeight;

    var spaceBelow = viewportH - rect.bottom - gap;
    var spaceAbove = rect.top - gap;
    var top;
    if (spaceBelow >= h || spaceBelow >= spaceAbove) top = rect.bottom + 8;
    else top = rect.top - h - 8;
    top = Math.max(gap, Math.min(top, Math.max(gap, viewportH - h - gap)));

    var left = AZ.i18n.lang === 'fa' ? rect.right - w : rect.left;
    left = Math.max(gap, Math.min(left, viewportW - w - gap));

    box.style.top = Math.round(top) + 'px';
    box.style.left = Math.round(left) + 'px';
  }

  function rerender(keepFocus) {
    if (!current) return;
    ensureRoot().innerHTML = build();
    position();
    if (keepFocus) {
      var selEl = root.querySelector('.dtp-day.is-selected');
      if (selEl) { try { selEl.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    }
  }

  function shiftMonth(delta) {
    var m = current.view.jm + delta;
    var y = current.view.jy;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    current.view = { jy: y, jm: m };
    rerender();
  }

  function shiftYear(delta) {
    current.view = { jy: current.view.jy + delta, jm: current.view.jm };
    rerender();
  }

  function apply(close) {
    if (!current) return;
    var sel = current.sel;
    if (!sel) { if (close) closePicker(); return; }
    var iso = j.toISO(sel.jy, sel.jm, sel.jd, current.hh, current.mi);
    var changed = iso !== current.lastIso;
    current.lastIso = iso;
    if (current.onChange && changed) current.onChange(iso);
    if (close) closePicker();
  }

  function selectDay(day) {
    current.sel = { jy: current.view.jy, jm: current.view.jm, jd: day };
    rerender();
    apply(false);
  }

  function goToday() {
    var todayParts = j.today();
    current.view = { jy: todayParts.jy, jm: todayParts.jm };
    current.sel = { jy: todayParts.jy, jm: todayParts.jm, jd: todayParts.jd };
    rerender();
    apply(false);
  }

  function clearPicker() {
    if (current && current.onChange) current.onChange('');
    closePicker();
  }

  function closePicker() {
    if (root) root.innerHTML = '';
    current = null;
    document.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('resize', position);
    window.removeEventListener('scroll', position, true);
  }

  function onKeyDown(e) {
    if (!current) return;
    if (e.key === 'Escape') { e.stopPropagation(); closePicker(); }
  }

  function onClick(e) {
    if (!current) return;
    var el = e.target.closest('[data-dtp]');
    if (!el) return;
    var act = el.getAttribute('data-dtp');

    if (act === 'backdrop') { closePicker(); return; }
    if (act === 'prev-month') { shiftMonth(-1); return; }
    if (act === 'next-month') { shiftMonth(1); return; }
    if (act === 'prev-year') { shiftYear(-1); return; }
    if (act === 'next-year') { shiftYear(1); return; }
    if (act === 'day') { selectDay(Number(el.getAttribute('data-day'))); return; }
    if (act === 'today') { goToday(); return; }
    if (act === 'clear') { clearPicker(); return; }
    if (act === 'ok') { apply(true); return; }
  }

  function onChange(e) {
    if (!current) return;
    var el = e.target;
    if (!el.getAttribute || !el.getAttribute('data-dtp')) return;
    var act = el.getAttribute('data-dtp');
    if (act === 'hour') { current.hh = Number(el.value) || 0; apply(false); }
    if (act === 'minute') { current.mi = Number(el.value) || 0; apply(false); }
  }

  function open(anchor, iso, onChangeFn) {
    closePicker();
    var parts = iso ? j.fromISO(iso) : null;
    var todayParts = j.today();
    current = {
      anchor: anchor,
      onChange: onChangeFn,
      view: { jy: parts ? parts.jy : todayParts.jy, jm: parts ? parts.jm : todayParts.jm },
      sel: parts
        ? { jy: parts.jy, jm: parts.jm, jd: parts.jd }
        : { jy: todayParts.jy, jm: todayParts.jm, jd: todayParts.jd },
      hh: parts ? parts.hh : 8,
      mi: parts ? parts.mi : 0,
      lastIso: iso || ''
    };
    rerender();
    var el = ensureRoot();
    el.addEventListener('click', onClick);
    el.addEventListener('change', onChange);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    position();
    setTimeout(position, 0);
  }

  window.AZ.picker = {
    open: open,
    close: closePicker,
    isOpen: function () { return !!current; }
  };
})();
