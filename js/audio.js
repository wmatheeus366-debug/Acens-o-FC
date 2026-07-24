/* CRAQUE — som sintetizado (Web Audio API, sem arquivos de áudio).
   Off por padrão; liga/desliga persistido. Iniciado só após gesto do usuário. */
window.CQ = window.CQ || {};

(function () {
  "use strict";
  const KEY = "craque-sound";
  let ctx = null;
  let enabled = false;
  try { enabled = localStorage.getItem(KEY) === "1"; } catch (e) { }

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
    if (enabled) { ac(); play("click"); }
  }
  function isEnabled() { return enabled; }

  CQ.audio = { play: play, setEnabled: setEnabled, isEnabled: isEnabled };
})();
