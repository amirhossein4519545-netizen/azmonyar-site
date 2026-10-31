/* ============================================================
   آزمون‌یار — همراه هوش مصنوعی
   تحلیل گرم و گفت‌وگویی با استفاده از همه سابقه دانش‌آموز
   اتصال اختیاری به سرویس سازگار با OpenAI + تحلیل داخلی
   ============================================================ */
(function () {
  'use strict';

  var AZ = window.AZ;
  var i18n = AZ.i18n;
  var logic = AZ.logic;

  function isFa() { return i18n.lang === 'fa'; }

  function normalizeConfig(cfg) {
    var conf = cfg || {};
    var baseUrl = String(conf.baseUrl || '').trim();
    var apiKey = String(conf.apiKey || '').trim();
    var model = String(conf.model || '').trim();

    apiKey = apiKey.replace(/^Bearer\s+/i, '').replace(/^["'`]+|["'`]+$/g, '').replace(/\s+/g, '');
    model = model.replace(/^["'`]+|["'`]+$/g, '').trim();
    if (baseUrl && !/^https?:\/\//i.test(baseUrl)) baseUrl = 'https://' + baseUrl;
    baseUrl = baseUrl.replace(/\/+$/, '');

    return { baseUrl: baseUrl, apiKey: apiKey, model: model };
  }

  function isConfigured(settings) {
    var s = normalizeConfig((settings && settings.ai) || {});
    return !!(s.baseUrl && s.apiKey && s.model);
  }

  function endpointOf(baseUrl) {
    var base = String(baseUrl || '').trim().replace(/\/+$/, '');
    return /\/chat\/completions$/.test(base) ? base : base + '/chat/completions';
  }

  /* ---------------- شخصیت و داده ---------------- */

  function persona() {
    if (isFa()) {
      return 'تو «آزمون‌یار» هستی: یک همراه درس‌خوانِ گرم، صمیمی و باحوصله برای دانش‌آموز؛ ترکیبی از یک دوست خوب و یک معلم خصوصی باتجربه. ' +
        'با «تو» صحبت کن، اسم دانش‌آموز را به کار ببر و لحن گفت‌وگویی داشته باش (نه گزارش اداری). ' +
        'لحن دوستانه و انگیزشی است، اما اولویت اول تو **دقت علمی و آماری** است؛ یک جملهٔ گرم هرگز نباید با اعداد JSON تضاد داشته باشد.\n\n' +

        '## قواعد سختگیرانهٔ تفسیر داده (نقض نکن)\n' +
        '۱) وفاداری مطلق به JSON: فقط و فقط از اعداد و وضعیت‌های موجود در داده حرف بزن — ' +
        'thisAttempt.correct / wrong / blank / total / percent / score20 / rank / rankOf / minutesSpent / taraz / tarazEstimated / practice، ' +
        'subjectsThisAttempt[].correct / wrong / blank / total / percent / taraz / coefficient، questions[].status، previousAttempt و history. ' +
        'هیچ عددی را از خودت نساز، جابه‌جا نکن، گرد نکن و به درصد تبدیل نکن. اگر فیلدی در JSON نبود، درباره‌اش حرف نزن یا بگو «این داده در دسترس نیست».\n' +
        '۲) ممنوعیت تناقض عددی: اگر thisAttempt.blank بزرگ‌تر از صفر است یا status سؤالی «blank» است، ' +
        'هرگز نگو «سؤال سفید نگذاشتی» یا «همه را پاسخ دادی». دقیقاً همان تعداد را بگو؛ مثلاً «۲ سؤال را سفید گذاشتی». ' +
        'بین «غلط» (wrong) و «سفید» (blank) فرق بگذار و آن‌ها را با هم جمع نکن مگر اینکه صریحاً جمع را بخواهی.\n' +
        '۳) معنای درصد درس: percent = (correct ÷ total) × ۱۰۰. اگر درسی ۱ سؤال دارد و آن سؤال غلط یا سفید است، درصد آن درس ۰٪ است؛ ' +
        'یعنی «هیچ پاسخ درستی نداشته»، نه «۱۰۰٪ غلط». ۱۰۰٪ فقط یعنی همهٔ سؤال‌های آن درس درست بوده‌اند. ' +
        'در توضیح بنویس: «چون به این سؤال پاسخ ندادی (یا غلط زدی)، درصد این درس ۰٪ شد». هرگز درصد را برعکس تفسیر نکن.\n' +
        '۴) تراز روی مقیاس ۵۰۰۰ ± ۱۰۰۰ است، نه درصد؛ تراز ۵۰۰۰ یعنی «حدود میانگین»، نه ۵۰٪. ' +
        'اگر tarazEstimated === true، حتماً و صریح بگو: «چون تعداد شرکت‌کنندگان کم بوده (یا پراکندگی نمره‌ها صفر شده)، این تراز تخمینی است» و آن را قطعی جا نزن.\n' +
        '۵) اگر thisAttempt.practice === true، بگو این تلاش تمرینی است و روی کارنامهٔ رسمی، رتبه و تراز اثر ندارد.\n' +
        '۶) قبل از نوشتن پاسخ، یک بازبینی ذهنی کن: هر عدد و هر صفتی که می‌گویی باید عیناً از JSON قابل اثبات باشد. ' +
        'اگر جمله‌ای با داده تضاد داشت، همان جمله را حذف کن؛ بهتر است کمتر بگویی تا اشتباه بگویی.\n\n' +

        '## ساختار پاسخ (حداکثر ۲۲۰ کلمه، حداکثر ۲ ایموجی، بدون جدول)\n' +
        '۱) سلام کوتاه و شخصی. ۲) جمع‌بندی این آزمون با ۲ یا ۳ عدد دقیق (درصد، تعداد درست، تعداد سفید/غلط). ' +
        '۳) یک نقطه قوت واقعی بر اساس subjectsThisAttempt یا questions — نه تعارف. ' +
        '۴) ۱ تا ۳ نکتهٔ قابل بهبود با نام درس/سؤال و عدد همان درس. ' +
        '۵) روند نسبت به previousAttempt یا history (اگر موجود بود) و اشاره به تراز با ذکر تخمینی بودن. ' +
        '۶) پایان با یک هدف کوچک، یک جملهٔ انگیزشی کوتاه و یک سؤال که گفت‌وگو ادامه پیدا کند.\n' +
        'هرگز تحقیر یا سرزنش نکن؛ از اشتباه‌ها با انرژی مثبت حرف بزن.\n\n' +

        '## حریم موضوعی\n' +
        'فقط دربارهٔ درس، آزمون، روش مطالعه، برنامه‌ریزی درسی، مدیریت استرس امتحان و انگیزهٔ درس حرف بزن. ' +
        'اگر کاربر از موضوع درس خارج شد (ورزش، بازی، فیلم، موسیقی، شبکه اجتماعی، سیاست، خرید، روابط شخصی و…)، پاسخ محتوایی نده؛ ' +
        'در یک جملهٔ کوتاه و مهربان بگو فقط دربارهٔ درس و آزمون همراه او هستی و بلافاصله یک سؤال درسی مرتبط بپرس و او را به درس برگردان.';
    }
    return 'You are "Examly", a warm, friendly and patient study companion for a student — a mix of a good friend and an experienced private tutor. ' +
      'Speak informally, use the student\'s name, and keep a conversational tone (not a corporate report). ' +
      'The tone is friendly and encouraging, but your first priority is **scientific and statistical accuracy**; a warm sentence must never contradict the JSON numbers.\n\n' +

      '## Strict data-interpretation rules (never break)\n' +
      '1) Absolute fidelity to the JSON: only talk about numbers and statuses present in the data — ' +
      'thisAttempt.correct / wrong / blank / total / percent / score20 / rank / rankOf / minutesSpent / taraz / tarazEstimated / practice, ' +
      'subjectsThisAttempt[].correct / wrong / blank / total / percent / taraz / coefficient, questions[].status, previousAttempt and history. ' +
      'Never invent, move, round or convert a number. If a field is missing, do not discuss it or say the data is unavailable.\n' +
      '2) No numeric contradictions: if thisAttempt.blank > 0, or a question status is "blank", never say "you left nothing blank" or "you answered everything". ' +
      'State the exact count, e.g. "you left 2 questions blank". Distinguish wrong from blank and never merge them unless explicitly summing.\n' +
      '3) Subject percent means correct ÷ total × 100. If a subject has 1 question and it was wrong or blank, that subject is 0% — ' +
      'meaning "no correct answer", NOT "100% wrong". 100% only means every question in that subject was correct. ' +
      'Explain it as: "because you did not answer it (or got it wrong), this subject is 0%". Never invert a percentage.\n' +
      '4) Taraz is on a 5000 ± 1000 scale, not a percentage; 5000 means roughly average, not 50%. ' +
      'If tarazEstimated === true, explicitly say the score is an estimate because there were few participants (or zero spread), and do not present it as exact.\n' +
      '5) If thisAttempt.practice === true, say this is a practice attempt that does not affect the official report, rank or standard score.\n' +
      '6) Before answering, sanity-check every number and adjective you write against the JSON. If a sentence contradicts the data, drop it; ' +
      'better to say less than to say something false.\n\n' +

      '## Answer structure (max 220 words, max 2 emojis, no tables)\n' +
      '1) A short personal greeting. 2) Summarise this exam with 2–3 exact numbers (percent, correct count, blank/wrong count). ' +
      '3) One genuine strength from subjectsThisAttempt or questions — no flattery. ' +
      '4) 1–3 improvement points naming the subject/question and that subject\'s number. ' +
      '5) The trend versus previousAttempt or history (if present) and the taraz, noting when it is estimated. ' +
      '6) End with one small goal, a short encouraging line and a question that keeps the conversation going.\n' +
      'Never shame or scold; talk about mistakes with positive energy.\n\n' +

      '## Scope\n' +
      'Only discuss school subjects, exams, study methods, study planning, exam stress and study motivation. ' +
      'If the user goes off-topic (sports, games, movies, music, social media, politics, shopping, personal relationships, …), do not answer the content; ' +
      'say in one short kind sentence that you only help with studying, then immediately ask a study-related question to bring them back.';
  }

  function dataBlock(report) {
    var payload = AZ.report.analysisPayload(report);
    return JSON.stringify(payload, null, 1);
  }

  function buildMessages(report, conversation, firstAnalysis) {
    var msgs = [{ role: 'system', content: persona() }];
    msgs.push({
      role: 'user',
      content: (isFa() ? 'این هم همه اطلاعات من تا این لحظه:\n' : 'Here is everything about me so far:\n') + dataBlock(report)
    });
    if (firstAnalysis) msgs.push({ role: 'assistant', content: firstAnalysis });
    (conversation || []).forEach(function (m) {
      if (!m || !m.text) return;
      msgs.push({ role: m.role === 'user' ? 'user' : 'assistant', content: String(m.text) });
    });
    return msgs;
  }

  /* ---------------- حریم موضوعی: فقط درس و آزمون ---------------- */

  var STUDY_WORDS = [
    'درس', 'درسی', 'آزمون', 'امتحان', 'سوال', 'سؤال', 'تمرین', 'مطالعه', 'مرور', 'تکرار',
    'کنکور', 'کلاس', 'معلم', 'دبیر', 'مدرسه', 'پایه', 'رشته', 'ترم', 'کارنامه', 'نمره', 'نمرات',
    'ریاضی', 'فیزیک', 'شیمی', 'زیست', 'هندسه', 'جبر', 'مثلثات', 'آمار', 'احتمال',
    'ادبیات', 'فارسی', 'عربی', 'انگلیسی', 'زبان', 'تاریخ', 'جغرافیا', 'اقتصاد', 'فلسفه', 'منطق', 'دینی',
    'برنامه', 'برنامه‌ریزی', 'برنامه ریزی', 'تست', 'جزوه', 'کتاب', 'فصل', 'پاسخ', 'حل', 'فرمول', 'قضیه',
    'درصد', 'تراز', 'رتبه', 'غلط', 'صحیح', 'سفید', 'تمرکز', 'انگیزه', 'اضطراب', 'خواب', 'هدف',
    'study', 'exam', 'test', 'question', 'practice', 'math', 'physics', 'chemistry', 'biology',
    'geometry', 'algebra', 'trigonometry', 'literature', 'history', 'geography', 'economics',
    'homework', 'lesson', 'subject', 'grade', 'score', 'rank', 'formula', 'theorem', 'review',
    'revision', 'schedule', 'plan', 'teacher', 'class', 'school', 'concept'
  ];

  var OFF_WORDS = [
    'فوتبال', 'والیبال', 'بسکتبال', 'بازی', 'گیم', 'فیلم', 'سریال', 'انیمه', 'آهنگ', 'موزیک', 'موسیقی',
    'خواننده', 'اینستاگرام', 'تلگرام', 'واتساپ', 'یوتیوب', 'تیک تاک', 'تیکتاک', 'سیاست', 'انتخابات',
    'رئیس جمهور', 'ماشین', 'خودرو', 'خرید', 'فروش', 'قیمت', 'بورس', 'ارز', 'بیت کوین', 'بیت‌کوین',
    'دوست دختر', 'دوست پسر', 'عاشق', 'رابطه', 'جوک', 'لطیفه', 'شوخی', 'خنده‌دار', 'جنگ', 'مواد',
    'سیگار', 'شرط بندی', 'شرط‌بندی', 'سفر', 'مسافرت', 'رستوران', 'آشپزی', 'لباس', 'مد', 'آرایش',
    'هک', 'کرک', 'بلیط', 'قمار', 'دونالد ترامپ',
    'football', 'soccer', 'basketball', 'game', 'gaming', 'movie', 'film', 'series', 'anime',
    'song', 'music', 'singer', 'instagram', 'telegram', 'whatsapp', 'youtube', 'tiktok',
    'politics', 'election', 'president', 'car', 'buy', 'sell', 'price', 'stock', 'crypto',
    'bitcoin', 'girlfriend', 'boyfriend', 'love', 'relationship', 'joke', 'funny', 'war',
    'drugs', 'cigarette', 'gambling', 'travel', 'trip', 'restaurant', 'cooking', 'fashion',
    'clothes', 'makeup', 'hack', 'crack'
  ];

  function normalizeText(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[يى]/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/\u200c/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** آیا پیام کاربر خارج از موضوع درس است؟ */
  function isOffTopic(text) {
    var s = normalizeText(text);
    if (!s) return false;
    var hasStudy = STUDY_WORDS.some(function (w) { return s.indexOf(w) !== -1; });
    if (hasStudy) return false;
    return OFF_WORDS.some(function (w) { return s.indexOf(w) !== -1; });
  }

  function focusSubject(report) {
    var subjects = (report && report.subjects) || [];
    if (!subjects.length) return isFa() ? 'درس‌هایت' : 'your subjects';
    return subjects.slice().sort(function (a, b) { return a.percent - b.percent; })[0].subject;
  }

  /** پاسخ دوستانه هنگام خروج از موضوع */
  function offTopicReply(report) {
    var subject = focusSubject(report);
    if (isFa()) {
      return 'این سؤال از درس و آزمون بیرون است، ولی من اینجام که فقط دربارهٔ درس‌ها و آزمون‌هایت همراهت باشم 😊\n' +
        'بیا برگردیم سراغ ' + subject + '؛ می‌خواهی از همین‌جا شروع کنیم یا برنامهٔ مطالعه برایت بچینم؟';
    }
    return 'That is outside schoolwork, and I am here only for your subjects and exams 😊\n' +
      'Shall we get back to ' + subject + ' — or would you like a study plan?';
  }

  /* ---------------- تحلیل داخلی (بدون اتصال) ---------------- */

  function localAnalysis(report) {
    var fa = isFa();
    var history = (report.historyPayload || AZ.report.historyPayload(report)) || {};
    var subjects = (report.subjects || []).slice();
    var weak = subjects.filter(function (s) { return s.percent < 50; })
      .sort(function (a, b) { return a.percent - b.percent; });
    var strong = subjects.filter(function (s) { return s.percent >= 75; })
      .sort(function (a, b) { return b.percent - a.percent; });
    var name = report.student ? report.student.name.split(' ')[0] : (fa ? 'رفیق' : 'friend');
    var lines = [];

    if (fa) {
      lines.push('سلام ' + name + '! 👋');
      lines.push('بریم با هم کارنامه «' + report.examTitle + '» را ببینیم.');
      lines.push('');
      lines.push('این آزمون چطور بود؟ از ' + i18n.num(report.result.total) + ' سؤال، ' +
        i18n.num(report.result.correct) + ' تا درست زدی، ' + i18n.num(report.result.wrong) + ' غلط و ' +
        i18n.num(report.result.blank) + ' را خالی گذاشتی. درصدت ' + i18n.num(report.percent) + '٪، نمره‌ات ' +
        i18n.num(report.score20) + ' از ۲۰ و ترازت ' + i18n.num(report.taraz) +
        ' (رتبه ' + i18n.num(report.rank.rank) + ' از ' + i18n.num(report.rank.of) + ').');
      lines.push('');
      if (strong.length) {
        lines.push('چی خوب بود؟');
        strong.slice(0, 2).forEach(function (s) {
          lines.push('- ' + s.subject + ' با ' + i18n.num(s.percent) + '٪ — دستت واقعاً راه افتاده.');
        });
      } else {
        lines.push('یک نکته مثبت: ' + (report.result.correct > 0
          ? 'همین که ' + i18n.num(report.result.correct) + ' سؤال را درست زدی یعنی پایه‌ات هست؛ فقط باید تمرین بیشتر شود.'
          : 'بی‌خیال نشو؛ از همین آزمون شروع می‌کنیم و دفعه بعد بهتر می‌شود.'));
      }
      lines.push('');
      if (weak.length) {
        lines.push('کجا می‌شود بهتر شد؟');
        weak.slice(0, 3).forEach(function (s) {
          lines.push('- ' + s.subject + ': ' + i18n.num(s.percent) + '٪ (' + i18n.num(s.correct) + ' از ' + i18n.num(s.total) + ' درست)');
        });
        lines.push('- پیشنهاد: برای ' + weak[0].subject + ' ۱۵ دقیقه مرور مفهوم + ۱۰ سؤال تمرینی بگذار.');
      } else {
        var focusAll = subjects.slice().sort(function (a, b) { return a.percent - b.percent; })[0];
        lines.push('برای بهتر شدن: پاسخ‌های غلط را در دفتر اشتباهات بنویس و سه روز بعد دوباره حل کن.' +
          (focusAll ? ' روی ' + focusAll.subject + ' هم کمی تمرین بیشتر بگذار.' : ''));
      }
      if (report.result.blank > 0) {
        lines.push('- ' + i18n.num(report.result.blank) + ' سؤال بی‌پاسخ داشتی؛ حتی یک حدس هم شانس تو را بیشتر می‌کند.');
      }
      lines.push('');
      if (history.totalAttempts > 1) {
        lines.push('راهت تا اینجا:');
        lines.push('تو ' + i18n.num(history.totalAttempts) + ' آزمون داده‌ای؛ میانگینت ' + i18n.num(history.avgPercent) +
          '٪ و بهترینت ' + i18n.num(history.bestPercent) + '٪ بوده.');
        if (report.comparison && report.comparison.prev) {
          var d = report.comparison.delta;
          lines.push('نسبت به تلاش قبلی همین آزمون ' + (d >= 0 ? 'بهتر' : 'ضعیف‌تر') + ' شدی (' +
            (d > 0 ? '+' : '') + i18n.num(d) + ' واحد درصد) و ' + i18n.num(report.comparison.improved.length) +
            ' سؤال از غلط به درست رسید.');
        } else if (history.deltaFromFirst !== 0) {
          lines.push('از اولین آزمونت ' + (history.deltaFromFirst > 0 ? '+' : '') + i18n.num(history.deltaFromFirst) +
            ' واحد درصد تغییر کردی؛ مسیرت ' + (history.deltaFromFirst > 0 ? 'صعودی' : 'پرنوسان') + ' است.');
        }
        var aggWeak = (history.subjects || []).slice().sort(function (a, b) { return a.percent - b.percent; })[0];
        if (aggWeak && aggWeak.percent < 60) {
          lines.push('در کل سابقه‌ات، ' + aggWeak.subject + ' ضعیف‌ترین درس بوده (' + i18n.num(aggWeak.percent) + '٪)؛ آن را جدی بگیر.');
        }
      } else {
        lines.push('این اولین قدمت در این مسیر است؛ از همین کارنامه شروع می‌کنیم.');
      }
      lines.push('');
      lines.push('هر سؤالی داری همین‌جا بپرس؛ با هم حلش می‌کنیم 🙂');
      lines.push('');
      lines.push('_' + i18n.t('ai.localNote') + '_');
    } else {
      lines.push('Hi ' + name + '! 👋');
      lines.push('Let\'s look at your "' + report.examTitle + '" report together.');
      lines.push('');
      lines.push('You answered ' + report.result.total + ' questions: ' + report.result.correct + ' correct, ' +
        report.result.wrong + ' wrong and ' + report.result.blank + ' blank. That is ' + report.percent + '%, ' +
        report.score20 + '/20 and a standard score of ' + report.taraz +
        ' (rank ' + report.rank.rank + ' of ' + report.rank.of + ').');
      lines.push('');
      if (strong.length) {
        lines.push('What went well?');
        strong.slice(0, 2).forEach(function (s) {
          lines.push('- ' + s.subject + ' at ' + s.percent + '% — that is solid.');
        });
      } else {
        lines.push('One good thing: you got ' + report.result.correct + ' right, so the base is there — it just needs practice.');
      }
      lines.push('');
      lines.push('Where can you improve?');
      if (weak.length) {
        weak.slice(0, 3).forEach(function (s) {
          lines.push('- ' + s.subject + ': ' + s.percent + '% (' + s.correct + '/' + s.total + ')');
        });
        lines.push('- Suggestion: 15 minutes of concept review plus 10 practice questions on ' + weak[0].subject + '.');
      } else {
        var focusAllEn = subjects.slice().sort(function (a, b) { return a.percent - b.percent; })[0];
        lines.push('- Keep an error notebook and revisit every wrong answer after three days.' +
          (focusAllEn ? ' Add a little extra practice on ' + focusAllEn.subject + '.' : ''));
      }
      lines.push('');
      if (history.totalAttempts > 1) {
        lines.push('Your journey so far:');
        lines.push('You have taken ' + history.totalAttempts + ' exams; average ' + history.avgPercent +
          '%, best ' + history.bestPercent + '%.');
        if (report.comparison && report.comparison.prev) {
          lines.push('Compared with your previous attempt you ' + (report.comparison.delta >= 0 ? 'improved' : 'dropped') +
            ' by ' + Math.abs(report.comparison.delta) + ' points, with ' + report.comparison.improved.length + ' questions fixed.');
        }
      } else {
        lines.push('This is your first step here; we start from this report.');
      }
      lines.push('');
      lines.push('Ask me anything you like — we will figure it out together 🙂');
      lines.push('');
      lines.push('_' + i18n.t('ai.localNote') + '_');
    }
    return lines.join('\n');
  }

  /* ---------------- فراخوانی سرویس ---------------- */

  function request(settings, messages, options) {
    var cfg = normalizeConfig(settings && settings.ai);
    var opts = options || {};
    var controller = null;
    var timer = null;
    try {
      controller = new AbortController();
      timer = setTimeout(function () { controller.abort(); }, opts.timeout || 60000);
    } catch (e) { /* ignore */ }

    return fetch(endpointOf(cfg.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + cfg.apiKey
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: opts.temperature === undefined ? 0.7 : opts.temperature,
        messages: messages
      }),
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (txt) {
          throw new Error('HTTP ' + res.status + (txt ? ' · ' + String(txt).slice(0, 200) : ''));
        });
      }
      return res.json();
    }).then(function (data) {
      var text = extractText(data);
      if (!text) throw new Error(i18n.t('ai.empty'));
      return text;
    }).then(function (text) {
      if (timer) clearTimeout(timer);
      return text;
    }).catch(function (err) {
      if (timer) clearTimeout(timer);
      throw err;
    });
  }

  function analyze(report, settings) {
    if (!isConfigured(settings)) {
      return Promise.resolve({ text: localAnalysis(report), source: 'local' });
    }
    var instruction = isFa()
      ? 'حالا با همان لحن گرم و دوستانه‌ات، این کارنامه را برایم تحلیل کن.'
      : 'Now analyse this report for me, in your warm friendly voice.';
    var messages = [
      { role: 'system', content: persona() },
      { role: 'user', content: (isFa() ? 'این هم همه اطلاعات من تا این لحظه:\n' : 'Here is everything about me so far:\n') + dataBlock(report) },
      { role: 'user', content: instruction }
    ];
    return request(settings, messages, { temperature: 0.75 }).then(function (text) {
      return { text: text, source: 'ai' };
    }).catch(function (err) {
      return {
        text: localAnalysis(report),
        source: 'local',
        error: (err && err.name === 'AbortError') ? 'timeout' : (err && err.message ? err.message : String(err))
      };
    });
  }

  /** ادامه گفت‌وگو با همان حافظه و شخصیت */
  function chat(report, settings, conversation, firstAnalysis) {
    if (!isConfigured(settings)) {
      return Promise.resolve({ ok: false, error: 'not-configured' });
    }
    var messages = buildMessages(report, conversation, firstAnalysis);
    return request(settings, messages, { temperature: 0.8, timeout: 60000 }).then(function (text) {
      return { ok: true, text: text };
    }).catch(function (err) {
      return {
        ok: false,
        error: (err && err.name === 'AbortError') ? 'timeout' : (err && err.message ? err.message : String(err))
      };
    });
  }

  function extractText(data) {
    if (!data) return '';
    if (typeof data === 'string') return data;
    var choice = data.choices && data.choices[0];
    if (choice) {
      var msg = choice.message || {};
      var content = msg.content;
      if (typeof content === 'string') return content;
      if (Array.isArray(content)) {
        return content.map(function (part) { return part.text || ''; }).join('');
      }
      if (typeof choice.text === 'string') return choice.text;
    }
    if (data.candidates && data.candidates[0]) {
      var parts = data.candidates[0].content && data.candidates[0].content.parts;
      if (Array.isArray(parts)) return parts.map(function (p) { return p.text || ''; }).join('');
    }
    return '';
  }

  /** تست سریع اتصال و کلید (بدون تحلیل) */
  function testConnection(cfg) {
    var conf = normalizeConfig(cfg);
    if (!conf.baseUrl || !conf.apiKey || !conf.model) {
      return Promise.resolve({ ok: false, error: 'incomplete', status: 0 });
    }
    var url = endpointOf(conf.baseUrl);
    var controller = null;
    var timer = null;
    try {
      controller = new AbortController();
      timer = setTimeout(function () { controller.abort(); }, 30000);
    } catch (e) { /* ignore */ }

    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + conf.apiKey },
      body: JSON.stringify({
        model: conf.model,
        max_tokens: 4,
        messages: [{ role: 'user', content: 'ping' }]
      }),
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      if (res.ok) return { ok: true, status: res.status, url: url, model: conf.model };
      return res.text().then(function (txt) {
        return {
          ok: false,
          status: res.status,
          body: String(txt || '').slice(0, 400),
          url: url,
          model: conf.model,
          error: 'HTTP ' + res.status + (txt ? ' · ' + String(txt).slice(0, 200) : '')
        };
      });
    }).catch(function (err) {
      return {
        ok: false,
        status: 0,
        network: true,
        url: url,
        model: conf.model,
        error: (err && err.name === 'AbortError') ? 'timeout' : (err && err.message ? err.message : String(err))
      };
    }).then(function (out) {
      if (timer) clearTimeout(timer);
      return out;
    });
  }

  function tutorPersona(student) {
    var who = '';
    if (student && student.name) {
      who = isFa()
        ? ' دانش‌آموز: ' + student.name + (student.grade ? ' (پایه ' + student.grade + ')' : '') + '.'
        : ' Student: ' + student.name + (student.grade ? ' (grade ' + student.grade + ')' : '') + '.';
    }
    if (isFa()) {
      return 'تو یک معلم خصوصی گرم، صبور و دقیق هستی که با دانش‌آموز مثل یک دوست مهربان حرف می‌زند.' + who +
        ' فقط دربارهٔ درس، حل تمرین، مفهوم‌ها و روش مطالعه صحبت کن؛ اگر سؤال غیردرسی بود، در یک جملهٔ کوتاه و مهربان بگو فقط درس و تمرین کمک می‌کنی و او را به درس برگردان.' +
        ' راه‌حل را مرحله‌به‌مرحله توضیح بده، فرمول لازم را بنویس و در پایان یک سؤال کوتاه بپرس تا مطمئن شوی فهمیده.' +
        ' اگر صورت سؤال ناقص است، به‌جای حدس زدن، یک سؤال روشن‌کننده بپرس. حداکثر ۲۲۰ کلمه، حداکثر ۲ ایموجی، بدون جدول.';
    }
    return 'You are a warm, patient and precise private tutor talking like a kind friend.' + who +
      ' Only discuss study material, solving exercises, concepts and study methods; if the question is off-topic, say in one short kind sentence that you help with study only and bring them back.' +
      ' Explain step by step, write the needed formula, and end with a short question to check understanding.' +
      ' If the question is incomplete, ask a clarifying question instead of guessing. Max 220 words, max 2 emojis, no tables.';
  }

  /** محتوای پیام کاربر: متن یا متن + عکس (سازگار با OpenAI vision) */
  function tutorContent(question, image) {
    var text = String(question || '').trim();
    if (!image) return text;
    return [
      { type: 'text', text: text || (isFa() ? 'این تصویر را حل کن.' : 'Please solve this image.') },
      { type: 'image_url', image_url: { url: String(image) } }
    ];
  }

  function tutorMessages(student, history, question, image) {
    var messages = [{ role: 'system', content: tutorPersona(student) }];
    (history || []).slice(-8).forEach(function (m) {
      if (!m || !m.text) return;
      messages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: String(m.text) });
    });
    messages.push({ role: 'user', content: tutorContent(question, image) });
    return messages;
  }

  /** پرسش درسی آزاد (بدون نیاز به کارنامه) — با امکان عکس */
  function tutor(question, settings, opts) {
    var opt = opts || {};
    var text = String(question || '').trim();
    var image = opt.image || '';
    if (!text && !image) return Promise.resolve({ ok: false, error: 'empty' });
    if (!isConfigured(settings)) return Promise.resolve({ ok: false, error: 'not-configured' });

    function attempt(withImage) {
      return request(settings, tutorMessages(opt.student, opt.history, text, withImage ? image : ''), { temperature: 0.6 });
    }

    return attempt(!!image).then(function (reply) {
      return { ok: true, text: reply, vision: !!image };
    }).catch(function (err) {
      var msg = (err && err.name === 'AbortError') ? 'timeout' : (err && err.message ? err.message : String(err));
      /* مدل تصویر را نمی‌فهمد؟ یک‌بار بدون عکس تلاش کن و از دانش‌آموز توضیح بخواه */
      if (image && /\b400\b|\b422\b|\b415\b/.test(msg)) {
        var note = isFa()
          ? '(دانش‌آموز یک عکس پیوست کرده است، ولی مدل فعلی نمی‌تواند عکس را ببیند. در یک جمله بگو عکس دیده نشد و از او بخواه صورت مسئله را بنویسد یا در بخش «پرسش از معلم» عکس را بفرستد، بعد راهنمایی درسی بده.)'
          : '(The student attached an image, but the current model cannot see images. Say in one sentence that the image was not visible, ask them to type the problem or send it in the teacher tab, then give study guidance.)';
        return request(settings, tutorMessages(opt.student, opt.history, text + '\n\n' + note, ''), { temperature: 0.6 })
          .then(function (reply) { return { ok: true, text: reply, vision: false, imageIgnored: true }; })
          .catch(function (err2) {
            return { ok: false, error: (err2 && err2.message) ? err2.message : String(err2) };
          });
      }
      return { ok: false, error: msg };
    });
  }

  window.AZ.ai = {
    isConfigured: isConfigured,
    normalizeConfig: normalizeConfig,
    persona: persona,
    tutorPersona: tutorPersona,
    dataBlock: dataBlock,
    buildMessages: buildMessages,
    analyze: analyze,
    chat: chat,
    tutor: tutor,
    tutorMessages: tutorMessages,
    tutorContent: tutorContent,
    isOffTopic: isOffTopic,
    offTopicReply: offTopicReply,
    localAnalysis: localAnalysis,
    testConnection: testConnection,
    extractText: extractText
  };
})();
