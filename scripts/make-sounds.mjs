// Generates tiny 16-bit PCM WAV effect sounds into assets/sounds/.
// Usage: node scripts/make-sounds.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'assets', 'sounds');
mkdirSync(outDir, { recursive: true });

const SR = 22050;

function encodeWav(samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buf;
}

function tone({ freq, start, dur, vol = 1, type = 'sine', slideTo }) {
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = (start + i / SR);
    const f = slideTo ? freq + (slideTo - freq) * (i / n) : freq;
    const p = 2 * Math.PI * f * (i / SR);
    let v;
    if (type === 'square') v = Math.sign(Math.sin(p)) * 0.6;
    else if (type === 'noise') v = (Math.random() * 2 - 1) * 0.5;
    else v = Math.sin(p);
    const env = Math.min(1, i / (SR * 0.004)) * Math.exp(-4 * (i / SR) / dur);
    out[i] = v * env * vol;
  }
  return out;
}

function mix(parts) {
  const len = Math.max(...parts.map((p) => p.length));
  const out = new Float32Array(len);
  for (const p of parts) for (let i = 0; i < p.length; i++) out[i] += p[i];
  let peak = 0;
  for (const s of out) peak = Math.max(peak, Math.abs(s));
  if (peak > 0.98) for (let i = 0; i < len; i++) out[i] *= 0.98 / peak;
  return out;
}

// short blip
const pop = mix([tone({ freq: 660, start: 0, dur: 0.09, slideTo: 990 })]);
// firm click
const snap = mix([
  tone({ freq: 520, start: 0, dur: 0.06, type: 'square' }),
  tone({ freq: 1400, start: 0, dur: 0.03, vol: 0.4, type: 'noise' }),
]);
// soft tick
const tap = mix([tone({ freq: 880, start: 0, dur: 0.05, vol: 0.5 })]);
// ascending arpeggio C5 E5 G5 C6
const win = mix([
  tone({ freq: 523.25, start: 0, dur: 0.12 }),
  tone({ freq: 659.25, start: 0.11, dur: 0.12 }),
  tone({ freq: 783.99, start: 0.22, dur: 0.12 }),
  tone({ freq: 1046.5, start: 0.33, dur: 0.3 }),
]);

const files = { pop: [pop], snap: [snap], tap: [tap], win: [win] };
for (const [name, parts] of Object.entries(files)) {
  writeFileSync(join(outDir, `${name}.wav`), encodeWav(mix(parts)));
  console.log(`wrote assets/sounds/${name}.wav`);
}
