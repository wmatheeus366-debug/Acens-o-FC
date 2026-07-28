/* CRAQUE — bootstrap, estado global e tema. Persistência mora em js/save.js (CQ.save). */
window.CQ = window.CQ || {};

(function () {
  "use strict";

  CQ.state = {
    game: null, screen: "cover",
    ctab: "attrs", ttab: "liga", clubTab: "info", feedFilter: "all",
    draft: null, live: null, itv: null, lifeEv: null, champFilter: "BRA", summary: null,
    lastSeen: { money: null, fame: null, marcos: {} }
  };

  // ---------- tema (claro / escuro) ----------
  const THEME_KEY = "craque-theme";
  const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/></svg>';
  const MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 14.5A8 8 0 019.5 4 7 7 0 1020 14.5z"/></svg>';

  function getTheme() {
    try { return localStorage.getItem(THEME_KEY) || "dark"; } catch (e) { return "dark"; }
  }
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) { }
    updateThemeFab(t);
  }
  function toggleTheme() { applyTheme(getTheme() === "dark" ? "light" : "dark"); }
  function updateThemeFab(t) {
    const fab = document.getElementById("theme-fab");
    if (!fab) return;
    fab.innerHTML = t === "dark" ? SUN + "<span>Tema claro</span>" : MOON + "<span>Tema escuro</span>";
    fab.setAttribute("aria-label", t === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro");
  }
  function mountThemeFab() {
    let fab = document.getElementById("theme-fab");
    if (!fab) {
      fab = document.createElement("button");
      fab.id = "theme-fab";
      fab.className = "theme-fab";
      fab.type = "button";
      fab.onclick = toggleTheme;
      document.body.appendChild(fab);
    }
    updateThemeFab(getTheme());
  }

  // ---------- som (liga/desliga) ----------
  const SND_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8.5a4 4 0 010 7M18.5 6a7.5 7.5 0 010 12"/></svg>';
  const SND_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9.5l4 5M21 9.5l-4 5"/></svg>';
  function updateSoundFab() {
    const fab = document.getElementById("sound-fab");
    if (!fab || !CQ.audio) return;
    const on = CQ.audio.isEnabled();
    fab.className = "sound-fab" + (on ? " on" : "");
    fab.innerHTML = (on ? SND_ON : SND_OFF) + "<span>" + (on ? "Som ligado" : "Som") + "</span>";
    fab.setAttribute("aria-label", on ? "Desligar som" : "Ligar som");
  }
  function mountSoundFab() {
    if (!CQ.audio) return;
    let fab = document.getElementById("sound-fab");
    if (!fab) {
      fab = document.createElement("button");
      fab.id = "sound-fab"; fab.type = "button";
      fab.onclick = function () { CQ.audio.setEnabled(!CQ.audio.isEnabled()); updateSoundFab(); };
      document.body.appendChild(fab);
    }
    updateSoundFab();
  }

  // CQ.main reexporta a persistência (compatível com todas as chamadas CQ.main.*)
  CQ.main = Object.assign({}, CQ.save, {
    toggleTheme: toggleTheme, applyTheme: applyTheme, getTheme: getTheme
  });

  document.addEventListener("DOMContentLoaded", function () {
    document.documentElement.setAttribute("data-theme", getTheme());
    const existing = CQ.save.load();
    if (existing) {
      CQ.state.game = existing;
      CQ.state.screen = existing.retired ? "retro" : "home";
    }
    CQ.ui.render();
    mountThemeFab();
    mountSoundFab();
  });
})();
