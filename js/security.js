/* ============================================================
   ط¢ط²ظ…ظˆظ†â€ŒغŒط§ط± â€” ظ¾ط§غŒط´ ط§ظ…ظ†غŒطھغŒ ط¢ط²ظ…ظˆظ†
   طھط´ط®غŒطµ طھط؛غŒغŒط± طھط¨/ظ¾ظ†ط¬ط±ظ‡طŒ طھظ„ط§ط´ ط¨ط±ط§غŒ ط§ط³ع©ط±غŒظ†â€Œط´ط§طھطŒ ع©ظ¾غŒطŒ ع†ط§ظ¾ ظˆ
   ط®ط±ظˆط¬ ط§ط² ط­ط§ظ„طھ طھظ…ط§ظ…â€Œطµظپط­ظ‡ + (ط§ط®طھغŒط§ط±غŒ) طھطµظˆغŒط± ط¯ظˆط±ط¨غŒظ†
   ============================================================ */
(function () {
  'use strict';

  var active = false;
  var handler = null;
  var lastFired = {};
  var cameraStream = null;
  var videoEl = null;
  var cleanups = [];

  function nowMs() { return Date.now(); }

  function fire(type) {
    if (!active || !handler) return;
    var ms = nowMs();
    if (lastFired[type] && ms - lastFired[type] < 1200) return;   /* ط¶ط¯ظ‘ ط³غŒظ„ ط±ط®ط¯ط§ط¯ */
    lastFired[type] = ms;
    handler({
      type: type,
      at: new Date().toISOString(),
      image: (type === 'printScreen' || type === 'tabSwitch') ? capture() : ''
    });
  }

  function on(target, event, fn, opts) {
    target.addEventListener(event, fn, opts);
    cleanups.push(function () { target.removeEventListener(event, fn, opts); });
  }

  function attach(opts) {
    if (active) return;
    active = true;
    handler = (opts && opts.onIncident) || null;

    on(document, 'visibilitychange', function () {
      if (document.visibilityState === 'hidden') fire('tabSwitch');
    });

    on(window, 'blur', function () { fire('blur'); });

    on(document, 'keydown', function (e) {
      var key = e.key || '';
      var code = e.code || '';
      if (key === 'PrintScreen' || code === 'PrintScreen') {
        fire('printScreen');
      } else if ((e.ctrlKey || e.metaKey) && (key === 'p' || key === 'P')) {
        fire('print');
      } else if (key === 'F12') {
        fire('printScreen');
      }
    });

    on(document, 'copy', function (e) {
      fire('copy');
      e.preventDefault();
    });
    on(document, 'cut', function (e) { fire('copy'); e.preventDefault(); });
    on(document, 'paste', function (e) { fire('paste'); e.preventDefault(); });
    on(document, 'contextmenu', function (e) {
      fire('contextmenu');
      e.preventDefault();
    });

    on(document, 'fullscreenchange', function () {
      if (!document.fullscreenElement) fire('fullscreenExit');
    });

    /* ظ‡ط´ط¯ط§ط± ط¨ط³طھظ† طµظپط­ظ‡ ط¯ط± ظ…غŒط§ظ†ظ‡ ط¢ط²ظ…ظˆظ† */
    var beforeUnload = function (e) {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    cleanups.push(function () { window.removeEventListener('beforeunload', beforeUnload); });
  }

  function detach() {
    active = false;
    handler = null;
    cleanups.forEach(function (fn) { fn(); });
    cleanups = [];
    lastFired = {};
    stopCamera();
  }

  function enterFullscreen() {
    try {
      var el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) {
        var p = el.requestFullscreen();
        if (p && p.catch) p.catch(function () { /* ع©ط§ط±ط¨ط± ط±ط¯ ع©ط±ط¯ */ });
      }
    } catch (e) { /* ignore */ }
  }

  /** اشتراک صفحه دستگاه (به‌جای دوربین) — نیازمند اجازه و کلیک کاربر */
  function startScreen() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      return Promise.resolve({ ok: false, reason: 'unsupported' });
    }
    if (cameraStream) return Promise.resolve({ ok: true });
    return navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: 'monitor' },
      audio: false
    }).then(function (stream) {
      cameraStream = stream;
      videoEl = document.createElement('video');
      videoEl.srcObject = stream;
      videoEl.muted = true;
      videoEl.playsInline = true;
      var play = videoEl.play();
      if (play && play.catch) play.catch(function () { /* ignore */ });
      var track = stream.getVideoTracks()[0];
      if (track && track.addEventListener) {
        track.addEventListener('ended', function () {
          if (active) fire('screenStop');
          cameraStream = null;
          videoEl = null;
        });
      }
      return { ok: true };
    }).catch(function (err) {
      return { ok: false, reason: (err && err.name) || 'denied' };
    });
  }

  function capture() {
    if (!cameraStream || !videoEl || !videoEl.videoWidth) return '';
    try {
      var w = 480;
      var h = Math.max(1, Math.round((videoEl.videoHeight / videoEl.videoWidth) * w));
      var canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(videoEl, 0, 0, w, h);
      return canvas.toDataURL('image/jpeg', 0.6);
    } catch (e) {
      return '';
    }
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(function (tr) { try { tr.stop(); } catch (e) { /* ignore */ } });
      cameraStream = null;
    }
    videoEl = null;
  }

  window.AZ.security = {
    attach: attach,
    detach: detach,
    enterFullscreen: enterFullscreen,
    startScreen: startScreen,
    stopCamera: stopCamera,
    capture: capture,
    isScreenActive: function () { return !!cameraStream; },
    isActive: function () { return active; }
  };
})();

