/* ============================================================
   آزمون‌یار — تبدیل و قالب‌بندی تاریخ شمسی (جلالی)
   الگوریتم استاندارد jalaali (بدون وابستگی)
   مرورگر: AZ.jalali   |   Node: module.exports
   ============================================================ */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.AZ = root.AZ || {};
    root.AZ.jalali = api;
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  function div(a, b) { return ~~(a / b); }
  function mod(a, b) { return a - ~~(a / b) * b; }

  var BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
    1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

  /** اطلاعات سال جلالی: کبیسه بودن و روز شروع از مارس */
  function jalCal(jy) {
    var bl = BREAKS.length;
    var gy = jy + 621;
    var leapJ = -14;
    var jp = BREAKS[0];
    var jump = 0;
    var jm;
    var i;

    for (i = 1; i < bl; i += 1) {
      jm = BREAKS[i];
      jump = jm - jp;
      if (jy < jm) break;
      leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
      jp = jm;
    }
    var n = jy - jp;
    leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
    if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

    var leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
    var march = 20 + leapJ - leapG;

    if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
    var leap = mod(mod(n + 1, 33) - 1, 4);
    if (leap === -1) leap = 4;

    return { leap: leap, gy: gy, march: march };
  }

  function g2d(gy, gm, gd) {
    var d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4)
      + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
    d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
    return d;
  }

  function d2g(jdn) {
    var j = 4 * jdn + 139361631;
    j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    var i = div(mod(j, 1461), 4) * 5 + 308;
    var gd = div(mod(i, 153), 5) + 1;
    var gm = mod(div(i, 153), 12) + 1;
    var gy = div(j, 1461) - 100100 + div(8 - gm, 6);
    return { gy: gy, gm: gm, gd: gd };
  }

  function j2d(jy, jm, jd) {
    var r = jalCal(jy);
    return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
  }

  function d2j(jdn) {
    var gy = d2g(jdn).gy;
    var jy = gy - 621;
    var r = jalCal(jy);
    var jdn1f = g2d(gy, 3, r.march);
    var jd;
    var jm;
    var k = jdn - jdn1f;

    if (k >= 0) {
      if (k <= 185) {
        jm = 1 + div(k, 31);
        jd = mod(k, 31) + 1;
        return { jy: jy, jm: jm, jd: jd };
      }
      k -= 186;
    } else {
      jy -= 1;
      k += 179;
      if (r.leap === 1) k += 1;
    }
    jm = 7 + div(k, 30);
    jd = mod(k, 30) + 1;
    return { jy: jy, jm: jm, jd: jd };
  }

  function toJalali(gy, gm, gd) { return d2j(g2d(gy, gm, gd)); }
  function toGregorian(jy, jm, jd) { return d2g(j2d(jy, jm, jd)); }

  function isLeap(jy) { return jalCal(jy).leap === 0; }

  function monthLength(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    return isLeap(jy) ? 30 : 29;
  }

  function daysInYear(jy) { return isLeap(jy) ? 366 : 365; }

  /** ۰ = شنبه … ۶ = جمعه */
  function weekday(jy, jm, jd) {
    var g = toGregorian(jy, jm, jd);
    var d = new Date(g.gy, g.gm - 1, g.gd);
    return (d.getDay() + 1) % 7;
  }

  /** اجزای تاریخ/ساعت محلی از یک ISO */
  function fromISO(iso) {
    if (!iso) return null;
    var d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    var j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return {
      jy: j.jy, jm: j.jm, jd: j.jd,
      hh: d.getHours(), mi: d.getMinutes(),
      gy: d.getFullYear(), gm: d.getMonth() + 1, gd: d.getDate()
    };
  }

  /** ISO از اجزای تاریخ/ساعت محلی */
  function toISO(jy, jm, jd, hh, mi) {
    var g = toGregorian(jy, jm, jd);
    var d = new Date(g.gy, g.gm - 1, g.gd, hh || 0, mi || 0, 0, 0);
    return d.toISOString();
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function faDigits(str) {
    return String(str).replace(/[0-9]/g, function (ch) { return '۰۱۲۳۴۵۶۷۸۹'[Number(ch)]; });
  }

  function timeText(hh, mi) { return pad(hh) + ':' + pad(mi); }

  /** ۱۴۰۵/۰۸/۰۹ */
  function numeric(jy, jm, jd) {
    return jy + '/' + pad(jm) + '/' + pad(jd);
  }

  function today() {
    var d = new Date();
    return toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }

  function sameDay(a, b) {
    return !!a && !!b && a.jy === b.jy && a.jm === b.jm && a.jd === b.jd;
  }

  return {
    toJalali: toJalali,
    toGregorian: toGregorian,
    fromISO: fromISO,
    toISO: toISO,
    isLeap: isLeap,
    monthLength: monthLength,
    daysInYear: daysInYear,
    weekday: weekday,
    numeric: numeric,
    timeText: timeText,
    faDigits: faDigits,
    today: today,
    sameDay: sameDay
  };
});
