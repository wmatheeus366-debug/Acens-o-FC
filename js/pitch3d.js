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

  // bonequinho de verdade (cabeça+pescoço+tronco+braços+pernas+chuteira), não mais um
  // cone/cilindro achatado — usa CapsuleGeometry (confirmada presente no build r140
  // vendorizado) pra tronco/braços/pernas terem ponta arredondada em vez de topo reto,
  // que era o que dava a cara de "peão de baralho" na primeira versão desta fatia.
  function makePlayerMesh(club, isMe, num) {
    const g = new THREE.Group();
    const skin = 0xe8b98a, boots = 0x201c17;
    const jerseyC = hexColor(club && club.c1), shortsC = hexColor(club && club.c2);
    const mat = function (c) { return new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, metalness: 0.05 }); };

    // pernas (base no chão, y=0) — cápsula fina, ponta arredondada em vez de cilindro reto
    const legGeo = new THREE.CapsuleGeometry(0.24, 0.75, 3, 8);
    const legMat = mat(skin);
    const legL = new THREE.Mesh(legGeo, legMat); legL.position.set(-0.3, 0.615, 0);
    const legR = new THREE.Mesh(legGeo, legMat); legR.position.set(0.3, 0.615, 0);
    // chuteiras
    const bootGeo = new THREE.BoxGeometry(0.32, 0.18, 0.52);
    const bootMat = mat(boots);
    const bootL = new THREE.Mesh(bootGeo, bootMat); bootL.position.set(-0.3, 0.1, 0.07);
    const bootR = new THREE.Mesh(bootGeo, bootMat); bootR.position.set(0.3, 0.1, 0.07);
    // shorts (cilindro curto, mais largo que a perna — cintura visível)
    const shorts = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.68, 0.55, 10), mat(shortsC));
    shorts.position.y = 1.505;
    // tronco (cápsula — camisa)
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 0.5, 4, 10), mat(jerseyC));
    torso.position.y = 2.53;
    // braços (cápsulas finas, levemente abertas do corpo — silhueta reconhecível de
    // qualquer ângulo da câmera, não só de frente)
    const armGeo = new THREE.CapsuleGeometry(0.18, 0.85, 3, 8);
    const armMat = mat(jerseyC);
    const armL = new THREE.Mesh(armGeo, armMat); armL.position.set(-0.78, 2.62, 0); armL.rotation.z = 0.22;
    const armR = new THREE.Mesh(armGeo, armMat); armR.position.set(0.78, 2.62, 0); armR.rotation.z = -0.22;
    // pescoço + cabeça
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.22, 8), mat(skin));
    neck.position.y = 3.39;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), mat(skin));
    head.position.y = 4.0;

    g.add(legL, legR, bootL, bootR, shorts, torso, armL, armR, neck, head);
    if (isMe) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.1, 6, 20), new THREE.MeshBasicMaterial({ color: 0xd4af37 }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.06;
      g.add(ring);
    }
    return g;
  }

  // ---------- atmosfera de estádio (arquibancada/torcida/refletor/placa) ----------
  // Estilizado, não fotorrealista — nada de modelar pessoa por pessoa (caro à toa pra
  // 22+ marcadores já em cena); a "torcida" é uma textura repetida de pontinhos
  // coloridos numa parede reta ao redor do campo, no mesmo espírito de "desenhar com
  // canvas 2D" que pitchTexture()/jerseySVG já usam no resto do projeto.
  function crowdTexture() {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 96;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#14141c";
    ctx.fillRect(0, 0, c.width, c.height);
    const palette = ["#e8e2cf", "#c9302c", "#2a5aa0", "#f2c500", "#1b1812", "#ffffff", "#3a7d44"];
    for (let row = 0; row < 12; row++) {
      for (let col = 0; col < 64; col++) {
        if (Math.random() < 0.88) {
          ctx.fillStyle = palette[(Math.random() * palette.length) | 0];
          ctx.fillRect(col * 4 + (row % 2 ? 2 : 0), row * 8, 3, 5);
        }
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(10, 2);
    return tex;
  }

  // céu do fundo: um gradiente simples (não esfera 360°) — scene.background aceita uma
  // textura comum, fica fixo em relação à tela (não gira com a câmera), exatamente o
  // que se quer de um pano de fundo de "céu ao longe".
  function skyTexture() {
    const c = document.createElement("canvas");
    c.width = 4; c.height = 256;
    const ctx = c.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, 0, c.height);
    grad.addColorStop(0, "#0a1a2e");
    grad.addColorStop(0.55, "#16324f");
    grad.addColorStop(1, "#3c5f6e");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, c.width, c.height);
    return new THREE.CanvasTexture(c);
  }

  // placa de publicidade nas cores do time do jogador — toque de personalização barato
  function adBoardTexture(c1, c2) {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 32;
    const ctx = c.getContext("2d");
    ctx.fillStyle = c1 || "#b8330f"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = c2 || "#f5efdf";
    for (let i = 0; i < 8; i++) ctx.fillRect(i * 32, 0, 16, c.height);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.set(6, 1);
    return tex;
  }

  // arquibancada = 4 paredes retas ao redor do campo (não arquibancada escalonada de
  // verdade — geometria simples de propósito, dá a silhueta de "estádio" sem precisar
  // de rotação/inclinação por lado, que seria bem mais código pro mesmo resultado
  // visual a essa distância de câmera). refletores = poste+luz nos 4 cantos.
  function buildStadium(scene, myTeam) {
    const wallH = 15, gap = 5, corner = 10;
    const standMat = new THREE.MeshLambertMaterial({ map: crowdTexture() });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x14141c });
    function wall(w, d, x, z) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), standMat);
      box.position.set(x, wallH / 2, z);
      scene.add(box);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1.5, 0.8, d + 1.5), roofMat);
      roof.position.set(x, wallH + 0.6, z);
      scene.add(roof);
    }
    wall(PW + corner * 2, 2, 0, -(PD / 2 + gap));
    wall(PW + corner * 2, 2, 0, PD / 2 + gap);
    wall(2, PD + corner * 2, -(PW / 2 + gap), 0);
    wall(2, PD + corner * 2, PW / 2 + gap, 0);

    // placa de publicidade — mais perto do campo que a arquibancada, cores do time
    const adTex = adBoardTexture(myTeam && myTeam.c1, myTeam && myTeam.c2);
    const adMat = new THREE.MeshBasicMaterial({ map: adTex });
    function adBoard(w, d, x, z) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, 1.4, d), adMat);
      box.position.set(x, 0.7, z);
      scene.add(box);
    }
    adBoard(PW + 4, 0.6, 0, -(PD / 2 + 1.8));
    adBoard(PW + 4, 0.6, 0, PD / 2 + 1.8);
    adBoard(0.6, PD + 4, -(PW / 2 + 1.8), 0);
    adBoard(0.6, PD + 4, PW / 2 + 1.8, 0);

    // refletores nos 4 cantos, além da arquibancada
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6 });
    const fixMat = new THREE.MeshStandardMaterial({ color: 0xf4efe2, emissive: 0x554422, roughness: 0.4 });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (sgn) {
      const x = sgn[0] * (PW / 2 + gap + corner - 2), z = sgn[1] * (PD / 2 + gap + corner - 2);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 28, 8), poleMat);
      pole.position.set(x, 14, z);
      scene.add(pole);
      const fix = new THREE.Mesh(new THREE.BoxGeometry(4, 2.4, 1.2), fixMat);
      fix.position.set(x, 28.5, z);
      fix.lookAt(0, 10, 0);
      scene.add(fix);
      const lamp = new THREE.PointLight(0xfff4d6, 0.9, 140);
      lamp.position.set(x, 27, z);
      scene.add(lamp);
    });
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
    scene.background = skyTexture();
    scene.fog = new THREE.Fog(0x16324f, 90, 260); // névoa sutil funde a arquibancada no céu ao longe
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    camera.position.set(0, 42, 88); // ângulo mais baixo/"transmissão de TV" que a versão anterior (era 0,62,78)
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
    buildStadium(scene, fx.myTeam);

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
