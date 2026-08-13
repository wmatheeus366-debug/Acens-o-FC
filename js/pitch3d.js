/* CRAQUE — campo 3D de verdade do modo Ao Vivo (Fatia 1), em cima de three.js
   (js/vendor/three.min.js + OrbitControls.js). Substitui o campo 2D (js/pitch.js)
   como renderizador — mas reaproveita 100% do "cérebro" dele sem mudar nada:
   CQ.pitch.FORMATION/poseFor/poseForKick continuam sendo a única fonte de "o que
   aconteceu e pra onde as coisas devem ir". Este arquivo só sabe desenhar isso em 3D.

   Jogadores são cilindro+esfera (silhueta simples, não um modelo humano rigged) nas
   cores reais do uniforme (club.c1/c2, mesmo dado que o brasão/campo 2D já usavam).
   Animação é tween de posição/escala (mesmo espírito determinístico-visual do campo
   2D: reação a evento discreto, não física/IA contínua).

   Dono de todo o estado WebGL (scene/camera/renderer/loop) — precisa de mount/
   unmount explícitos porque, ao contrário do SVG, o navegador tem limite de
   contextos WebGL simultâneos: nunca deixar um "vazar" entre partidas. */
window.CQ = window.CQ || {};

(function () {
  "use strict";
  const U = CQ.util;
  const PW = 100, PD = 64; // largura (x) e profundidade (z) do campo, em unidades 3D

  // % (0-100, mesmo espaço de CQ.pitch.FORMATION/poseFor) → coordenada 3D no chão
  function toWorld(xPct, yPct) {
    return { x: (xPct / 100 - 0.5) * PW, z: (yPct / 100 - 0.5) * PD };
  }

  function hexColor(hex) {
    return new THREE.Color(hex || "#888888");
  }

  // textura do gramado com as linhas pintadas — mesmo truque que crestSVG/jerseySVG já
  // usam pra "desenhar" (só que aqui vira textura em vez de elemento SVG visível)
  function pitchTexture() {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 656;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#1a6b3c";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "rgba(255,255,255,0.035)";
    for (let i = 0; i < 10; i += 2) ctx.fillRect(i * c.width / 10, 0, c.width / 10, c.height);
    ctx.strokeStyle = "#f2f2f2";
    ctx.lineWidth = 4;
    const m = 22;
    ctx.strokeRect(m, m, c.width - m * 2, c.height - m * 2);
    ctx.beginPath(); ctx.moveTo(c.width / 2, m); ctx.lineTo(c.width / 2, c.height - m); ctx.stroke();
    ctx.beginPath(); ctx.arc(c.width / 2, c.height / 2, 72, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeRect(m, c.height / 2 - 132, 92, 264);
    ctx.strokeRect(c.width - m - 92, c.height / 2 - 132, 92, 264);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  function makePlayerMesh(club, isMe, num) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 3.2, 10), new THREE.MeshLambertMaterial({ color: hexColor(club && club.c1) }));
    body.position.y = 1.9;
    const shorts = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.1, 1, 10), new THREE.MeshLambertMaterial({ color: hexColor(club && club.c2) }));
    shorts.position.y = 0.5;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 8), new THREE.MeshLambertMaterial({ color: 0xe8b98a }));
    head.position.y = 4.1;
    g.add(body, shorts, head);
    if (isMe) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.15, 6, 20), new THREE.MeshBasicMaterial({ color: 0xd4af37 }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.12;
      g.add(ring);
    }
    return g;
  }

  let state = null; // { renderer, scene, camera, controls, container, ball, players, mineKey, tweens, raf, resizeObs, holding }

  function disposeScene(scene) {
    scene.traverse(function (obj) {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); });
      }
    });
  }

  function unmount() {
    if (!state) return;
    cancelAnimationFrame(state.raf);
    if (state.resizeObs) state.resizeObs.disconnect();
    else window.removeEventListener("resize", state.onWinResize);
    disposeScene(state.scene);
    state.renderer.dispose();
    if (state.container) state.container.innerHTML = "";
    state = null;
  }

  function mount(container, fx, res, player) {
    if (!container || typeof THREE === "undefined") return;
    unmount(); // nunca 2 cenas/contextos WebGL ao mesmo tempo

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1a12);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    camera.position.set(0, 62, 78);
    camera.lookAt(0, 0, 0);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch (e) {
      container.innerHTML = '<div class="pv3-fallback">Seu navegador não suporta o campo 3D aqui — resultado da partida não é afetado.</div>';
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x223311, 0.9));
    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(30, 60, 20);
    scene.add(sun);

    const pitchMesh = new THREE.Mesh(new THREE.PlaneGeometry(PW, PD), new THREE.MeshLambertMaterial({ map: pitchTexture() }));
    pitchMesh.rotation.x = -Math.PI / 2;
    scene.add(pitchMesh);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.minDistance = 30;
    controls.maxDistance = 140;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // nunca deixa a câmera ir abaixo do gramado
    controls.enablePan = false;
    controls.update();

    const mine = fx.myTeam, opp = fx.opp;
    const FORMATION = CQ.pitch.FORMATION;
    const players = {};
    let mineIdx = -1;
    if (res && res.plays && player) mineIdx = FORMATION.findIndex(function (f) { return f.pos === player.pos; });
    FORMATION.forEach(function (f, i) {
      const wm = toWorld(f.x, f.y);
      const meshMine = makePlayerMesh(mine, i === mineIdx, player && player.num);
      meshMine.position.set(wm.x, 0, wm.z);
      scene.add(meshMine);
      players["m" + i] = meshMine;
      const wo = toWorld(100 - f.x, f.y);
      const meshOpp = makePlayerMesh(opp, false);
      meshOpp.position.set(wo.x, 0, wo.z);
      scene.add(meshOpp);
      players["o" + i] = meshOpp;
    });

    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 10), new THREE.MeshStandardMaterial({ color: 0xf7f2e4 }));
    ball.position.set(0, 0.9, 0);
    scene.add(ball);

    state = {
      renderer: renderer, scene: scene, camera: camera, controls: controls, container: container,
      ball: ball, players: players, mineKey: mineIdx >= 0 ? "m" + mineIdx : null,
      tweens: [], raf: 0, resizeObs: null, holding: false
    };

    function resize() {
      const w = container.clientWidth || 1, h = container.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    resize();
    if (window.ResizeObserver) {
      state.resizeObs = new ResizeObserver(resize);
      state.resizeObs.observe(container);
    } else {
      state.onWinResize = resize;
      window.addEventListener("resize", resize);
    }

    function tick() {
      if (!state) return;
      const now = performance.now();
      state.tweens = state.tweens.filter(function (tw) {
        const t = Math.min(1, (now - tw.start) / tw.dur);
        const e = 1 - Math.pow(1 - t, 3);
        tw.apply(e);
        if (t >= 1) { if (tw.onDone) tw.onDone(); return false; }
        return true;
      });
      if (state.holding) ball.position.y = 0.9 + Math.sin(now / 220) * 0.25;
      controls.update();
      renderer.render(scene, camera);
      state.raf = requestAnimationFrame(tick);
    }
    tick();
  }

  function addTween(from, to, dur, apply, onDone) {
    state.tweens.push({ start: performance.now(), dur: dur, apply: function (e) { apply(from, to, e); }, onDone: onDone });
  }

  function tweenBallTo(xPct, yPct, dur) {
    const target = toWorld(xPct, yPct);
    const from = { x: state.ball.position.x, z: state.ball.position.z };
    addTween(from, target, dur || 650, function (f, t, e) {
      state.ball.position.x = f.x + (t.x - f.x) * e;
      state.ball.position.z = f.z + (t.z - f.z) * e;
    });
  }

  function pulse(mesh) {
    if (!mesh) return;
    addTween(0, 1, 500, function (f, t, e) {
      const s = 1 + Math.sin(e * Math.PI) * 0.5;
      mesh.scale.set(s, s, s);
    }, function () { mesh.scale.set(1, 1, 1); });
  }

  function flashGoal(side) {
    const x = side === "right" ? PW / 2 - 2 : -(PW / 2 - 2);
    const light = new THREE.PointLight(0xfff4c2, 6, 40);
    light.position.set(x, 8, 0);
    state.scene.add(light);
    addTween(6, 0, 550, function (f, t, e) { light.intensity = f + (t - f) * e; }, function () { state.scene.remove(light); light.dispose(); });
  }

  function showBadge(emoji) {
    const c = document.createElement("canvas");
    c.width = 128; c.height = 128;
    const ctx = c.getContext("2d");
    ctx.font = "88px sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(emoji, 64, 70);
    const tex = new THREE.CanvasTexture(c);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0 }));
    spr.scale.set(8, 8, 1);
    spr.position.set(0, 14, 0);
    state.scene.add(spr);
    addTween(0, 1, 1600, function (f, t, e) {
      spr.material.opacity = Math.max(0, e < 0.15 ? e / 0.15 : e > 0.8 ? (1 - e) / 0.2 : 1);
      spr.position.y = 14 + e * 3;
    }, function () { state.scene.remove(spr); tex.dispose(); spr.material.dispose(); });
  }

  // mesmo formato de pose que o campo 2D já consome (js/pitch.js poseFor/poseForKick)
  // — só muda COMO reage (tween 3D em vez de classe/transform SVG).
  function applyPose(pose) {
    if (!state || !pose) return;
    if (pose.ball) tweenBallTo(pose.ball[0], pose.ball[1]);
    if (pose.goalSide) flashGoal(pose.goalSide);
    const FN = CQ.pitch.FORMATION.length;
    if (pose.highlight === "me") pulse(state.players[state.mineKey]);
    else if (pose.highlight === "mate") {
      const idxs = [];
      for (let i = 0; i < FN; i++) if ("m" + i !== state.mineKey) idxs.push(i);
      pulse(state.players["m" + idxs[U.ri(0, idxs.length - 1)]]);
    } else if (pose.highlight === "opp") {
      pulse(state.players["o" + U.ri(0, FN - 1)]);
    }
    state.holding = !!pose.hold;
    if (!pose.hold) state.ball.position.y = 0.9;
    if (pose.badge) showBadge(pose.badge);
  }

  CQ.pitch3d = { mount: mount, applyPose: applyPose, unmount: unmount, toWorld: toWorld };
})();
