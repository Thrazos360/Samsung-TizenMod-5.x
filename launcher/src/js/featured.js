/*
 * "Destacados": popular titles on the streaming services this TV has, from TMDB.
 *
 * The launcher cannot read what the installed apps recommend (no Tizen API for another app's
 * content), so this asks TMDB what is popular per provider in the configured region and shows the
 * backdrops. OK on a card opens that provider's app. The same backdrops can feed the screen saver.
 *
 * Needs `featured.token` (TMDB API read access token) in js/config.local.js; without it, nothing
 * is requested and the shelf stays hidden. The list is cached for FRESH_MS so Home opens with
 * pictures even when the network is slow.
 */
(function () {
    'use strict';

    var STORE_KEY = 'tizenmod.featured.v1';
    var API = 'https://api.themoviedb.org/3/discover/';
    var IMG = 'https://image.tmdb.org/t/p/';
    var FRESH_MS = 6 * 60 * 60 * 1000;
    var RETRY_MS = 15 * 60 * 1000;
    var TIMEOUT_MS = 10000;
    var PER_PROVIDER = 5;

    var items = [];
    var fetchedAt = 0;
    var lastFailure = 0;
    var fetching = false;
    var listeners = [];

    function cfg() {
        return (window.LAUNCHER_CONFIG && window.LAUNCHER_CONFIG.featured) || {};
    }

    function configured() {
        var c = cfg();
        return !!(c.token && c.providers && c.providers.length);
    }

    function load() {
        try {
            var saved = JSON.parse(localStorage.getItem(STORE_KEY));
            if (saved && Array.isArray(saved.items)) {
                items = saved.items;
                fetchedAt = saved.at || 0;
            }
        } catch (e) {
            items = [];
        }
    }

    function store() {
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify({ at: fetchedAt, items: items }));
        } catch (e) {
            // Only the instant first paint is lost.
        }
    }

    function get(url) {
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.timeout = TIMEOUT_MS;
            xhr.setRequestHeader('Authorization', 'Bearer ' + cfg().token);
            xhr.onload = function () {
                if (xhr.status !== 200) return reject(new Error('HTTP ' + xhr.status));
                try { resolve(JSON.parse(xhr.responseText)); } catch (e) { reject(e); }
            };
            xhr.onerror = function () { reject(new Error('network')); };
            xhr.ontimeout = function () { reject(new Error('timeout')); };
            xhr.send();
        });
    }

    function query(kind, provider) {
        var c = cfg();
        return API + kind + '?watch_region=' + (c.region || 'CL') +
            '&with_watch_providers=' + provider.id +
            '&with_watch_monetization_types=flatrate' +
            '&sort_by=popularity.desc&include_adult=false' +
            '&language=' + encodeURIComponent(c.language || 'es-CL');
    }

    // Series first (that is what these apps lead with), topped up with films, backdrops only.
    function forProvider(provider) {
        return Promise.all([get(query('tv', provider)), get(query('movie', provider))]).then(function (res) {
            var tv = (res[0].results || []).slice(0, 8);
            var mv = (res[1].results || []).slice(0, 8);
            var picked = [];
            var seen = {};
            tv.concat(mv).forEach(function (r) {
                if (picked.length >= PER_PROVIDER || !r.backdrop_path || seen[r.id]) return;
                seen[r.id] = true;
                picked.push({
                    title: r.name || r.title,
                    backdrop: r.backdrop_path,
                    app: provider.app,
                    provider: provider.label
                });
            });
            return picked;
        });
    }

    // Interleaved so the row does not read as five Netflix cards, then five Prime Video cards.
    function interleave(lists) {
        var out = [];
        for (var i = 0; i < PER_PROVIDER; i++) {
            lists.forEach(function (l) { if (l[i]) out.push(l[i]); });
        }
        return out;
    }

    function refresh(force) {
        if (!configured() || fetching) return;
        if (!force && Date.now() - fetchedAt < FRESH_MS) return;
        if (!force && Date.now() - lastFailure < RETRY_MS) return;
        fetching = true;
        Promise.all(cfg().providers.map(function (p) {
            return forProvider(p).catch(function (err) {
                DevLog.log('Featured ' + p.label + ' failed: ' + DevLog.errorText(err));
                return [];
            });
        })).then(function (lists) {
            fetching = false;
            var next = interleave(lists);
            if (!next.length) {
                lastFailure = Date.now();
                return;
            }
            items = next;
            fetchedAt = Date.now();
            store();
            DevLog.log('Featured: ' + items.length + ' titles');
            listeners.forEach(function (fn) { fn(); });
        });
    }

    load();

    window.Featured = {
        configured: configured,
        refresh: refresh,
        list: function () { return items.slice(); },
        card: function (item) { return IMG + 'w780' + item.backdrop; },
        large: function (item) { return IMG + 'w1280' + item.backdrop; },
        onUpdate: function (fn) { listeners.push(fn); }
    };
})();
