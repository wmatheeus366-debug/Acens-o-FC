/* CRAQUE — embute um loop de ambiente de torcida real (uso local/pessoal).
   Mesmo princípio das outras vendorizações do projeto: baixar/processar só em tempo de
   build, embutir como data-URI, nunca depender de rede em tempo de jogo.

   Fonte: Wikimedia Commons, "360703 eguobyte large-crowd-medium-distance-stereo.wav"
   (https://commons.wikimedia.org/wiki/File:360703_eguobyte_large-crowd-medium-distance-stereo.wav)
   — originalmente de freesound.org/people/eguobyte/sounds/360703/, licença **CC0**
   (domínio público, sem exigência de atribuição). Gravação real de ~1000 pessoas
   conversando num espaço grande — a própria descrição do autor já cita "sports game"
   como uso adequado.

   Processamento (tudo em JS puro, sem ffmpeg — indisponível neste ambiente):
   1. baixa o WAV original (57s, estéreo, 10.9 MB) e faz cache local
   2. recorta um trecho de ~14s do meio do áudio (evita ruído de manuseio do microfone
      nas pontas), com fade in/out de 0.4s pra looping sem estalo
   3. reduz de estéreo pra mono (média dos 2 canais — ambiente de fundo não precisa de
      separação espacial, e corta o tamanho pela metade)
   4. codifica em MP3 48kbps via lamejs (JS puro, sem binário nativo) — ~85 KB final

   Uso:  node scripts/vendor-stadium-crowd.mjs
   Cache: scripts/.cache/stadium-crowd.wav (gitignored) — rerodar é de graça.
   Saída: js/vendor/stadium-crowd.js  →  window.CQ_STADIUM_CROWD = "data:audio/mp3;base64,..." */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// o pacote lamejs (npm) tem um bug conhecido no entry point ESM/CJS padrão
// (`MPEGMode is not defined` — globals internos se perdem dependendo de como o pacote
// é importado). `lame.all.js` é o bundle "tudo em 1 função" que o próprio pacote usa
// pra uso direto via <script> no navegador — evaluado aqui do mesmo jeito que
// scripts/embed-crests.mjs já lê CQ.DATA de dentro de js/data.js.
function loadLame() {
  const src = fs.readFileSync(path.join(ROOT, "node_modules", "lamejs", "lame.all.js"), "utf8");
  return new Function(src + "\nreturn lamejs;")();
}
const CACHE = path.join(ROOT, "scripts", ".cache", "stadium-crowd.wav");
const OUT = path.join(ROOT, "js", "vendor", "stadium-crowd.js");
const URL = "https://upload.wikimedia.org/wikipedia/commons/a/a9/360703_eguobyte_large-crowd-medium-distance-stereo.wav";

const TRIM_START_S = 15, TRIM_DUR_S = 14, FADE_S = 0.4;

function parseWav(buf) {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("não é um WAV válido (RIFF/WAVE header ausente)");
  }
  let offset = 12, fmt = null, dataOffset = -1, dataLen = 0;
  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === "fmt ") {
      fmt = {
        audioFormat: buf.readUInt16LE(body), channels: buf.readUInt16LE(body + 2),
        sampleRate: buf.readUInt32LE(body + 4), bitsPerSample: buf.readUInt16LE(body + 14)
      };
    } else if (id === "data") { dataOffset = body; dataLen = size; }
    offset = body + size + (size % 2); // chunks são alinhados a 2 bytes
  }
  if (!fmt || dataOffset < 0) throw new Error("chunk fmt/data não encontrado no WAV");
  if (fmt.audioFormat !== 1 || fmt.bitsPerSample !== 16) throw new Error("esperado PCM 16-bit (encontrado formato=" + fmt.audioFormat + " bits=" + fmt.bitsPerSample + ")");
  return { fmt: fmt, data: buf.subarray(dataOffset, dataOffset + dataLen) };
}

async function main() {
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  let wavBuf;
  if (fs.existsSync(CACHE) && fs.statSync(CACHE).size > 0) {
    wavBuf = fs.readFileSync(CACHE);
    console.log("Usando cache: " + CACHE);
  } else {
    console.log("Baixando ambiente de torcida (Wikimedia Commons, CC0)...");
    const res = await fetch(URL);
    if (!res.ok) throw new Error("HTTP " + res.status);
    wavBuf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(CACHE, wavBuf);
  }

  const { fmt, data } = parseWav(wavBuf);
  const bytesPerFrame = 2 * fmt.channels; // 16-bit
  const totalFrames = Math.floor(data.length / bytesPerFrame);
  const startFrame = Math.min(totalFrames - 1, Math.round(TRIM_START_S * fmt.sampleRate));
  const durFrames = Math.min(totalFrames - startFrame, Math.round(TRIM_DUR_S * fmt.sampleRate));
  const fadeFrames = Math.round(FADE_S * fmt.sampleRate);

  // downmix pra mono (média dos canais) + recorte + fade in/out linear
  const mono = new Int16Array(durFrames);
  for (let i = 0; i < durFrames; i++) {
    const frameOff = (startFrame + i) * bytesPerFrame;
    let sum = 0;
    for (let c = 0; c < fmt.channels; c++) sum += data.readInt16LE(frameOff + c * 2);
    const s = sum / fmt.channels;
    let gain = 1;
    if (i < fadeFrames) gain = i / fadeFrames;
    else if (i > durFrames - fadeFrames) gain = (durFrames - i) / fadeFrames;
    mono[i] = Math.max(-32768, Math.min(32767, Math.round(s * gain)));
  }

  console.log("Codificando MP3 (lamejs, 48kbps mono)...");
  const lamejs = loadLame();
  const encoder = new lamejs.Mp3Encoder(1, fmt.sampleRate, 48);
  const chunks = [];
  const blockSize = 1152;
  for (let i = 0; i < mono.length; i += blockSize) {
    const chunk = mono.subarray(i, i + blockSize);
    const enc = encoder.encodeBuffer(chunk);
    if (enc.length > 0) chunks.push(Buffer.from(enc));
  }
  const end = encoder.flush();
  if (end.length > 0) chunks.push(Buffer.from(end));
  const mp3 = Buffer.concat(chunks);

  const b64 = mp3.toString("base64");
  const file = `/* CRAQUE — ambiente real de torcida embutido (gerado por
   scripts/vendor-stadium-crowd.mjs). NÃO editar à mão.
   Fonte: Wikimedia Commons, licença CC0 (domínio público) — ver cabeçalho do script
   pra créditos completos. ${(mp3.length / 1024).toFixed(0)} KB, ${TRIM_DUR_S}s, loop com
   fade in/out, mono 48kbps. */
window.CQ = window.CQ || {};
window.CQ_STADIUM_CROWD = "data:audio/mp3;base64,${b64}";
`;
  fs.writeFileSync(OUT, file, "utf8");
  console.log("js/vendor/stadium-crowd.js: " + (mp3.length / 1024).toFixed(0) + " KB (" + TRIM_DUR_S + "s mono 48kbps)");
}

main().catch(function (e) { console.error(e); process.exit(1); });
