/* ============================================================
   آزمون‌یار — ساخت کارنامه تحلیلی (تراز، رتبه، دروس، مقایسه)
   ============================================================ */
(function () {
  'use strict';

  var store = window.AZ.store;
  var logic = window.AZ.logic;

  function secondsBetween(startISO, endISO) {
    if (!endISO) return 0;
    return Math.max(0, Math.round((new Date(endISO).getTime() - new Date(startISO).getTime()) / 1000));
  }

  function subjectKey(q) {
    return (q && (q.subject || '').trim()) || '—';
  }

  function attemptPercent(attempt) {
    var p = Number(attempt.percent);
    return isFinite(p) ? p : 0;
  }

  /** رشته تحصیلی آزمون (برای ضرایب دروس) */
  function majorOfExam(exam) {
    var cls = exam && exam.classId ? store.getClass(exam.classId) : null;
    return cls && cls.major ? cls.major : 'other';
  }

  function coefficientOverrides() {
    var s = store.getSettings();
    return (s && s.coefficients) || {};
  }

  /** همه شرکت‌کنندگان یک آزمون با تراز و رتبه (بهترین تلاش رسمی هر دانش‌آموز) */
  function participants(examId) {
    var exam = store.getExam(examId);
    if (!exam) return [];
    var attempts = store.examAttempts(examId).filter(function (a) { return !a.practice; });
    var byStudent = {};
    attempts.forEach(function (a) {
      var cur = byStudent[a.userId];
      var newer = cur && new Date(a.submittedAt).getTime() > new Date(cur.submittedAt).getTime();
      if (!cur || a.percent > cur.percent || (a.percent === cur.percent && newer)) byStudent[a.userId] = a;
    });
    var best = Object.keys(byStudent).map(function (k) { return byStudent[k]; });
    var allRows = best.map(function (a) { return { attempt: a }; });

    var rows = best.map(function (a) {
      var student = store.getStudent(a.userId);
      var subs = subjectRows(exam, a, allRows);
      var wt = logic.weightedTaraz(subs.map(function (s) {
        return { percent: s.percent, peers: s.peers, coefficient: s.coefficient };
      }));
      return {
        attempt: a,
        student: student,
        name: student ? student.name : '—',
        username: student ? student.username : '',
        classId: student ? student.classId : null,
        percent: attemptPercent(a),
        taraz: wt.value,
        tarazInfo: wt,
        subjects: subs,
        rank: 1,
        of: best.length,
        correct: a.correct,
        wrong: a.wrong,
        blank: a.blank,
        total: a.total,
        score20: logic.score20(attemptPercent(a)),
        timeSec: secondsBetween(a.startedAt, a.submittedAt),
        incidents: (a.incidents || []).length
      };
    });

    var tarazes = rows.map(function (r) { return r.taraz; });
    rows.forEach(function (row) {
      row.rank = logic.rankOf(row.taraz, tarazes).rank;
      row.of = tarazes.length;
    });

    rows.sort(function (x, y) {
      return (y.taraz - x.taraz) || (y.percent - x.percent) || (x.timeSec - y.timeSec);
    });
    rows.forEach(function (row, i) { row.order = i + 1; });
    return rows;
  }

  function examSummary(exam) {
    if (!exam) return null;
    var rows = participants(exam.id);
    var percents = rows.map(function (r) { return r.percent; });
    var tarazes = rows.map(function (r) { return r.taraz; });
    var st = logic.stats(percents);
    return {
      exam: exam,
      rows: rows,
      n: rows.length,
      avgPercent: rows.length ? Math.round(st.mean) : 0,
      sd: Math.round(st.sd * 10) / 10,
      bestPercent: rows.length ? Math.max.apply(null, percents) : 0,
      minPercent: rows.length ? Math.min.apply(null, percents) : 0,
      avgTaraz: rows.length ? Math.round(tarazes.reduce(function (s, v) { return s + v; }, 0) / tarazes.length) : 0,
      bestTaraz: rows.length ? Math.max.apply(null, tarazes) : 0
    };
  }

  function topRanks(exam, classId, limit) {
    var rows = participants(exam.id);
    if (classId) {
      rows = rows.filter(function (r) { return (r.classId || store.OTHER_CLASS_ID) === classId; });
    }
    return rows.slice(0, limit || 3).map(function (r, i) {
      return { rank: r.rank || i + 1, name: r.name, percent: r.percent, taraz: r.taraz };
    });
  }

  /** کارنامه درسی: تفکیک بر اساس درس با تراز و رتبه */
  function subjectRows(exam, attempt, allRows) {
    var questions = store.examQuestions(exam);
    var groups = {};
    questions.forEach(function (q) {
      var key = subjectKey(q);
      (groups[key] = groups[key] || []).push(q);
    });

    var peersBySubject = {};
    (allRows || []).forEach(function (row) {
      Object.keys(groups).forEach(function (key) {
        var qs = groups[key];
        var correct = qs.filter(function (q) {
          return logic.statusOf(q.correct, logic.chosenOf(row.attempt.answers, q.id)) === 'correct';
        }).length;
        (peersBySubject[key] = peersBySubject[key] || []).push(logic.percentOf(correct, qs.length));
      });
    });

    return Object.keys(groups).map(function (key) {
      var qs = groups[key];
      var correct = 0;
      var wrong = 0;
      var blank = 0;
      qs.forEach(function (q) {
        var st = logic.statusOf(q.correct, logic.chosenOf(attempt.answers, q.id));
        if (st === 'correct') correct++;
        else if (st === 'wrong') wrong++;
        else blank++;
      });
      var percent = logic.percentOf(correct, qs.length);
      var peers = peersBySubject[key] || [];
      var t = logic.taraz(percent, peers);
      var coefficient = logic.coefficientFor(majorOfExam(exam), key, coefficientOverrides());
      var max = peers.length ? Math.max.apply(null, peers) : percent;
      var maxTaraz = peers.length
        ? Math.max.apply(null, peers.map(function (p) { return logic.taraz(p, peers).value; }))
        : t.value;
      return {
        subject: key,
        total: qs.length,
        correct: correct,
        wrong: wrong,
        blank: blank,
        percent: percent,
        coefficient: coefficient,
        peers: peers,
        bestPercent: max,
        taraz: t.value,
        estimated: t.estimated,
        bestTaraz: maxTaraz,
        rank: logic.rankOf(percent, peers).rank
      };
    }).sort(function (a, b) { return b.total - a.total; });
  }

  function comparisonFor(attempt, exam, questions) {
    var prev = store.previousAttempt(attempt.examId, attempt.userId, attempt.id);
    if (!prev) return { prev: null };
    var cmp = logic.compareAttempts(questions, attempt.answers, prev.answers);
    return {
      prev: prev,
      improved: cmp.improved,
      regressed: cmp.regressed,
      kept: cmp.kept,
      comparable: cmp.comparable,
      delta: attemptPercent(attempt) - attemptPercent(prev)
    };
  }

  /** کارنامه کامل یک تلاش */
  function build(attemptId) {
    var attempt = store.getAttempt(attemptId);
    if (!attempt) return null;
    var exam = store.getExam(attempt.examId);
    if (!exam) return null;
    var student = store.getStudent(attempt.userId);
    var questions = store.examQuestions(exam);
    var rows = participants(exam.id);
    var result = logic.grade(questions, attempt.answers);

    var subjects = subjectRows(exam, attempt, rows);
    var weighted = logic.weightedTaraz(subjects.map(function (s) {
      return { percent: s.percent, peers: s.peers, coefficient: s.coefficient };
    }));
    var t = { value: weighted.value, estimated: weighted.estimated, method: 'weighted' };
    var tarazes = rows.map(function (r) { return r.taraz; });
    var rank = logic.rankOf(weighted.value, tarazes);
    var classRows = rows.filter(function (r) {
      return (r.classId || store.OTHER_CLASS_ID) === (student ? (student.classId || store.OTHER_CLASS_ID) : null);
    });
    var classRank = logic.rankOf(weighted.value, classRows.map(function (r) { return r.taraz; }));

    var sheet = questions.map(function (q) {
      var chosen = logic.chosenOf(attempt.answers, q.id);
      return {
        index: questions.indexOf(q) + 1,
        id: q.id,
        chosen: chosen,
        status: logic.statusOf(q.correct, chosen)
      };
    });

    return {
      attempt: attempt,
      exam: exam,
      examTitle: exam.title,
      student: student,
      classObj: student ? store.getClass(student.classId || store.OTHER_CLASS_ID) : null,
      isPractice: !!attempt.practice,
      questions: questions,
      result: result,
      percent: attemptPercent(attempt),
      score20: logic.score20(attemptPercent(attempt)),
      taraz: weighted.value,
      tarazInfo: weighted,
      rank: rank,
      classRank: classRank,
      subjects: subjects,
      sheet: sheet,
      topExam: topRanks(exam, null, 3),
      topClass: topRanks(exam, student ? (student.classId || store.OTHER_CLASS_ID) : null, 3),
      comparison: comparisonFor(attempt, exam, questions),
      incidents: attempt.incidents || [],
      timeSec: secondsBetween(attempt.startedAt, attempt.submittedAt),
      participantsCount: rows.length
    };
  }

  /* ---------------- خلاصه دانش‌آموز ---------------- */

  function studentSummary(studentId) {
    var student = store.getStudent(studentId);
    if (!student) return null;
    var attempts = store.doneAttemptsOfUser(studentId).slice().reverse(); /* قدیمی → جدید */
    var real = attempts.filter(function (a) { return !a.practice; });
    var percents = real.map(attemptPercent);
    var tarazes = real.map(function (a) {
      var exam = store.getExam(a.examId);
      if (!exam) return 5000;
      var rows = participants(exam.id);
      var mine = rows.filter(function (r) { return r.attempt.id === a.id; })[0];
      if (mine) return mine.taraz;
      var subs = subjectRows(exam, a, rows);
      return logic.weightedTaraz(subs.map(function (s) {
        return { percent: s.percent, peers: s.peers, coefficient: s.coefficient };
      })).value;
    });
    var st = logic.stats(percents);
    return {
      student: student,
      classObj: store.getClass(student.classId || store.OTHER_CLASS_ID),
      attempts: attempts,
      tarazes: tarazes,
      count: real.length,
      practiceCount: attempts.length - real.length,
      avgPercent: real.length ? Math.round(st.mean) : 0,
      bestPercent: real.length ? Math.max.apply(null, percents) : 0,
      bestTaraz: tarazes.length ? Math.max.apply(null, tarazes) : 0,
      avgTaraz: tarazes.length ? Math.round(tarazes.reduce(function (s, v) { return s + v; }, 0) / tarazes.length) : 0
    };
  }

  /** ماتریس کلاس: دانش‌آموز × آزمون */
  function classMatrix(classId) {
    var cls = store.getClass(classId);
    var students = store.studentsOfClass(classId);
    var exams = store.listExams({ classId: classId }).slice(0, 8);
    var matrix = students.map(function (s) {
      return {
        student: s,
        cells: exams.map(function (e) {
          var a = store.doneAttemptsOfUser(s.id).filter(function (x) { return x.examId === e.id; })[0];
          return a ? { percent: attemptPercent(a), attemptId: a.id } : null;
        })
      };
    });
    return { classObj: cls, students: students, exams: exams, matrix: matrix };
  }

  /* ---------------- CSV ---------------- */

  function csvExam(examId) {
    var exam = store.getExam(examId);
    var rows = participants(examId);
    var headers = ['رتبه', 'دانش‌آموز', 'نام کاربری', 'کلاس', 'تعداد سوال', 'صحیح', 'غلط', 'سفید',
      'درصد', 'نمره از ۲۰', 'تراز', 'زمان (ثانیه)', 'تاریخ ارسال', 'تخلف'];
    var body = rows.map(function (r) {
      var cls = store.getClass(r.classId || store.OTHER_CLASS_ID);
      return [
        r.rank, r.name, r.username, cls ? cls.name : '', r.total,
        r.correct, r.wrong, r.blank, r.percent, r.score20, r.taraz,
        r.timeSec, r.attempt.submittedAt, r.incidents
      ];
    });
    return {
      filename: 'exam-' + (exam ? exam.id : 'report') + '.csv',
      content: logic.toCSV(body, headers)
    };
  }

  function csvClass(classId) {
    var cls = store.getClass(classId);
    var students = store.studentsOfClass(classId);
    var exams = store.listExams({ classId: classId });
    var headers = ['دانش‌آموز', 'نام کاربری', 'آزمون', 'تاریخ', 'تعداد سوال', 'صحیح', 'غلط', 'سفید',
      'درصد', 'نمره از ۲۰', 'تراز', 'رتبه', 'زمان (ثانیه)', 'تخلف'];
    var body = [];
    students.forEach(function (s) {
      exams.forEach(function (exam) {
        var attempts = store.doneAttemptsOfUser(s.id).filter(function (a) { return a.examId === exam.id; });
        if (!attempts.length) return;
        var rows = participants(exam.id);
        attempts.forEach(function (a) {
          var mine = rows.filter(function (r) { return r.attempt.id === a.id; })[0];
          body.push([
            s.name, s.username, exam.title, a.submittedAt, a.total,
            a.correct, a.wrong, a.blank, attemptPercent(a), logic.score20(attemptPercent(a)),
            mine ? mine.taraz : 5000, mine ? mine.rank : '', secondsBetween(a.startedAt, a.submittedAt),
            (a.incidents || []).length
          ]);
        });
      });
    });
    return {
      filename: 'class-' + (cls ? cls.id : 'report') + '.csv',
      content: logic.toCSV(body, headers)
    };
  }

  function csvStudent(studentId) {
    var student = store.getStudent(studentId);
    var attempts = store.doneAttemptsOfUser(studentId).slice().reverse();
    var headers = ['آزمون', 'کلاس', 'تاریخ', 'تعداد سوال', 'صحیح', 'غلط', 'سفید', 'درصد', 'نمره از ۲۰', 'تراز', 'رتبه', 'زمان (ثانیه)', 'تخلف', 'تمرینی'];
    var body = attempts.map(function (a) {
      var exam = store.getExam(a.examId);
      var rows = exam ? participants(exam.id) : [];
      var mine = rows.filter(function (r) { return r.attempt.id === a.id; })[0];
      return [
        exam ? exam.title : '', student ? (store.getClass(student.classId || store.OTHER_CLASS_ID) || {}).name || '' : '',
        a.submittedAt, a.total, a.correct, a.wrong, a.blank, attemptPercent(a),
        logic.score20(attemptPercent(a)), mine ? mine.taraz : 5000, mine ? mine.rank : '',
        secondsBetween(a.startedAt, a.submittedAt), (a.incidents || []).length, a.practice ? 'بله' : 'خیر'
      ];
    });
    return {
      filename: 'student-' + (student ? student.username : 'report') + '.csv',
      content: logic.toCSV(body, headers)
    };
  }

  /* ---------------- داده تحلیل هوش مصنوعی ---------------- */

  /** درصد هر درس در یک تلاش */
  function subjectStatsForAttempt(exam, attempt) {
    var questions = store.examQuestions(exam);
    var groups = {};
    questions.forEach(function (q) {
      var key = subjectKey(q);
      (groups[key] = groups[key] || []).push(q);
    });
    return Object.keys(groups).map(function (key) {
      var qs = groups[key];
      var correct = 0;
      qs.forEach(function (q) {
        if (logic.statusOf(q.correct, logic.chosenOf(attempt.answers, q.id)) === 'correct') correct++;
      });
      return {
        subject: key,
        total: qs.length,
        correct: correct,
        percent: logic.percentOf(correct, qs.length)
      };
    });
  }

  /** کل سابقه دانش‌آموز تا لحظه این آزمون */
  function historyPayload(report) {
    var student = report.student;
    var empty = {
      attempts: [], totalAttempts: 0, avgPercent: 0, bestPercent: 0,
      worstPercent: 0, deltaFromFirst: 0, subjects: []
    };
    if (!student) return empty;

    var currentTime = new Date(report.attempt.submittedAt || report.attempt.startedAt).getTime();
    var all = store.doneAttemptsOfUser(student.id).filter(function (a) {
      return new Date(a.submittedAt || a.startedAt).getTime() <= currentTime;
    });
    var chrono = all.slice().reverse();

    var attempts = chrono.map(function (a) {
      var exam = store.getExam(a.examId);
      var rows = exam ? participants(exam.id) : [];
      var mine = rows.filter(function (r) { return r.attempt.id === a.id; })[0];
      return {
        date: a.submittedAt,
        exam: exam ? exam.title : '—',
        practice: !!a.practice,
        percent: attemptPercent(a),
        score20: logic.score20(attemptPercent(a)),
        taraz: mine ? mine.taraz : null,
        rank: mine ? mine.rank : null,
        of: mine ? mine.of : null,
        minutes: Math.round(secondsBetween(a.startedAt, a.submittedAt) / 60),
        incidents: (a.incidents || []).length,
        subjects: exam ? subjectStatsForAttempt(exam, a) : []
      };
    });

    var realAttempts = attempts.filter(function (a) { return !a.practice; });

    var agg = {};
    realAttempts.forEach(function (at) {
      at.subjects.forEach(function (s) {
        agg[s.subject] = agg[s.subject] || { subject: s.subject, total: 0, correct: 0 };
        agg[s.subject].total += s.total;
        agg[s.subject].correct += s.correct;
      });
    });
    var subjects = Object.keys(agg).map(function (k) {
      return {
        subject: k,
        total: agg[k].total,
        correct: agg[k].correct,
        percent: logic.percentOf(agg[k].correct, agg[k].total)
      };
    }).sort(function (a, b) { return b.total - a.total; });

    var percents = realAttempts.map(function (a) { return a.percent; });
    var st = logic.stats(percents);

    return {
      attempts: attempts.slice(-12),
      totalAttempts: realAttempts.length,
      practiceCount: attempts.length - realAttempts.length,
      avgPercent: realAttempts.length ? Math.round(st.mean) : 0,
      bestPercent: realAttempts.length ? Math.max.apply(null, percents) : 0,
      worstPercent: realAttempts.length ? Math.min.apply(null, percents) : 0,
      firstPercent: percents.length ? percents[0] : 0,
      lastPercent: percents.length ? percents[percents.length - 1] : 0,
      deltaFromFirst: percents.length ? percents[percents.length - 1] - percents[0] : 0,
      subjects: subjects
    };
  }

  function classProfile(classObj) {
    if (!classObj) return null;
    var g = store.gradeInfo(classObj.grade);
    var m = store.majorInfo(classObj.major);
    return {
      name: classObj.name,
      grade: g ? g.fa : null,
      cycle: g ? (g.cycle === 'first' ? 'دوره اول' : 'دوره دوم') : null,
      major: m ? m.fa : null
    };
  }

  function analysisPayload(report) {
    var details = (report.result && report.result.details) || [];
    var examRows = report.exam ? participants(report.exam.id) : [];
    var examPercents = examRows.map(function (r) { return r.percent; });
    var examStats = logic.stats(examPercents);
    var history = historyPayload(report);

    return {
      student: report.student ? {
        name: report.student.name,
        username: report.student.username,
        class: classProfile(report.classObj)
      } : null,
      exam: {
        title: report.examTitle,
        date: report.attempt.submittedAt,
        durationMinutes: report.exam.durationMin,
        questions: report.result.total,
        participants: report.participantsCount,
        averagePercent: report.participantsCount ? Math.round(examStats.mean) : null,
        bestPercent: report.participantsCount ? Math.max.apply(null, examPercents) : null
      },
      thisAttempt: {
        percent: report.percent,
        score20: report.score20,
        taraz: report.taraz,
        tarazEstimated: report.tarazInfo.estimated,
        tarazMethod: 'weighted-by-coefficient',
        rank: report.rank.rank,
        rankOf: report.rank.of,
        classRank: report.classRank.rank,
        practice: !!report.isPractice,
        correct: report.result.correct,
        wrong: report.result.wrong,
        blank: report.result.blank,
        minutesSpent: Math.round(report.timeSec / 60),
        incidents: report.incidents.length
      },
      subjectsThisAttempt: report.subjects.map(function (s) {        return {
          subject: s.subject,
          coefficient: s.coefficient,
          questions: s.total,
          correct: s.correct,
          wrong: s.wrong,
          blank: s.blank,
          percent: s.percent,
          taraz: s.taraz,
          classBestPercent: s.bestPercent
        };
      }),
      questions: (report.questions || []).map(function (q, i) {
        var d = details[i];
        return {
          index: i + 1,
          subject: subjectKey(q),
          difficulty: q.difficulty,
          question: String(q.text || '').slice(0, 160),
          status: d ? d.status : 'blank'
        };
      }),
      previousAttempt: report.comparison.prev ? {
        date: report.comparison.prev.submittedAt,
        percent: attemptPercent(report.comparison.prev),
        delta: report.comparison.delta,
        improvedQuestions: report.comparison.improved.length,
        regressedQuestions: report.comparison.regressed.length
      } : null,
      history: history
    };
  }

  window.AZ.report = {
    participants: participants,
    examSummary: examSummary,
    topRanks: topRanks,
    build: build,
    studentSummary: studentSummary,
    classMatrix: classMatrix,
    csvExam: csvExam,
    csvClass: csvClass,
    csvStudent: csvStudent,
    analysisPayload: analysisPayload,
    historyPayload: historyPayload,
    subjectStatsForAttempt: subjectStatsForAttempt,
    secondsBetween: secondsBetween
  };
})();
