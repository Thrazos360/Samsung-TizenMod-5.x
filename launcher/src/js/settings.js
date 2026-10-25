/* Settings: overview, Background, Apps on Home, Consoles, Appearance, Samsung, Advanced. */
(function () {
    'use strict';

    var $ = UI.$;
    var el = UI.el;
    var KEY = UI.KEY;
    var THUMB_COLS = 6;

    // Samsung's on-screen keyboard (IME) sends these for its Done / Cancel buttons.
    var IME_DONE = 65376;
    var IME_CANCEL = 65385;

    // Samsung's own home screen (Smart Hub); TV settings are one press away from there.
    // Opening com.samsung.tv.coba.setting directly does not work on the Q70B: a plain launch
    // fails (UnknownError) and app controls are accepted but show nothing.
    var SAMSUNG_HOME = 'com.samsung.tv.csfs';

    var LOGOS = [
        { key: 'playstation', label: 'PlayStation' },
        { key: 'xbox', label: 'Xbox' },
        { key: 'switch', label: 'Nintendo Switch' },
        { key: '', label: 'Ninguno' }
    ];

    var METHODS = [
        { key: 'switch+viewer', label: 'Entrada de la TV', hint: 'Funciona el Modo Juego' },
        { key: 'inapp', label: 'Dentro del launcher', hint: 'Atrás vuelve aquí' }
    ];

    // ---------- Generic list pages

    // entries: [{ label, value, mini, run }]
    function renderList(list, entries) {
        list.innerHTML = '';
        entries.forEach(function (e) {
            var li = el('li', 'setting-row');
            if (e.mini) li.appendChild(e.mini);
            li.appendChild(el('span', 'setting-label', e.label));
            li.appendChild(el('span', 'setting-value', e.value || ''));
            li._item = e;
            list.appendChild(li);
        });
    }

    /*
     * A two-column list fills the first column before the second, so visual row r holds items
     * r and r + rowCount. The focus grid has to be built that way round or Down would jump
     * across columns.
     */
    function columnRows(items) {
        var rowCount = Math.ceil(items.length / 2);
        var rows = [];
        for (var r = 0; r < rowCount; r++) {
            var row = [items[r]];
            if (items[r + rowCount]) row.push(items[r + rowCount]);
            rows.push(row);
        }
        return rows;
    }

    function registerList(name, entries, hints, twoColumn) {
        var view = $(name);
        var list = view.querySelector('ul');
        var render = function () {
            renderList(list, entries());
            // Set in JS so the split follows the number of entries rather than a hard-coded four.
            if (twoColumn) {
                list.style.gridTemplateRows =
                    'repeat(' + Math.ceil(list.children.length / 2) + ', auto)';
            }
        };
        UI.register(name, {
            el: view,
            rows: function () {
                var items = UI.children(list);
                return twoColumn ? columnRows(items) : items.map(function (li) { return [li]; });
            },
            onShow: render,
            activate: function (item) { item.run(); },
            hints: hints
        });
        return render;
    }

    var opening = false;
    function openSamsungHome() {
        if (opening) return;
        opening = true;
        DevLog.log('Open Samsung Home');
        Apps.launch(SAMSUNG_HOME).catch(function (err) {
            DevLog.log('Samsung Home failed: ' + DevLog.errorText(err));
            UI.toast('No se pudo abrir Samsung Home: ' + DevLog.errorText(err));
        }).then(function () { opening = false; });
    }

    // ---------- Overview

    function wallpaperSummary() {
        var p = Prefs.get().wallpaper;
        if (p.mode === 'off') return 'Sin foto';
        if (p.mode === 'rotate') return 'Rotar · ' + Wallpaper.interval(p.interval).label.toLowerCase();
        var w = Wallpaper.find(p.photo);
        return w ? w.title : 'Foto';
    }

    function overviewEntries() {
        var a = Prefs.get().appearance;
        var shown = Home.inputs().filter(function (i) { return !i.hidden; }).length;
        return [
            { label: 'Inicio', value: homeSummary(), run: function () { UI.show('home-settings'); } },
            { label: 'Fondo', value: wallpaperSummary(), run: function () { UI.show('bg'); } },
            { label: 'Apps en Inicio', value: Home.homeItems().length + ' apps', run: function () { UI.show('homeapps'); } },
            { label: 'Consolas', value: shown + ' en Inicio', run: function () { UI.show('consoles'); } },
            { label: 'Apariencia', value: Appearance.font(a.font).label + ' · ' + (a.clock === '12h' ? '12 horas' : '24 horas'), run: function () { UI.show('appearance'); } },
            { label: 'Sonido al navegar', value: soundSummary(), run: function () { UI.show('sound-settings'); } },
            { label: 'Protector de pantalla', value: screensaverSummary(), run: function () { UI.show('screensaver-settings'); } },
            { label: 'Samsung Home', value: 'Smart Hub y ajustes de la TV', run: openSamsungHome },
            { label: 'Avanzado', value: 'Actualizar, restablecer, Lab', run: function () { UI.show('advanced'); } }
        ];
    }

    // ---------- Chips (Background, Appearance)

    function chip(label, on, item) {
        var c = el('div', 'chip' + (on ? ' on' : ''), label);
        c._item = item;
        return c;
    }

    function chipRows(container) {
        var rows = [];
        UI.children(container).forEach(function (block) {
            if (block.classList.contains('hidden')) return;
            var chips = block.querySelector('.chips, .thumbs');
            if (!chips) return;
            if (chips.classList.contains('thumbs')) rows = rows.concat(UI.chunk(UI.children(chips), THUMB_COLS));
            else rows.push(UI.children(chips));
        });
        return rows;
    }

    // Two-column pages (.pairs): visual row k holds blocks 2k and 2k+1.
    function pairRows(container) {
        var blocks = UI.children(container).filter(function (b) { return !b.classList.contains('hidden'); });
        var rows = [];
        for (var i = 0; i < blocks.length; i += 2) {
            var row = UI.children(blocks[i].querySelector('.chips'));
            if (blocks[i + 1]) row = row.concat(UI.children(blocks[i + 1].querySelector('.chips')));
            rows.push(row);
        }
        return rows;
    }

    // Generic chip page: blocks of { title, key, options: [[value, label]] } over one prefs object.
    function renderBlocks(body, blocks, p) {
        body.innerHTML = '';
        blocks.forEach(function (b) {
            var block = el('div', 'setting-block');
            block.appendChild(el('h2', '', b.title));
            var chips = el('div', 'chips');
            b.options.forEach(function (o) {
                chips.appendChild(chip(o[1], b.key && p[b.key] === o[0], b.item ? b.item(o) : { key: b.key, value: o[0] }));
            });
            block.appendChild(chips);
            body.appendChild(block);
        });
    }

    // ---------- Home (layout)

    var DIM_OPTIONS = [['0', 'No'], ['20', 'Suave'], ['40', 'Medio'], ['60', 'Fuerte']];

    function homeBlocks() {
        var l = Prefs.get().layout;
        var blocks = [
            { title: 'Diseño', key: 'style', options: [['island', 'Isla'], ['classic', 'Clásico']] }
        ];
        if (l.style === 'island') {
            blocks.push(
                { title: 'Fondo de la isla', key: 'dock', options: [['glass', 'Vidrio'], ['dark', 'Oscuro'], ['none', 'Sin fondo']] },
                { title: 'Forma de los íconos', key: 'shape', options: [['square', 'Cuadrados'], ['wide', 'Panorámicos']] },
                { title: 'Tamaño de los íconos', key: 'size', options: [['s', 'Pequeño'], ['m', 'Mediano'], ['l', 'Grande']] },
                { title: 'Clima bajo el reloj', key: 'weather', options: [[true, 'Mostrar'], [false, 'Ocultar']] },
                { title: 'Destacados', key: 'featured', options: [[true, 'Mostrar'], [false, 'Ocultar']] }
            );
        }
        blocks.push({ title: 'Oscurecer el fondo', key: 'dim', options: DIM_OPTIONS });
        return blocks;
    }

    function homeSummary() {
        var l = Prefs.get().layout;
        if (l.style !== 'island') return 'Clásico';
        return 'Isla · ' + ({ glass: 'vidrio', dark: 'oscura', none: 'sin fondo' })[l.dock];
    }

    function renderHomeSettings() {
        renderBlocks($('home-settings-body'), homeBlocks(), Prefs.get().layout);
    }

    function activateHomeSettings(item) {
        Prefs.get().layout[item.key] = item.value;
        Prefs.save();
        Appearance.apply();
        Home.renderFeatured();
        if (item.key === 'featured' && item.value) Featured.refresh();
        renderHomeSettings();
        UI.refresh();
    }

    // ---------- Background

    function renderBackground() {
        var p = Prefs.get().wallpaper;

        var modes = $('bg-mode');
        modes.innerHTML = '';
        [['off', 'Sin foto'], ['photo', 'Una foto'], ['rotate', 'Rotar']].forEach(function (m) {
            modes.appendChild(chip(m[1], p.mode === m[0], { kind: 'mode', key: m[0] }));
        });

        var intervals = $('bg-interval');
        intervals.innerHTML = '';
        Wallpaper.INTERVALS.forEach(function (i) {
            intervals.appendChild(chip(i.label, p.interval === i.key, { kind: 'interval', key: i.key }));
        });
        $('bg-interval-block').classList.toggle('hidden', p.mode !== 'rotate');

        var sets = $('bg-set');
        sets.innerHTML = '';
        [['all', 'Todos'], ['local', 'Mis fondos'], ['bundled', 'Incluidos']].forEach(function (o) {
            sets.appendChild(chip(o[1], (p.set || 'all') === o[0], { kind: 'set', key: o[0] }));
        });
        $('bg-set-block').classList.toggle('hidden', p.mode !== 'rotate' || !Wallpaper.local().length);

        var photos = $('bg-photos');
        photos.innerHTML = '';
        Wallpaper.list().forEach(function (w) {
            var t = el('div', 'thumb' + (p.photo === w.key ? ' on' : ''));
            var img = new Image();
            img.src = w.thumb;
            t.appendChild(img);
            t.appendChild(el('div', 'thumb-title', w.title));
            t._item = { kind: 'photo', key: w.key };
            photos.appendChild(t);
        });
        $('bg-photos-block').classList.toggle('hidden', p.mode !== 'photo');
    }

    function activateBackground(item) {
        var p = Prefs.get().wallpaper;
        if (item.kind === 'mode') {
            p.mode = item.key;
            if (item.key === 'rotate') p.lastChange = Date.now();
        } else if (item.kind === 'interval') {
            p.interval = item.key;
            p.lastChange = Date.now();
        } else if (item.kind === 'set') {
            p.set = item.key;
            p.lastChange = 0;
        } else if (item.kind === 'photo') {
            p.photo = item.key;
        }
        Prefs.save();
        Wallpaper.apply();
        renderBackground();
        UI.refresh();
    }

    // ---------- Appearance

    function appearanceBlocks() {
        return [
            { title: 'Reloj', key: 'clock', options: [['24h', '24 horas'], ['12h', '12 horas']] },
            { title: 'Fecha', key: 'showDate', options: [[true, 'Mostrar'], [false, 'Ocultar']] },
            { title: 'Idioma de la fecha', key: 'locale', options: Appearance.LOCALES.map(function (l) { return [l.key, l.label]; }) },
            { title: 'Tipografía', key: 'font', options: Appearance.FONTS.map(function (f) { return [f.key, f.label, f.family]; }) },
            { title: 'Nombres de las apps', key: 'names', options: [['always', 'Siempre'], ['focused', 'Al seleccionar'], ['never', 'Nunca']] }
        ];
    }

    function renderAppearance() {
        var p = Prefs.get().appearance;
        var body = $('appearance-body');
        body.innerHTML = '';
        appearanceBlocks().forEach(function (b) {
            var block = el('div', 'setting-block');
            block.appendChild(el('h2', '', b.title));
            var chips = el('div', 'chips');
            b.options.forEach(function (o) {
                var c = chip(o[1], p[b.key] === o[0], { key: b.key, value: o[0] });
                if (o[2]) c.style.fontFamily = o[2];
                chips.appendChild(c);
            });
            block.appendChild(chips);
            body.appendChild(block);
        });
    }

    function activateAppearance(item) {
        Prefs.get().appearance[item.key] = item.value;
        Prefs.save();
        Appearance.apply();
        Home.updateClock();
        renderAppearance();
        UI.refresh();
    }

    // ---------- Navigation sound

    function soundSummary() {
        var p = Prefs.get().sound;
        return p.enabled ? 'Activado · ' + Sound.presetLabel() : 'Desactivado';
    }

    function renderSound() {
        var p = Prefs.get().sound;
        var body = $('sound-body');
        body.innerHTML = '';

        var enabledBlock = el('div', 'setting-block');
        enabledBlock.appendChild(el('h2', '', 'Sonido'));
        var enabledChips = el('div', 'chips');
        enabledChips.appendChild(chip('Activado', p.enabled, { kind: 'enabled', value: true }));
        enabledChips.appendChild(chip('Desactivado', !p.enabled, { kind: 'enabled', value: false }));
        enabledBlock.appendChild(enabledChips);
        body.appendChild(enabledBlock);

        var presetBlock = el('div', 'setting-block');
        presetBlock.appendChild(el('h2', '', 'Estilo'));
        var presetChips = el('div', 'chips');
        Sound.presetOptions().forEach(function (preset) {
            presetChips.appendChild(chip(preset.label, Sound.presetKey() === preset.key,
                { kind: 'preset', value: preset.key }));
        });
        presetBlock.appendChild(presetChips);
        body.appendChild(presetBlock);

        var volumeBlock = el('div', 'setting-block');
        volumeBlock.appendChild(el('h2', '', 'Volumen'));
        var volumeChips = el('div', 'chips');
        Sound.VOLUMES.forEach(function (v) {
            volumeChips.appendChild(chip(v.label, Sound.volumeKey() === v.key, { kind: 'volume', value: v.key }));
        });
        volumeBlock.appendChild(volumeChips);
        body.appendChild(volumeBlock);

        var previewBlock = el('div', 'setting-block');
        previewBlock.appendChild(el('h2', '', 'Probar'));
        var previewChips = el('div', 'chips');
        previewChips.appendChild(chip('Escuchar el sonido elegido', false, { kind: 'preview' }));
        previewBlock.appendChild(previewChips);
        body.appendChild(previewBlock);
    }

    function activateSound(item) {
        var p = Prefs.get().sound;
        if (item.kind === 'enabled') {
            p.enabled = item.value;
            Prefs.save();
            renderSound();
            UI.refresh();
            if (p.enabled) Sound.preview();
            return;
        }
        if (item.kind === 'preset') {
            p.preset = item.value;
            Prefs.save();
            renderSound();
            UI.refresh();
            Sound.preview();
            return;
        }
        if (item.kind === 'volume') {
            p.volume = item.value;
            Prefs.save();
            renderSound();
            UI.refresh();
            Sound.preview();
            return;
        }
        if (item.kind === 'preview') Sound.preview();
    }

    // ---------- Screen saver

    function screensaverSummary() {
        var p = Prefs.get().screensaver;
        return p.enabled ? 'Tras ' + Screensaver.delay().label : 'Desactivado';
    }

    /*
     * "Change photo" only means something while the Background is on Rotate: with a single
     * photo the screen saver holds it, exactly as Home does.
     */
    function screensaverBlocks() {
        var photos = [['wallpapers', 'Fondos']];
        if (window.Featured && Featured.configured()) photos.push(['featured', 'Destacados'], ['mix', 'Ambos']);
        var blocks = [
            { title: 'Protector de pantalla', key: 'enabled', options: [[true, 'Activado'], [false, 'Desactivado']] },
            { title: 'Empezar tras', key: 'delay', options: optionPairs(Screensaver.DELAYS) },
            { title: 'Imágenes', key: 'photos', options: photos }
        ];
        if (Screensaver.rotates()) {
            blocks.push({ title: 'Cambiar imagen cada', key: 'photoEvery', options: optionPairs(Screensaver.PHOTO_EVERY) });
        }
        blocks.push(
            { title: 'Reloj', key: 'clock', options: [['move', 'Se mueve'], ['still', 'Fijo']] },
            { title: 'Clima', key: 'weather', options: [[true, 'Mostrar'], [false, 'Ocultar']] },
            { title: 'Apagar la imagen tras', key: 'dark', options: optionPairs(Screensaver.DARK_AFTER) }
        );
        return blocks;
    }

    function optionPairs(list) {
        return list.map(function (o) { return [o.key, o.label]; });
    }

    function renderScreensaver() {
        var p = Prefs.get().screensaver;
        var body = $('screensaver-body');
        body.innerHTML = '';
        screensaverBlocks().forEach(function (b) {
            var block = el('div', 'setting-block');
            block.appendChild(el('h2', '', b.title));
            var chips = el('div', 'chips');
            b.options.forEach(function (o) {
                chips.appendChild(chip(o[1], p[b.key] === o[0], { key: b.key, value: o[0] }));
            });
            block.appendChild(chips);
            body.appendChild(block);
        });

        var tryBlock = el('div', 'setting-block');
        tryBlock.appendChild(el('h2', '', 'Probar'));
        var tryChips = el('div', 'chips');
        tryChips.appendChild(chip('Mostrar ahora', false, { kind: 'preview' }));
        tryBlock.appendChild(tryChips);
        body.appendChild(tryBlock);
    }

    function activateScreensaver(item) {
        if (item.kind === 'preview') {
            Screensaver.open();
            return;
        }
        Prefs.get().screensaver[item.key] = item.value;
        Prefs.save();
        // Otherwise a countdown that began before the change could fire straight away.
        Screensaver.poke();
        renderScreensaver();
        UI.refresh();
    }

    // ---------- Apps on Home editor (two columns, custom navigation)

    var ed = { col: 0, idx: [0, 0], moving: -1, snapshot: null, items: [], others: [] };

    function edLoad() {
        ed.items = Home.homeItems().slice();
        var onHome = {};
        ed.items.forEach(function (i) { onHome[i.id] = true; });
        ed.others = Apps.allSorted(Home.apps(), false).filter(function (a) { return !onHome[a.id]; });
    }

    function edRow(item, moving) {
        var row = el('div', 'ed-item' + (moving ? ' moving' : ''));
        row.appendChild(Home.miniTile(item));
        row.appendChild(el('span', 'ed-label', item.label));
        if (moving) row.appendChild(el('span', 'ed-move', '↕'));
        return row;
    }

    function edRender() {
        var home = $('ed-home');
        home.innerHTML = '';
        ed.items.forEach(function (item, i) { home.appendChild(edRow(item, i === ed.moving)); });
        var other = $('ed-other');
        other.innerHTML = '';
        ed.others.forEach(function (item) { other.appendChild(edRow(item, false)); });
        $('ed-home-title').textContent = 'En Inicio · ' + ed.items.length;
        $('ed-other-title').textContent = 'Agregar apps · ' + ed.others.length;
        if (!ed.others.length) ed.col = 0;
    }

    function edFocusEl() {
        var list = [$('ed-home'), $('ed-other')][ed.col];
        if (!list.children.length) return null;
        ed.idx[ed.col] = UI.clamp(ed.idx[ed.col], 0, list.children.length - 1);
        return list.children[ed.idx[ed.col]];
    }

    function edSave() {
        Home.setHomeItems(ed.items);
        edLoad();
    }

    /*
     * Focus plus hints, but the hint bar is only rebuilt when its content would actually differ.
     * Arrowing through the list is the hot path on this screen and should not churn the DOM.
     */
    function edRefresh() {
        var sig = ed.col + '/' + (ed.moving >= 0);
        if (sig !== ed.hintSig) {
            ed.hintSig = sig;
            UI.refreshHints();
        }
        UI.refresh();
    }

    function edKey(k) {
        var moving = ed.moving >= 0;
        if (k === KEY.UP || k === KEY.DOWN) {
            var d = k === KEY.UP ? -1 : 1;
            if (moving) {
                var to = ed.moving + d;
                if (to < 0 || to >= ed.items.length) return true;
                var tmp = ed.items[to];
                ed.items[to] = ed.items[ed.moving];
                ed.items[ed.moving] = tmp;
                ed.moving = to;
                ed.idx[0] = to;
                edRender();
            } else {
                ed.idx[ed.col] += d;
            }
            edRefresh();
            return true;
        }
        if (k === KEY.LEFT || k === KEY.RIGHT) {
            if (!moving) {
                var col = k === KEY.LEFT ? 0 : 1;
                if ([$('ed-home'), $('ed-other')][col].children.length) ed.col = col;
                edRefresh();
            }
            return true;
        }
        if (k === KEY.ENTER) {
            if (ed.col === 0) {
                if (moving) {
                    ed.moving = -1;
                    ed.snapshot = null;
                    edSave();
                    edRender();
                } else {
                    edMenu();
                }
            } else if (ed.others.length) {
                var added = ed.others[ed.idx[1]];
                ed.items.push(added);
                edSave();
                edRender();
                UI.toast(added.label + ' agregada a Inicio');
            }
            edRefresh();
            return true;
        }
        return false;
    }

    function edMenu() {
        var i = ed.idx[0];
        var item = ed.items[i];
        if (!item) return;
        UI.menu(item.label, [
            {
                label: 'Mover', run: function () {
                    ed.moving = i;
                    ed.snapshot = ed.items.slice();
                    edRender();
                    UI.refresh();
                }
            },
            {
                label: 'Quitar de Inicio', run: function () {
                    if (ed.items.length <= 1) {
                        UI.toast('Inicio necesita al menos una app');
                        return;
                    }
                    ed.items.splice(i, 1);
                    edSave();
                    edRender();
                    UI.refresh();
                }
            },
            { label: 'Cancelar' }
        ]);
    }

    function edBack() {
        if (ed.moving < 0) return false;
        ed.items = ed.snapshot;
        ed.moving = -1;
        ed.snapshot = null;
        edRender();
        UI.refresh();
        return true;
    }

    // ---------- Consoles

    var renderConsoles = null;

    function methodOf(input) {
        var key = input.method || window.LAUNCHER_CONFIG.inputMethod;
        return METHODS.find(function (m) { return m.key === key; }) || METHODS[0];
    }

    function logoOf(input) {
        return LOGOS.find(function (l) { return l.key === (input.brand || ''); }) || LOGOS[3];
    }

    function consoleEntries() {
        var entries = Home.inputs().map(function (input, i) {
            return {
                label: input.label,
                value: input.hidden ? 'Hidden' : 'HDMI ' + input.hdmi + ' · ' + methodOf(input).label,
                mini: Home.miniInputTile(input),
                run: function () { consoleMenu(i); }
            };
        });
        entries.push({ label: '+ Add a console', value: '', run: addConsole });
        return entries;
    }

    function editInputs(change) {
        var list = Home.inputs().map(function (i) { return Object.assign({}, i); });
        change(list);
        Home.setInputs(list);
        renderConsoles();
        UI.refresh();
    }

    function consoleMenu(i) {
        var c = Home.inputs()[i];
        var count = Home.inputs().length;
        var status = Home.hdmiStatus();
        var options = [
            {
                label: 'Renombrar', run: function () {
                    rename(c.label, function (name) { editInputs(function (l) { l[i].label = name; }); });
                }
            },
            {
                label: 'Puerto HDMI · HDMI ' + c.hdmi, run: function () {
                    UI.menu('Puerto HDMI', [1, 2, 3, 4].map(function (n) {
                        return {
                            label: 'HDMI ' + n + (status[n] ? ' · conectado' : ''),
                            checked: n === c.hdmi,
                            run: function () { editInputs(function (l) { l[i].hdmi = n; }); }
                        };
                    }));
                }
            },
            {
                label: 'Logo · ' + logoOf(c).label, run: function () {
                    UI.menu('Logo', LOGOS.map(function (logo) {
                        return {
                            label: logo.label,
                            checked: logo.key === (c.brand || ''),
                            run: function () { editInputs(function (l) { l[i].brand = logo.key; }); }
                        };
                    }));
                }
            },
            {
                label: 'Se abre · ' + methodOf(c).label, run: function () {
                    UI.menu('Se abre', METHODS.map(function (m) {
                        return {
                            label: m.label + ' · ' + m.hint,
                            checked: m.key === methodOf(c).key,
                            run: function () { editInputs(function (l) { l[i].method = m.key; }); }
                        };
                    }));
                }
            },
            {
                label: c.hidden ? 'Show on Home' : 'Hide from Home',
                run: function () { editInputs(function (l) { l[i].hidden = !c.hidden; }); }
            }
        ];
        if (i > 0) {
            options.push({ label: 'Mover antes', run: function () { editInputs(function (l) { l.splice(i - 1, 0, l.splice(i, 1)[0]); }); } });
        }
        if (i < count - 1) {
            options.push({ label: 'Mover después', run: function () { editInputs(function (l) { l.splice(i + 1, 0, l.splice(i, 1)[0]); }); } });
        }
        options.push({
            label: 'Quitar', run: function () {
                UI.menu('¿Quitar ' + c.label + '?', [
                    { label: 'Quitar', run: function () { editInputs(function (l) { l.splice(i, 1); }); } },
                    { label: 'Cancelar' }
                ]);
            }
        });
        options.push({ label: 'Cancelar' });
        UI.menu(c.label, options);
    }

    function addConsole() {
        var used = {};
        Home.inputs().forEach(function (i) { used[i.hdmi] = true; });
        var port = [1, 2, 3, 4].find(function (n) { return !used[n]; }) || 1;
        editInputs(function (l) { l.push({ hdmi: port, label: 'Consola', brand: '' }); });
        var index = Home.inputs().length - 1;
        rename('Console', function (name) { editInputs(function (l) { l[index].label = name; }); });
    }

    // ---------- Rename dialog (uses Samsung's on-screen keyboard)

    var renameDone = null;

    function rename(current, done) {
        renameDone = done;
        $('rename-input').value = current;
        UI.show('rename');
    }

    function closeRename(save) {
        var input = $('rename-input');
        var value = input.value.trim();
        var done = renameDone;
        renameDone = null;
        input.blur();
        UI.back();
        if (save && value && done) done(value);
    }

    // ---------- Advanced

    function advancedEntries() {
        var entries = [
            {
                label: 'Actualizar lista de apps', value: 'Tras instalar o quitar apps', run: function () {
                    UI.toast('Actualizando la lista de apps…');
                    Home.reloadApps().then(function () { UI.toast('Lista de apps actualizada'); });
                }
            }
        ];
        if (window.LAUNCHER_CONFIG.devLogUrl) {
            entries.push({
                label: 'Exportar ajustes', value: 'Los envía al registro del Mac', run: function () {
                    DevLog.log('Settings export', Prefs.get());
                    UI.toast('Ajustes enviados al registro del Mac');
                }
            });
        }
        entries.push({
            label: 'Restablecer ajustes', value: 'Volver a los valores iniciales', run: function () {
                UI.menu('¿Restablecer todos los ajustes?', [
                    {
                        label: 'Restablecer', run: function () {
                            Prefs.reset();
                            location.reload();
                        }
                    },
                    { label: 'Cancelar' }
                ]);
            }
        });
        entries.push({ label: 'Lab', value: 'Pruebas de desarrollo', run: function () { UI.show('lab'); } });
        return entries;
    }

    // ---------- Registration

    function init() {
        registerList('settings', overviewEntries,
            [['OK', 'Cambiar'], ['◀ ▶', 'Cambiar columna'], ['Atrás', 'Inicio']], true);
        registerList('advanced', advancedEntries, [['OK', 'Ejecutar'], ['Atrás', 'Ajustes']]);
        renderConsoles = registerList('consoles', consoleEntries,
            [['OK', 'Opciones'], ['Atrás', 'Ajustes']]);

        UI.register('bg', {
            el: $('bg-settings'),
            rows: function () { return chipRows($('bg-body')); },
            onShow: renderBackground,
            activate: activateBackground,
            hints: [['OK', 'Elegir'], ['Atrás', 'Ajustes']]
        });

        UI.register('home-settings', {
            el: $('home-settings'),
            rows: function () { return pairRows($('home-settings-body')); },
            onShow: renderHomeSettings,
            activate: activateHomeSettings,
            hints: [['OK', 'Elegir'], ['Atrás', 'Ajustes']]
        });

        UI.register('appearance', {
            el: $('appearance'),
            rows: function () { return chipRows($('appearance-body')); },
            onShow: renderAppearance,
            activate: activateAppearance,
            hints: [['OK', 'Elegir'], ['Atrás', 'Ajustes']]
        });

        UI.register('sound-settings', {
            el: $('sound-settings'),
            rows: function () { return chipRows($('sound-body')); },
            onShow: renderSound,
            activate: activateSound,
            hints: [['OK', 'Elegir / Escuchar'], ['Atrás', 'Ajustes']]
        });

        UI.register('screensaver-settings', {
            el: $('screensaver-settings'),
            rows: function () { return pairRows($('screensaver-body')); },
            onShow: renderScreensaver,
            activate: activateScreensaver,
            hints: [['OK', 'Elegir'], ['Atrás', 'Ajustes']]
        });

        UI.register('homeapps', {
            el: $('homeapps'),
            onShow: function (opts) {
                if (!opts.back) {
                    ed.col = 0;
                    ed.idx = [0, 0];
                    ed.moving = -1;
                }
                edLoad();
                edRender();
            },
            focusEl: edFocusEl,
            onKey: edKey,
            onBack: edBack,
            hints: function () {
                if (ed.moving >= 0) {
                    return [['▲ ▼', 'Reordenar'], ['OK', 'Soltar aquí'], ['Atrás', 'Cancelar']];
                }
                return [
                    ['OK', ed.col === 0 ? 'Opciones' : 'Agregar a Inicio'],
                    ['◀ ▶', 'Cambiar columna'],
                    ['Atrás', 'Ajustes']
                ];
            }
        });

        UI.register('rename', {
            el: $('rename'),
            overlay: true,
            focusEl: function () { return $('rename-input'); },
            hints: [['OK', 'Guardar'], ['Atrás', 'Cancelar']],
            onShow: function () {
                setTimeout(function () {
                    var input = $('rename-input');
                    input.focus();
                    input.setSelectionRange(input.value.length, input.value.length);
                }, 0);
            },
            onKey: function (k) {
                if (k === KEY.ENTER || k === IME_DONE) {
                    closeRename(true);
                    return true;
                }
                if (k === KEY.BACK || k === KEY.ESC || k === IME_CANCEL) {
                    closeRename(false);
                    return true;
                }
                return 'pass';
            }
        });

        Home.onAppsChanged(function () {
            if (UI.isVisible('homeapps') && ed.moving < 0) {
                edLoad();
                edRender();
                UI.refresh();
            }
        });
    }

    window.Settings = { init: init };
})();
