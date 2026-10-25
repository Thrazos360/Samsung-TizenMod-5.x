/* Wallpaper display and rotation, driven by Prefs.wallpaper. */
(function () {
    'use strict';

    var INTERVALS = [
        { key: 'open', label: 'Al abrir Inicio', ms: 0 },
        { key: '30s', label: '30 s', ms: 30 * 1000 },
        { key: '5m', label: '5 min', ms: 5 * 60 * 1000 },
        { key: '15m', label: '15 min', ms: 15 * 60 * 1000 },
        { key: '1h', label: '1 hora', ms: 60 * 60 * 1000 },
        { key: '1d', label: 'Cada día', ms: 24 * 60 * 60 * 1000 }
    ];

    var token = 0;

    function list() { return window.WALLPAPERS || []; }

    // Your own wallpapers (scripts/add-wallpapers.mjs → js/wallpapers.local.js).
    function local() { return window.WALLPAPERS_LOCAL || []; }

    function isLocal(w) {
        return local().some(function (l) { return l.key === w.key; });
    }

    /*
     * What Rotate cycles through (Prefs.wallpaper.set): 'all', only your own ('local') or only
     * the bundled set ('bundled'). Falls back to everything if the chosen set is empty.
     */
    function rotation() {
        var set = Prefs.get().wallpaper.set || 'all';
        var l = list();
        if (set === 'local') l = l.filter(isLocal);
        else if (set === 'bundled') l = l.filter(function (w) { return !isLocal(w); });
        return l.length ? l : list();
    }

    function find(key) {
        return list().find(function (w) { return w.key === key; }) || list()[0] || null;
    }

    function interval(key) {
        var find = function (k) { return INTERVALS.find(function (i) { return i.key === k; }); };
        return find(key) || find('15m');
    }

    function bg() { return document.getElementById('bg'); }

    // The next image is decoded before it replaces the current one, so the screen never flashes empty.
    // No wallpaper falls back to the stylesheet's plain gradient (img/bg.jpg).
    function display(w) {
        var t = ++token;
        if (!w) {
            bg().style.backgroundImage = '';
            return;
        }
        var img = new Image();
        img.onload = function () {
            if (t === token) bg().style.backgroundImage = 'url("' + w.file + '")';
        };
        img.onerror = function () { DevLog.log('Wallpaper failed to load: ' + w.file); };
        img.src = w.file;
    }

    function apply() {
        var p = Prefs.get().wallpaper;
        display(p.mode === 'off' ? null : find(p.photo));
    }

    function next() {
        var p = Prefs.get().wallpaper;
        var l = p.mode === 'rotate' ? rotation() : list();
        if (!l.length) return null;
        var i = l.findIndex(function (w) { return w.key === p.photo; });
        p.photo = l[(i + 1) % l.length].key;
        p.lastChange = Date.now();
        if (p.mode === 'off') p.mode = 'photo';
        Prefs.save();
        apply();
        return find(p.photo);
    }

    function due() {
        var p = Prefs.get().wallpaper;
        var ms = interval(p.interval).ms;
        return p.mode === 'rotate' && ms > 0 && Date.now() - p.lastChange >= ms;
    }

    // Called when Home appears (launch or return from another app).
    function homeShown() {
        var p = Prefs.get().wallpaper;
        if (p.mode === 'rotate' && (p.interval === 'open' || due())) next();
    }

    function start() {
        apply();
        homeShown();
        // The screen saver has its own photo cycle and covers Home completely, so rotating
        // underneath it would only decode images nobody can see — and move the photo Home
        // comes back to.
        setInterval(function () {
            if (window.Screensaver && Screensaver.isOpen()) return;
            if (!document.hidden && due()) next();
        }, 5 * 1000);
    }

    window.Wallpaper = {
        INTERVALS: INTERVALS,
        list: list,
        local: local,
        rotation: rotation,
        find: find,
        interval: interval,
        apply: apply,
        next: next,
        homeShown: homeShown,
        start: start
    };
})();
