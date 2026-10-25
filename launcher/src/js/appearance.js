/* Clock, date and font settings (Prefs.appearance). */
(function () {
    'use strict';

    var FONTS = [
        { key: 'manrope', label: 'Manrope', family: '"Manrope"' },
        { key: 'inter', label: 'Inter', family: '"Inter"' },
        { key: 'outfit', label: 'Outfit', family: '"Outfit"' },
        { key: 'dm-sans', label: 'DM Sans', family: '"DM Sans"' }
    ];

    var LOCALES = [
        { key: 'es-CL', label: 'Español (Chile)' },
        { key: 'en-GB', label: 'English' },
        { key: 'es-ES', label: 'Español (España)' },
        { key: 'fr-FR', label: 'Français' }
    ];

    var FALLBACK = ', "SamsungOne", "Helvetica Neue", Arial, sans-serif';

    function prefs() { return Prefs.get().appearance; }

    function font(key) {
        return FONTS.find(function (f) { return f.key === key; }) || FONTS[0];
    }

    function pad(n) { return String(n).padStart(2, '0'); }

    // Returns { time: '16:05', suffix: '' } or { time: '4:05', suffix: 'PM' }.
    function time(d) {
        if (prefs().clock === '12h') {
            var h = d.getHours() % 12 || 12;
            return { time: h + ':' + pad(d.getMinutes()), suffix: d.getHours() < 12 ? 'AM' : 'PM' };
        }
        return { time: pad(d.getHours()) + ':' + pad(d.getMinutes()), suffix: '' };
    }

    function date(d) {
        try {
            var text = d.toLocaleDateString(prefs().locale, { weekday: 'long', day: 'numeric', month: 'long' });
            return text.charAt(0).toUpperCase() + text.slice(1);
        } catch (e) {
            return d.toDateString();
        }
    }

    function apply() {
        var p = prefs();
        document.documentElement.style.setProperty('--font', font(p.font).family + FALLBACK);
        var home = document.getElementById('home');
        home.classList.toggle('names-focused', p.names === 'focused');
        home.classList.toggle('names-never', p.names === 'never');
        home.classList.toggle('no-date', !p.showDate);
        applyLayout();
    }

    /*
     * Home layout (Prefs.layout): the island dock with a centred clock, or the original
     * left-aligned rows. Everything is a class on #home so the stylesheet owns the geometry.
     */
    var LAYOUT_CLASSES = ['layout-island', 'layout-classic', 'dock-glass', 'dock-dark', 'dock-none',
        'shape-square', 'shape-wide', 'size-s', 'size-m', 'size-l', 'no-weather'];

    function applyLayout() {
        var l = Prefs.get().layout;
        var home = document.getElementById('home');
        LAYOUT_CLASSES.forEach(function (c) { home.classList.remove(c); });
        home.classList.add('layout-' + l.style);
        home.classList.add('dock-' + l.dock);
        home.classList.add('shape-' + l.shape);
        home.classList.add('size-' + l.size);
        if (!l.weather) home.classList.add('no-weather');
        document.getElementById('dim').style.opacity = String((parseInt(l.dim, 10) || 0) / 100);
    }

    window.Appearance = {
        FONTS: FONTS,
        LOCALES: LOCALES,
        font: font,
        time: time,
        date: date,
        apply: apply
    };
})();
