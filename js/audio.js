/* CRAQUE — som sintetizado (Web Audio API, sem arquivos de áudio) + ambiente real de
   torcida (Howler.js + js/vendor/stadium-crowd.js, gravação real embutida, CC0 — ver
   scripts/vendor-stadium-crowd.mjs pra créditos completos).
   Off por padrão; liga/desliga persistido. Iniciado só após gesto do usuário. */
window.CQ = window.CQ || {};

(function () {
  "use strict";
  const KEY = "craque-sound";
  let ctx = null;
  let enabled = false;
  try { enabled = localStorage.getItem(KEY) === "1"; } catch (e) { }

  // ---------------- ambiente de torcida (Howler.js) ----------------
  const CROWD_VOL = 0.32, SWELL_VOL = 0.7;
  let howlCrowd = null;
  function crowdHowl() {
    if (!window.Howl || !window.CQ_STADIUM_CROWD) return null; // sem lib/áudio vendorizado — silencioso, nunca quebra a tela
    if (!howlCrowd) { try { howlCrowd = new window.Howl({ src: [window.CQ_STADIUM_CROWD], loop: true, volume: 0 }); } catch (e) { return null; } }
    return howlCrowd;
  }
  // toca em loop desde o apito inicial (ver js/ui.js renderLiveOverlay) até o fim da
  // partida (finishLive) — fade suave de entrada pra não soar como um "liga/desliga" seco
  function startCrowd() {
    if (!enabled) return;
    const h = crowdHowl(); if (!h) return;
    try { if (!h.playing()) { h.play(); h.fade(0, CROWD_VOL, 1200); } } catch (e) { }
  }
  function stopCrowd() {
    if (!howlCrowd) return;
    try {
      if (howlCrowd.playing()) {
        howlCrowd.fade(howlCrowd.volume(), 0, 700);
        setTimeout(function () { try { howlCrowd.stop(); } catch (e) { } }, 750);
      }
    } catch (e) { }
  }
  // reação rápida da torcida a um gol (qualquer lado) — sobe o volume um instante e
  // volta pro nível de ambiente de sempre; chamado de goalSplash (js/ui.js)
  function crowdSwell() {
    if (!enabled || !howlCrowd) return;
    try {
      if (!howlCrowd.playing()) return;
      howlCrowd.fade(CROWD_VOL, SWELL_VOL, 150);
      setTimeout(function () { try { if (howlCrowd.playing()) howlCrowd.fade(SWELL_VOL, CROWD_VOL, 900); } catch (e) { } }, 350);
    } catch (e) { }
  }

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, gain, when, glideTo) {
    const c = ac(); if (!c) return;
    const t0 = c.currentTime + (when || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t0);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.2, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function noise(dur, gain, filterFreq, when, sweepTo) {
    const c = ac(); if (!c) return;
    const t0 = c.currentTime + (when || 0);
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource(); src.buffer = buf;
    const flt = c.createBiquadFilter(); flt.type = "bandpass";
    flt.frequency.setValueAtTime(filterFreq || 1200, t0);
    if (sweepTo) flt.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(gain || 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(flt); flt.connect(g); g.connect(c.destination);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }

  const SOUNDS = {
    whistle: function () { tone(2100, 0.18, "sawtooth", 0.12, 0); tone(2650, 0.22, "square", 0.05, 0.02); },
    click: function () { tone(520, 0.05, "triangle", 0.05); },
    net: function () { noise(0.14, 0.18, 900, 0, 2400); },
    goal: function () { // rede + torcida crescendo
      noise(0.16, 0.2, 1000, 0, 2600);
      noise(1.1, 0.16, 480, 0.05, 900);
      tone(300, 0.5, "sawtooth", 0.05, 0.1, 520);
    },
    crowd: function () { noise(1.3, 0.1, 420, 0, 700); },
    miss: function () { tone(300, 0.25, "sine", 0.1, 0, 140); },
    trophy: function () { // fanfarra curta
      [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.3, "triangle", 0.12, i * 0.12); });
      noise(1.2, 0.12, 500, 0.1, 900);
    }
  };

  function play(name) {
    if (!enabled) return;
    const fn = SOUNDS[name];
    if (fn) { try { fn(); } catch (e) { } }
  }
  function setEnabled(v) {
    enabled = !!v;
    try { localStorage.setItem(KEY, enabled ? "1" : "0"); } catch (e) { }
    if (enabled) { ac(); play("click"); } else { stopCrowd(); } // desligar o som corta o ambiente na hora, não só os efeitos novos
  }
  function isEnabled() { return enabled; }

  CQ.audio = {
    play: play, setEnabled: setEnabled, isEnabled: isEnabled,
    startCrowd: startCrowd, stopCrowd: stopCrowd, crowdSwell: crowdSwell
  };
})();
