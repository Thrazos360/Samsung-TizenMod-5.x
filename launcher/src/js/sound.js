/*
 * Navigation sounds: a synthesised click when focus moves, a chime on OK, a falling tone on Back.
 *
 * Synthesised rather than sampled, so there is no audio file to licence, bundle or decode, and
 * no question about which codecs this engine accepts. Each click is one oscillator and one gain
 * envelope, created and discarded per press; nothing is held open between keys.
 *
 * Tuning lives in config.js under `sound`. Everything here is wrapped so that a failure is
 * silent: a launcher that is someone's Home button must not break because audio did.
 *
 * EXPERIMENTAL. Latency is the open question — if the TV's audio path delays the click much past
 * ~60 ms it will feel detached from the remote and should be turned off. Measure it from the Lab
 * screen ("Sound: report audio latency") before deciding to keep this.
 */
(function () {
    'use strict';

    /*
     * A voice is a list of layers played together. A layer is either
     *   { type: 'sine'|'triangle'|'square', freq, to?, ms, gain? }   a tone, optionally gliding to `to`
     *   { noise: true, freq, q, ms, gain? }                          band-passed white noise
     * The 'tvos' click is mostly noise: a 15–20 ms filtered burst reads as a physical tick rather
     * than a beep, which is what makes Apple TV's focus sound feel tactile.
     */
    var PRESETS = {
        tvos: { label: 'Clic (tipo Apple TV)', layers: [
            { noise: true, freq: 3400, q: 1.4, ms: 16, gain: 1 },
            { type: 'sine', freq: 1700, to: 1100, ms: 12, gain: 0.25 }
        ] },
        pop: { label: 'Pop', layers: [{ type: 'sine', freq: 950, to: 520, ms: 42 }] },
        soft: { label: 'Suave', layers: [{ type: 'sine', freq: 620, ms: 30 }] },
        warm: { label: 'Cálido', layers: [{ type: 'triangle', freq: 520, ms: 44 }] },
        bright: { label: 'Brillante', layers: [{ type: 'triangle', freq: 1040, ms: 30 }] }
    };

    var VOICES = {
        // Rising two-note chime: something opened.
        select: [
            { type: 'sine', freq: 660, to: 990, ms: 70, gain: 0.8 },
            { type: 'sine', freq: 1320, ms: 60, gain: 0.3 }
        ],
        // Falling: going back.
        back: [{ type: 'sine', freq: 780, to: 460, ms: 70, gain: 0.7 }],
        // Low dull knock at the end of a row.
        edge: [
            { type: 'sine', freq: 180, to: 120, ms: 70, gain: 0.9 },
            { noise: true, freq: 500, q: 0.8, ms: 20, gain: 0.4 }
        ]
    };

    var VOLUMES = [
        { key: 'low', label: 'Bajo', value: 0.06 },
        { key: 'mid', label: 'Medio', value: 0.12 },
        { key: 'high', label: 'Alto', value: 0.22 }
    ];

    var DEFAULTS = { enabled: true, preset: 'tvos', volume: 'mid', minGapMs: 45 };

    var ctx = null;
    var noiseBuf = null;
    var broken = false;
    var lastPlay = 0;

    function cfg() {
        var c = (window.LAUNCHER_CONFIG && window.LAUNCHER_CONFIG.sound) || {};
        var out = {};
        Object.keys(DEFAULTS).forEach(function (k) {
            out[k] = c[k] !== undefined ? c[k] : DEFAULTS[k];
        });
        return out;
    }

    function prefs() {
        return window.Prefs && Prefs.get ? Prefs.get().sound || {} : {};
    }

    function enabled() {
        if (broken) return false;
        var p = prefs();
        return p.enabled !== undefined ? !!p.enabled : !!cfg().enabled;
    }

    function presetKey() {
        var key = prefs().preset || cfg().preset;
        return PRESETS[key] ? key : 'tvos';
    }

    function selectedPreset() { return PRESETS[presetKey()]; }

    function volumeOption() {
        var key = prefs().volume || cfg().volume;
        return VOLUMES.find(function (v) { return v.key === key; }) || VOLUMES[1];
    }

    function presetOptions() {
        return Object.keys(PRESETS).map(function (key) {
            return { key: key, label: PRESETS[key].label };
        });
    }

    /*
     * The context is created on the first key press rather than at boot: engines may refuse to
     * start audio without a user gesture, and on a TV the first remote press is that gesture.
     */
    function context() {
        if (ctx || broken) return ctx;
        try {
            var Ctor = window.AudioContext || window.webkitAudioContext;
            if (!Ctor) {
                broken = true;
                return null;
            }
            ctx = new Ctor();
            // 0.1 s of white noise, reused by every noise layer.
            noiseBuf = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.1), ctx.sampleRate);
            var data = noiseBuf.getChannelData(0);
            for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        } catch (e) {
            broken = true;
            if (window.DevLog) DevLog.log('Sound unavailable: ' + DevLog.errorText(e));
            return null;
        }
        return ctx;
    }

    function envelope(ac, t, peak, seconds) {
        var gain = ac.createGain();
        // Tiny attack keeps the start from clicking; exponential decay reads as a tick.
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
        gain.connect(ac.destination);
        return gain;
    }

    function layer(ac, t, l, volume) {
        var seconds = l.ms / 1000;
        var gain = envelope(ac, t, volume * (l.gain === undefined ? 1 : l.gain), seconds);
        var src;
        var tail = [gain];
        if (l.noise) {
            src = ac.createBufferSource();
            src.buffer = noiseBuf;
            var band = ac.createBiquadFilter();
            band.type = 'bandpass';
            band.frequency.value = l.freq;
            band.Q.value = l.q || 1;
            src.connect(band);
            band.connect(gain);
            tail.push(band);
        } else {
            src = ac.createOscillator();
            src.type = l.type || 'sine';
            src.frequency.setValueAtTime(l.freq, t);
            if (l.to) src.frequency.exponentialRampToValueAtTime(l.to, t + seconds);
            src.connect(gain);
        }
        src.start(t);
        src.stop(t + seconds + 0.02);
        src.onended = function () {
            try {
                src.disconnect();
                tail.forEach(function (n) { n.disconnect(); });
            } catch (e) {
                // Already torn down.
            }
        };
    }

    function play(name, force) {
        if (!force && !enabled()) return;
        var now = Date.now();
        if (!force && name === 'move' && now - lastPlay < cfg().minGapMs) return;

        var ac = context();
        if (!ac) return;

        try {
            // Held keys can arrive while the context is suspended by the platform.
            if (ac.state === 'suspended' && ac.resume) ac.resume();
            var layers = name === 'move' ? selectedPreset().layers : (VOICES[name] || selectedPreset().layers);
            var t = ac.currentTime;
            var volume = volumeOption().value;
            layers.forEach(function (l) { layer(ac, t, l, volume); });
            lastPlay = now;
        } catch (e) {
            broken = true;
            if (window.DevLog) DevLog.log('Sound failed, disabling: ' + DevLog.errorText(e));
        }
    }

    // ---------- Lab diagnostics

    function report() {
        var log = function (m) { DevLog.log(m); };
        var Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) {
            log('Web Audio: NOT AVAILABLE on this engine');
            return;
        }
        log('Web Audio: available (' +
            (window.AudioContext ? 'AudioContext' : 'webkitAudioContext') + ')');

        var ac = context();
        if (!ac) {
            log('Web Audio: context could not be created');
            return;
        }
        log('State on creation: ' + ac.state +
            (ac.state === 'suspended' ? '  (needs resume from a key press)' : ''));
        log('Sample rate: ' + ac.sampleRate + ' Hz');

        /*
         * These are what decide whether a navigation click is usable. baseLatency is the engine's
         * own buffering; outputLatency includes the path to the speakers, which on a TV can be
         * long. Either may be undefined on older engines, which is itself worth knowing.
         */
        var base = ac.baseLatency;
        var out = ac.outputLatency;
        log('baseLatency: ' + (base === undefined ? 'not reported' : (base * 1000).toFixed(1) + ' ms'));
        log('outputLatency: ' + (out === undefined ? 'not reported' : (out * 1000).toFixed(1) + ' ms'));

        var total = (base || 0) + (out || 0);
        if (base === undefined && out === undefined) {
            log('Verdict: engine reports no latency figures — judge it by ear instead');
        } else if (total * 1000 > 60) {
            log('Verdict: about ' + (total * 1000).toFixed(0) +
                ' ms before it reaches the speakers — likely to feel detached from the remote');
        } else {
            log('Verdict: about ' + (total * 1000).toFixed(0) + ' ms — should feel attached to the press');
        }

        if (ac.resume) {
            ac.resume().then(function () {
                log('After resume(): ' + ac.state);
            }, function (err) {
                log('resume() rejected: ' + DevLog.errorText(err));
            });
        }
    }

    // Evenly spaced clicks: is each one crisp, and are they all the same?
    function spaced() {
        DevLog.log('Sound: 10 clicks, 500 ms apart — listen for consistency');
        var n = 0;
        var timer = setInterval(function () {
            play('move');
            if (++n >= 10) clearInterval(timer);
        }, 500);
    }

    // What holding an arrow key down would sound like.
    function burst() {
        DevLog.log('Sound: 25 clicks as fast as minGapMs allows — listen for machine-gunning');
        var n = 0;
        var timer = setInterval(function () {
            play('move');
            if (++n >= 25) clearInterval(timer);
        }, 30);
    }

    function voices() {
        DevLog.log('Sound: move, then edge, then select');
        play('move');
        setTimeout(function () { play('edge'); }, 450);
        setTimeout(function () { play('select'); }, 900);
    }

    window.Sound = {
        play: play,
        preview: function () { play('move', true); },
        enabled: enabled,
        presetOptions: presetOptions,
        presetLabel: function () { return selectedPreset().label; },
        presetKey: presetKey,
        VOLUMES: VOLUMES,
        volumeKey: function () { return volumeOption().key; },
        actions: function () {
            return [
                { label: 'Sound: report audio latency', run: report },
                { label: 'Sound: 10 clicks, 500 ms apart', run: spaced },
                { label: 'Sound: rapid burst (held key)', run: burst },
                { label: 'Sound: hear all three voices', run: voices }
            ];
        }
    };
})();
