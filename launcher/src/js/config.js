/*
 * Home screen content.
 *
 * apps: each entry picks the first installed app matching it:
 *   { id: 'org.tizen.netflix-app' }   exact app id (most reliable; see "All apps", the id of
 *                                     the focused app is shown at the bottom)
 *   { match: 'netflix' }              case-insensitive regex on id or name
 *   label                             optional display name
 *   brand                             optional key from js/brands.js (otherwise guessed from the name)
 * Entries that match nothing are skipped.
 *
 * inputs: HDMI ports shown in the second row. Set `hdmi` to the port each device is plugged into.
 */
window.LAUNCHER_CONFIG = {
    apps: [
        { id: 'xvvl3S1TT1.TizenTubeStandalone', label: 'YouTube', brand: 'youtube' },
        { id: 'rJeHak5zRg.Spotify', label: 'Spotify' },
        { id: 'Jz7aUrV2Q4.Twitch', label: 'Twitch' },
        { id: 'E0P3lRI4H7.MYTF1', label: 'TF1+' },
        { id: 'org.tizen.netflix-app', label: 'Netflix' },
        { id: 'org.tizen.primevideo', label: 'Prime Video' },
        { id: 'MCmYXNxgcu.DisneyPlus', label: 'Disney+' },
        { id: 'com.samsung.tv.aria-video', label: 'Apple TV' }
    ],

    inputs: [
        { hdmi: 1, label: 'Nintendo Switch 2', brand: 'switch' },
        { hdmi: 2, label: 'PlayStation 5', brand: 'playstation' },
        { hdmi: 4, label: 'Xbox Series X', brand: 'xbox' }
    ],

    // A tile in the dock that switches to the TV tuner (cable or antenna on the coaxial input)
    // and opens Samsung's own TV viewer. null hides it.
    tvTile: null,               // e.g. { label: 'TV cable' }

    // How an input tile switches the TV. See README "HDMI inputs".
    //   'switch+viewer'  set the TV source, then open Samsung's TV viewer (default)
    //   'switch'         only set the TV source
    //   'inapp'          show the input full screen inside the launcher (Back returns)
    inputMethod: 'switch+viewer',

    locale: 'en-GB',

    theme: {
        // Starting wallpaper (key from js/wallpapers.js), or null for none (plain gradient).
        // Changed from Settings → Background; the TV remembers the choice.
        wallpaper: null
    },

    /*
     * Weather shown in the screen saver's corner, from Open-Meteo. No API key and nothing to
     * keep secret, so this is the whole setup: put your own coordinates here (two decimals is
     * plenty, and is also about as precise as you want a public request to be). Leave them null
     * and the widget never appears.
     *
     * There is no Settings page for this on purpose — the TV does not move, and coordinates are
     * not something you type with a remote.
     */
    weather: {
        latitude: null,
        longitude: null,
        unit: 'celsius'         // 'celsius' | 'fahrenheit'
    },

    /*
     * Navigation sounds, synthesised in js/sound.js (no audio files). The voices live there;
     * this only sets the defaults that Settings → Sonido al navegar can change.
     *   preset  'tvos' | 'pop' | 'soft' | 'warm' | 'bright'   (sound when focus moves)
     *   volume  'low' | 'mid' | 'high'
     */
    sound: {
        enabled: true,
        preset: 'tvos',
        volume: 'mid',
        minGapMs: 45
    },

    // Development only: where the Lab screen sends its logs (npm run devlog on your computer).
    // null disables it; set it to http://<your-computer-ip>:8099/log while debugging.
    devLogUrl: null
};

/*
 * Local overrides from js/config.local.js, which is gitignored and loaded just before this file.
 * That is where values specific to one TV belong — coordinates, a devlog address — so this file
 * can stay in the repository with nulls in it. Nothing to strip before a push, nothing to put
 * back before a build, and the overlay reaches the browser preview and the .wgt alike.
 *
 * Merged one level deep, so a local file can set weather.latitude without restating the rest of
 * the block. Arrays (apps, inputs) and plain values replace the default outright.
 */
(function () {
    'use strict';

    var local = window.LAUNCHER_LOCAL;
    if (!local) return;

    function plainObject(v) {
        return v && typeof v === 'object' && !Array.isArray(v);
    }

    Object.keys(local).forEach(function (key) {
        if (plainObject(local[key]) && plainObject(window.LAUNCHER_CONFIG[key])) {
            Object.keys(local[key]).forEach(function (inner) {
                window.LAUNCHER_CONFIG[key][inner] = local[key][inner];
            });
        } else {
            window.LAUNCHER_CONFIG[key] = local[key];
        }
    });
})();
