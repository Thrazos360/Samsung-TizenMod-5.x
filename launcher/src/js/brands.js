/*
 * Tile styling per brand. `match` is tested against "<name> <id>" of an installed app.
 * `mark` is a file in img/marks/; the build recolours it in `fg` (img/tiles/<key>.svg), shown over `bg`.
 * `text` instead of `mark` draws a typographic logo (for brands without an available mark);
 * `html` does the same with markup (e.g. two weights).
 * `pad` optionally overrides the mark's [vertical, horizontal] inset in % of the tile (default [26, 22]).
 */
window.BRANDS = [
    { key: 'youtube', match: /youtube|tizentube|cobalt-yt/i, mark: 'youtube', bg: '#e62117', fg: '#fff' },
    { key: 'netflix', match: /netflix/i, mark: 'netflix', bg: '#141414', fg: '#e50914' },
    { key: 'primevideo', match: /prime ?video/i, mark: 'primevideo', bg: 'linear-gradient(135deg,#0b4f7a,#1aa0e0)', fg: '#fff', pad: [12, 10] },
    { key: 'disneyplus', match: /disney/i, mark: 'disneyplus', bg: 'linear-gradient(135deg,#091550,#1f5bd8)', fg: '#fff' },
    { key: 'appletv', match: /apple ?tv|aria-video/i, mark: 'appletv', bg: '#1c1c1e', fg: '#fff' },
    { key: 'spotify', match: /spotify/i, mark: 'spotify', bg: '#121212', fg: '#1ed760' },
    { key: 'movistar', match: /movistar/i, mark: 'movistar', bg: '#0b6fd8', fg: '#fff' },
    // HBO Max (renamed back from "Max" in 2025): Simple Icons only has the 2023 "max" badge,
    // so the tile is typographic — "HBO" heavy, "max" lighter, as in the current logo.
    { key: 'max', match: /(^|\s)max(\s|$)|hbo/i, html: '<b>HBO</b>&#8202;<span>max</span>', bg: 'linear-gradient(135deg,#0b1dbd,#1f4bff)', fg: '#fff' },
    // Apple's own app icon: white note on the red-pink gradient (note drawn for this fork).
    { key: 'applemusic', match: /apple ?music|applemusic/i, mark: 'applemusic', bg: 'linear-gradient(180deg,#fb5c74,#fa233b)', fg: '#fff', pad: [22, 22] },
    // Samsung's browser ("Internet"): a plain globe instead of the initials fallback.
    { key: 'internet', match: /org\.tizen\.browser|^internet\b/i, mark: 'internet', bg: 'linear-gradient(135deg,#5ab0ff,#1a6fe8)', fg: '#fff', pad: [24, 24] },
    { key: 'dazn', match: /dazn/i, mark: 'dazn', bg: '#0c161c', fg: '#f8fc00' },
    { key: 'plex', match: /plex/i, mark: 'plex', bg: '#1f1f1f', fg: '#e5a00d' },
    { key: 'twitch', match: /twitch/i, mark: 'twitch', bg: '#9146ff', fg: '#fff' },
    { key: 'tf1', match: /tf1/i, text: 'TF1+', bg: 'linear-gradient(135deg,#071a4d,#1d4ed8)', fg: '#fff' },
    { key: 'crunchyroll', match: /crunchyroll/i, mark: 'crunchyroll', bg: '#f47521', fg: '#fff' },

    // Cable / antenna TV tile (config.js `tvTile`): a TV set glyph drawn for this fork.
    { key: 'tv', mark: 'tv', bg: 'linear-gradient(135deg,#2b2f3a,#11141b)', fg: '#fff', pad: [24, 24] },

    // Consoles (used by inputs in config.js)
    { key: 'playstation', mark: 'playstation', bg: 'linear-gradient(135deg,#00205c,#0070d1)', fg: '#fff' },
    { key: 'xbox', mark: 'xbox', bg: 'linear-gradient(135deg,#0a3a0a,#16a016)', fg: '#fff' },
    { key: 'switch', mark: 'nintendoswitch', bg: 'linear-gradient(135deg,#b3000e,#ff2a2a)', fg: '#fff' }
];

window.findBrand = function (keyOrApp) {
    if (typeof keyOrApp === 'string') {
        return window.BRANDS.find(function (b) { return b.key === keyOrApp; }) || null;
    }
    var text = (keyOrApp.name || '') + ' ' + (keyOrApp.id || '');
    return window.BRANDS.find(function (b) { return b.match && b.match.test(text); }) || null;
};
