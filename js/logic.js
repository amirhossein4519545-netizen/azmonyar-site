/* ============================================================
   آزمون‌یار — منطق خالص (بدون DOM)
   مرورگر: AZ.logic   |   Node: module.exports
   ============================================================ */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.AZ = root.AZ || {};
    root.AZ.logic = api;
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var PASS_PERCENT = 50;
  var KLASS = {
    MEAN: 5000,
    SD: 1000,
    Z_MAX: 3,
    /* وقتی نمونه کوچک است (کمتر از ۱۰ نفر) از این مرجع استفاده می‌کنیم (تخمینی) */
    REF_MEAN: 50,
    REF_SD: 18,
    MIN_PEERS: 10
  };

  /* ---------------- پایه ---------------- */

  function chosenOf(answers, questionId) {
    if (!answers) return null;
    var v = answers[questionId];
    if (v === undefined || v === null || v === '' || v < 0) return null;
    return Number(v);
  }

  function statusOf(correctIndex, chosen) {
    if (chosen === null || chosen === undefined) return 'blank';
    return Number(chosen) === Number(correctIndex) ? 'correct' : 'wrong';
  }

  function grade(questions, answers) {
    var list = Array.isArray(questions) ? questions : [];
    var total = list.length;
    var correct = 0;
    var wrong = 0;
    var blank = 0;
    var details = list.map(function (q) {
      var chosen = chosenOf(answers, q.id);
      var status = statusOf(q.correct, chosen);
      if (status === 'correct') correct++;
      else if (status === 'wrong') wrong++;
      else blank++;
      return { id: q.id, chosen: chosen, correctIndex: q.correct, status: status, isCorrect: status === 'correct' };
    });
    var percent = total === 0 ? 0 : Math.round((correct / total) * 100);
    return {
      total: total,
      correct: correct,
      wrong: wrong,
      blank: blank,
      percent: percent,
      passed: percent >= PASS_PERCENT,
      details: details
    };
  }

  /* ---------------- آمار و تراز ---------------- */

  function stats(values) {
    var list = (values || []).filter(function (v) {
      return typeof v === 'number' && isFinite(v);
    });
    var n = list.length;
    if (!n) return { n: 0, mean: 0, sd: 0, min: 0, max: 0 };
    var sum = list.reduce(function (s, v) { return s + v; }, 0);
    var mean = sum / n;
    var variance = n > 1
      ? list.reduce(function (s, v) { return s + Math.pow(v - mean, 2); }, 0) / (n - 1)
      : 0;
    return {
      n: n,
      mean: mean,
      sd: Math.sqrt(variance),
      min: Math.min.apply(null, list),
      max: Math.max.apply(null, list)
    };
  }

  /* ضرایب استاندارد دروس (بر اساس رشته) — نظام جدید
     تراز کل = میانگین وزنی تراز دروس با این ضرایب */
  var COEFFICIENTS = {
    math: {
      'ریاضی': 4, 'ریاضیات': 4, 'حسابان': 4, 'هندسه': 3, 'جبر': 2, 'مثلثات': 2, 'آمار': 1,
      'گسسته': 2, 'فیزیک': 3, 'شیمی': 2,
      'فارسی': 2, 'ادبیات': 2, 'عربی': 1, 'دینی': 2, 'انگلیسی': 1, 'زبان': 1
    },
    science: {
      'زیست': 4, 'زیست‌شناسی': 4, 'شیمی': 3, 'فیزیک': 2, 'ریاضی': 2, 'زمین': 1, 'آمار': 1,
      'فارسی': 2, 'ادبیات': 2, 'عربی': 1, 'دینی': 2, 'انگلیسی': 1, 'زبان': 1
    },
    humanities: {
      'ادبیات': 4, 'فارسی': 4, 'عربی': 2, 'دینی': 2, 'تاریخ': 2, 'جغرافیا': 1,
      'جامعه‌شناسی': 1, 'جامعه شناسی': 1, 'فلسفه': 1, 'منطق': 1, 'روان‌شناسی': 1,
      'روان شناسی': 1, 'اقتصاد': 1, 'ریاضی': 1, 'آمار': 1, 'انگلیسی': 1, 'زبان': 1
    },
    vocational: {
      'فارسی': 2, 'دینی': 2, 'عربی': 1, 'انگلیسی': 1, 'زبان': 1, 'ریاضی': 2
    },
    'kar-danesh': {
      'فارسی': 2, 'دینی': 2, 'عربی': 1, 'انگلیسی': 1, 'زبان': 1
    },
    maaref: {
      'دینی': 4, 'قرآن': 3, 'عربی': 3, 'ادبیات': 2, 'فارسی': 2, 'انگلیسی': 1, 'زبان': 1
    }
  };

  function normSubject(text) {
    return String(text || '')
      .replace(/[يى]/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/\u200c/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** ضریب یک درس در یک رشته (با امکان override از تنظیمات) */
  function coefficientFor(major, subject, overrides) {
    var key = normSubject(subject);
    if (!key) return 1;
    var custom = overrides && overrides[major];
    if (custom) {
      Object.keys(custom).forEach(function (k) {
        if (normSubject(k) === key) key = k;
      });
      if (custom[key] !== undefined && custom[key] !== null && custom[key] !== '') {
        return Math.max(0, Math.min(10, Number(custom[key]) || 0));
      }
    }
    var table = COEFFICIENTS[major] || {};
    var found = null;
    Object.keys(table).forEach(function (k) {
      if (found !== null) return;
      if (normSubject(k) === key) found = table[k];
    });
    if (found !== null) return found;
    /* تطبیق نسبی: «ریاضی ۲» یا «هندسه تحلیلی» */
    Object.keys(table).forEach(function (k) {
      if (found !== null) return;
      if (key.indexOf(normSubject(k)) === 0 || normSubject(k).indexOf(key) === 0) found = table[k];
    });
    return found === null ? 1 : found;
  }

  /**
   * تراز استاندارد ایران با ضرایب:
   *   تراز هر درس:  T = 5000 + 1000 × z
   *   تراز کل:      Σ(ضریب × تراز درس) / Σ(ضریب)
   * ورودی: [{ percent, peers, coefficient }]
   */
  function weightedTaraz(items) {
    var list = Array.isArray(items) ? items : [];
    var totalWeight = 0;
    var sum = 0;
    var estimated = false;
    var subjects = list.map(function (item) {
      var t = taraz(item.percent, item.peers || []);
      var w = Math.max(0, Number(item.coefficient) || 0);
      if (t.estimated) estimated = true;
      if (w > 0) {
        totalWeight += w;
        sum += t.value * w;
      }
      return {
        percent: Number(item.percent) || 0,
        coefficient: w,
        taraz: t.value,
        z: t.z,
        estimated: t.estimated,
        contribution: Math.round(t.value * w)
      };
    });
    var value = totalWeight > 0 ? Math.round(sum / totalWeight) : KLASS.MEAN;
    return {
      value: value,
      method: 'weighted',
      estimated: estimated,
      totalWeight: totalWeight,
      subjects: subjects,
      z: null,
      mean: null,
      sd: null,
      n: subjects.length
    };
  }

  /**
   * تراز استاندارد (مقیاس ۵۰۰۰ ± ۱۰۰۰):
   *   T = 5000 + 1000 × z ،  z = (درصد − میانگین) / انحراف‌معیار
   * اگر تعداد شرکت‌کنندگان کمتر از ۱۰ نفر باشد (نمونهٔ کوچک) یا انحراف معیار صفر شود،
   * از مرجع ثابت (میانگین ۵۰، انحراف ۱۸) استفاده و خروجی «تخمینی» علامت‌گذاری می‌شود.
   */
  function taraz(percent, peers) {
    var list = (peers || []).filter(function (v) { return typeof v === 'number' && isFinite(v); });
    var base;
    var estimated = false;

    if (list.length >= KLASS.MIN_PEERS) {
      base = stats(list);
      /* اگر همهٔ نمره‌ها یکسان باشند، انحراف معیار صفر و z بی‌معنا می‌شود؛
         در این حالت هم به مرجع برمی‌گردیم و نتیجه «تخمینی» است. */
      if (!base.sd || base.sd < 0.5) {
        base = { mean: KLASS.REF_MEAN, sd: KLASS.REF_SD, n: list.length };
        estimated = true;
      }
    } else {
      base = { mean: KLASS.REF_MEAN, sd: KLASS.REF_SD, n: list.length };
      estimated = true;
    }

    var z = (Number(percent) - base.mean) / base.sd;
    z = Math.max(-KLASS.Z_MAX, Math.min(KLASS.Z_MAX, z));
    return {
      value: Math.round(KLASS.MEAN + KLASS.SD * z),
      estimated: estimated,
      z: Math.round(z * 100) / 100,
      mean: base.mean,
      sd: base.sd,
      n: base.n
    };
  }

  /** رتبه (۱ = بهترین)؛ رتبه‌های مساوی مشترک هستند. */
  function rankOf(percent, peers) {
    var list = peers || [];
    var better = 0;
    var total = 0;
    list.forEach(function (v) {
      if (typeof v !== 'number' || !isFinite(v)) return;
      total++;
      if (v > percent) better++;
    });
    return { rank: better + 1, of: total };
  }

  function percentOf(part, whole) {
    if (!whole) return 0;
    return Math.round((part / whole) * 100);
  }

  /** نمره از ۲۰ */
  function score20(percent) {
    return Math.round((Number(percent) / 5) * 10) / 10;
  }

  /* ---------------- زمان ---------------- */

  function remainingMs(startedAt, durationMin, now, endAt) {
    var start = new Date(startedAt).getTime();
    var current = now === undefined ? Date.now() : now;
    if (!isFinite(start)) return 0;
    var deadline = start + Math.max(0, Number(durationMin) || 0) * 60000;
    if (endAt) {
      var hardEnd = new Date(endAt).getTime();
      if (isFinite(hardEnd) && hardEnd > 0) deadline = Math.min(deadline, hardEnd);
    }
    return Math.max(0, deadline - current);
  }

  function fmtClock(ms) {
    var totalSec = Math.max(0, Math.ceil(Number(ms) / 1000));
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    return h > 0 ? h + ':' + pad(m) + ':' + pad(s) : pad(m) + ':' + pad(s);
  }

  function answeredCount(questions, answers) {
    var n = 0;
    (questions || []).forEach(function (q) {
      if (chosenOf(answers, q.id) !== null) n++;
    });
    return n;
  }

  /** وضعیت زمانی یک آزمون نسبت به بازه مجاز */
  function examWindow(exam, now) {
    var t = now === undefined ? Date.now() : now;
    var start = exam && exam.startAt ? new Date(exam.startAt).getTime() : null;
    var end = exam && exam.endAt ? new Date(exam.endAt).getTime() : null;
    if (start && isFinite(start) && t < start) return 'upcoming';
    if (end && isFinite(end) && t > end) return 'closed';
    return 'open';
  }

  /* ---------------- مقایسه دو تلاش ---------------- */

  function compareAttempts(questions, currentAnswers, previousAnswers) {
    var list = questions || [];
    var improved = [];
    var regressed = [];
    var kept = [];
    var comparable = 0;
    list.forEach(function (q) {
      var now = statusOf(q.correct, chosenOf(currentAnswers, q.id));
      var before = statusOf(q.correct, chosenOf(previousAnswers, q.id));
      comparable++;
      if (before === now) kept.push({ id: q.id, status: now });
      else if (now === 'correct') improved.push({ id: q.id, before: before, status: now });
      else regressed.push({ id: q.id, before: before, status: now });
    });
    return { improved: improved, regressed: regressed, kept: kept, comparable: comparable };
  }

  /* ---------------- خروجی CSV ---------------- */

  function csvCell(value) {
    var s = value === null || value === undefined ? '' : String(value);
    if (/[",\n\r;]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function toCSV(rows, headers) {
    var lines = [];
    if (headers && headers.length) lines.push(headers.map(csvCell).join(','));
    (rows || []).forEach(function (row) {
      lines.push(row.map(csvCell).join(','));
    });
    return '\uFEFF' + lines.join('\r\n');
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function round(value, digits) {
    var f = Math.pow(10, digits || 0);
    return Math.round(Number(value) * f) / f;
  }

  return {
    PASS_PERCENT: PASS_PERCENT,
    KLASS: KLASS,
    chosenOf: chosenOf,
    statusOf: statusOf,
    grade: grade,
    stats: stats,
    taraz: taraz,
    weightedTaraz: weightedTaraz,
    coefficientFor: coefficientFor,
    COEFFICIENTS: COEFFICIENTS,
    rankOf: rankOf,
    percentOf: percentOf,
    score20: score20,
    remainingMs: remainingMs,
    fmtClock: fmtClock,
    answeredCount: answeredCount,
    examWindow: examWindow,
    compareAttempts: compareAttempts,
    toCSV: toCSV,
    clamp: clamp,
    round: round
  };
});
