import { randFloatSpread } from './math.js';

var Context =
  AudioContext ||
  // eslint-disable-next-line no-undef
  webkitAudioContext;

var audioContext = new Context();
var { sampleRate } = audioContext;

// A4 is 69.
var toFreq = note => 2 ** ((note - 69) / 12) * 440;

var playSound = (sound, destination = audioContext.destination) => {
  var source = audioContext.createBufferSource();
  source.buffer = sound;
  source.connect(destination);
  source.start();
};

var generateAudioBuffer = (fn, duration, volume) => {
  var length = duration * sampleRate;

  var buffer = audioContext.createBuffer(1, length, sampleRate);
  var channel = buffer.getChannelData(0);
  for (var i = 0; i < length; i++) {
    channel[i] = fn(i / sampleRate, i, channel) * volume;
  }

  return buffer;
};

var generateNotes = (fn, duration, volume) =>
  new Proxy(
    {},
    {
      get(target, property) {
        var sound =
          target[property] ||
          generateAudioBuffer(fn(toFreq(property)), duration, volume);
        target[property] = sound;
        return sound;
      },
    },
  );

// Oscillators
// f: frequency, t: parameter.
var sin = f => t => Math.sin(t * 2 * Math.PI * f);

// Brown noise.
// https://github.com/Tonejs/Tone.js/blob/dev/Tone/source/Noise.ts
var noise = () => {
  var lastOut = 0;

  return () => {
    var white = randFloatSpread(1);
    var value = (lastOut + 0.02 * white) / 1.02;
    lastOut = value;
    return value * 3.5;
  };
};

// Operators.
var add = (a, b) => f => {
  var af = a(f);
  var bf = b(f);

  return (t, i, a) => af(t, i, a) + bf(t, i, a);
};

var mul = (a, b) => f => {
  var af = a(f);
  var bf = b(f);

  return (t, i, a) => af(t, i, a) * bf(t, i, a);
};

var scale = (fn, n) => f => {
  var fnf = fn(f);
  return (t, i, a) => n * fnf(t, i, a);
};

var slide = (fn, slide) => f => (t, i, a) =>
  fn(f + (i / a.length) * slide)(t, i, a);

var pitchJump = (fn, pitchJump, pitchJumpTime) => f => (t, i, a) =>
  fn(f + (t > pitchJumpTime ? pitchJump : 0))(t, i, a);

var adsr = (attack, decay, sustain, release, sustainVolume) => {
  var length = attack + decay + sustain + release;

  return () => t => {
    if (t < attack) {
      return t / attack;
    }

    if (t < attack + decay) {
      return 1 - ((t - attack) / decay) * (1 - sustainVolume);
    }

    if (t < length - release) {
      return sustainVolume;
    }

    if (t < length) {
      return ((length - t) / release) * sustainVolume;
    }

    return 0;
  };
};

document.addEventListener('click', () => audioContext.resume(), { once: true });

export var playJump = () => {
  playSound(
    generateNotes(
      mul(slide(sin, toFreq(76) - toFreq(69)), adsr(0.001, 0.1, 0.02, 0.27, 1)),
      0.4,
      0.3,
    )[69],
  );
};

export var playPickup = () => {
  playSound(
    generateNotes(
      mul(
        pitchJump(sin, toFreq(83) - toFreq(76), 0.07),
        adsr(0.001, 0.1, 0.1, 0.3, 0.5),
      ),
      0.6,
      0.3,
    )[76],
  );
};

document.addEventListener('keydown', event => {
  if (event.key === '/') {
    playPickup();
  }

  if (event.key === ',') {
    playSound(
      generateNotes(pitchJump(sin, toFreq(76) - toFreq(69), 0.2), 0.4, 0.3)[69],
    );
    setTimeout(() => playSound(generateNotes(sin, 0.4, 0.3)[76]), 300);
  }
});
