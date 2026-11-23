// Generates soft ambient demo tracks used by the mock data layer.
// These are synthesized placeholders for UI demonstration, not dialect recordings.
import fs from "node:fs";
import path from "node:path";

const sampleRate = 12000;
const tracks = [
  { name: "ambient-1.wav", seconds: 62 },
  { name: "ambient-2.wav", seconds: 78 },
  { name: "ambient-3.wav", seconds: 94 },
];

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function render(seconds, seed) {
  const rand = mulberry32(seed);
  const n = Math.floor(seconds * sampleRate);
  const out = new Float32Array(n);
  const chimes = [];
  let next = 3 + rand() * 3;
  const scale = [392, 440, 523.25, 587.33, 659.25, 783.99];
  while (next < seconds - 2) {
    chimes.push({ at: next, freq: scale[Math.floor(rand() * scale.length)], gain: 0.05 + rand() * 0.04 });
    next += 7 + rand() * 9;
  }
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const noise = rand() * 2 - 1;
    lp = lp * 0.995 + noise * 0.005;
    const wind = lp * 3.2 * (0.55 + 0.45 * Math.sin(t * 0.05 + seed));
    const drone =
      Math.sin(2 * Math.PI * 55 * t) * 0.018 +
      Math.sin(2 * Math.PI * 82.5 * t + 0.6) * 0.012 +
      Math.sin(2 * Math.PI * 110 * t + 1.3) * 0.008 * (0.6 + 0.4 * Math.sin(t * 0.12));
    let chime = 0;
    for (const c of chimes) {
      const dt = t - c.at;
      if (dt >= 0 && dt < 4) {
        const env = Math.exp(-dt * 1.7) * (1 - Math.exp(-dt * 60));
        chime +=
          Math.sin(2 * Math.PI * c.freq * dt) * env * c.gain +
          Math.sin(2 * Math.PI * c.freq * 2.003 * dt) * env * c.gain * 0.25;
      }
    }
    out[i] = wind + drone + chime;
  }
  const fade = Math.floor(sampleRate * 2.5);
  for (let i = 0; i < fade; i++) {
    const k = i / fade;
    out[i] *= k;
    out[n - 1 - i] *= k;
  }
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  const norm = 0.42 / (peak || 1);
  for (let i = 0; i < n; i++) out[i] *= norm;
  return out;
}

function writeWav(file, samples) {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2);
  }
  fs.writeFileSync(file, buf);
}

const dir = path.resolve("public/mock/audio");
fs.mkdirSync(dir, { recursive: true });
for (const t of tracks) {
  const samples = render(t.seconds, t.seconds * 7 + 11);
  writeWav(path.join(dir, t.name), samples);
  console.log(t.name, t.seconds + "s", (fs.statSync(path.join(dir, t.name)).size / 1024 / 1024).toFixed(2) + "MB");
}