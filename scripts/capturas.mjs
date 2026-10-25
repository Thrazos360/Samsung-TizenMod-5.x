// Capturas de TizenMod en 1920x1080, con el mismo código que corre en la TV.
//
// La TV no permite capturar su pantalla (sin consola, `sdb pull` bloqueado, y una app web no puede
// leer la imagen), así que esto abre la vista previa del launcher en Chrome sin ventana, le inyecta
// la lista real de apps y fuentes de la TV (apps-tv.json, sacada con `sdb shell 0 vd_applist`) y
// recorre cada pantalla con teclas simuladas del control.
//
//   cd launcher && npm run preview          # en otra terminal
//   node scripts/capturas.mjs [carpeta-salida] [--solo-incluidos]
//
// --solo-incluidos: ignora tus fondos locales (js/wallpapers.local.js) y usa los genéricos, para
// capturas que se van a publicar.
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PREVIEW = 'http://localhost:8080/';
const PORT = 9333;
const here = import.meta.dirname;
const args = process.argv.slice(2);
const onlyBundled = args.includes('--solo-incluidos');
const out = resolve(args.find((a) => !a.startsWith('--')) || join(here, '..', 'capturas'));
// Fondo local → fondo incluido equivalente, para --solo-incluidos.
const BUNDLED = { 'puente-lago': 'coast', 'catatumbo': 'night-sky', 'torres-paine': 'valley-snow',
    'vereda-lago': 'hills', 'miscanti': 'aurora', 'chiquinquira': 'kyoto', 'lago-lagunillas': 'waterfall' };
function publicPrefs(prefs) {
    const p = JSON.parse(JSON.stringify(prefs || {}));
    if (onlyBundled && p.wallpaper) {
        if (BUNDLED[p.wallpaper.photo]) p.wallpaper.photo = BUNDLED[p.wallpaper.photo];
        if (p.wallpaper.set === 'local') p.wallpaper.set = 'all';
    }
    return p;
}
const apps = JSON.parse(readFileSync(join(here, 'apps-tv.json'), 'utf8'));
// Lo que reporta la TV real: sintonizador conectado, HDMI 1 y 2 libres.
const sources = { connected: [{ type: 'TV', number: 1 }], disconnected: [{ type: 'HDMI', number: 1 }, { type: 'HDMI', number: 2 }] };

const KEY = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13 };

// Cada captura: nombre, pantalla (hash), preferencias guardadas, teclas, y JS opcional.
const SHOTS = [
    { name: '01-inicio-isla', prefs: { wallpaper: { mode: 'photo', photo: 'puente-lago' } } },
    { name: '02-inicio-destacados-enfocado', prefs: { wallpaper: { mode: 'photo', photo: 'puente-lago' } }, keys: ['UP', 'RIGHT'] },
    { name: '03-inicio-app-enfocada', prefs: { wallpaper: { mode: 'photo', photo: 'catatumbo' } }, keys: ['RIGHT', 'RIGHT', 'RIGHT'] },
    { name: '04-inicio-panoramicos-oscuro', prefs: { wallpaper: { mode: 'photo', photo: 'torres-paine' }, layout: { shape: 'wide', dock: 'dark' } } },
    { name: '05-inicio-sin-destacados', prefs: { wallpaper: { mode: 'photo', photo: 'vereda-lago' }, layout: { featured: false } } },
    { name: '06-inicio-iconos-grandes-sin-fondo', prefs: { wallpaper: { mode: 'photo', photo: 'miscanti' }, layout: { size: 'l', dock: 'none', featured: false } } },
    { name: '07-inicio-clasico', prefs: { wallpaper: { mode: 'photo', photo: 'chiquinquira' }, layout: { style: 'classic' } } },
    { name: '08-todas-las-apps', view: 'all', prefs: { wallpaper: { mode: 'photo', photo: 'puente-lago' } } },
    { name: '09-ajustes', view: 'settings', prefs: { wallpaper: { mode: 'photo', photo: 'puente-lago' } } },
    { name: '10-ajustes-inicio', view: 'home-settings' },
    { name: '11-ajustes-fondo-una-foto', view: 'bg', prefs: { wallpaper: { mode: 'photo', photo: 'puente-lago' } } },
    { name: '12-ajustes-fondo-rotar', view: 'bg', prefs: { wallpaper: { mode: 'rotate', photo: 'catatumbo', set: 'local' } } },
    { name: '13-ajustes-apariencia', view: 'appearance' },
    { name: '14-ajustes-sonido', view: 'sound-settings' },
    { name: '15-ajustes-protector', view: 'screensaver-settings' },
    { name: '16-ajustes-apps-en-inicio', view: 'homeapps' },
    { name: '17-ajustes-avanzado', view: 'advanced' },
    { name: '18-protector-fondos', prefs: { wallpaper: { mode: 'photo', photo: 'lago-lagunillas' } }, run: 'Screensaver.open()', wait: 4500 },
    { name: '19-protector-destacados', prefs: { screensaver: { photos: 'featured' } }, run: 'Screensaver.open()', wait: 5000 }
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
    mkdirSync(out, { recursive: true });
    const profile = mkdtempSync(join(tmpdir(), 'capturas-'));
    const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`,
        `--user-data-dir=${profile}`, '--window-size=1920,1080', 'about:blank'], { stdio: 'ignore' });
    try {
        let pages = null;
        for (let i = 0; i < 50 && !pages; i++) {
            try { pages = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); } catch { await sleep(200); }
        }
        const page = pages.find((p) => p.type === 'page');
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((r) => ws.addEventListener('open', r, { once: true }));
        let id = 0;
        const waiting = new Map();
        ws.addEventListener('message', (e) => {
            const msg = JSON.parse(e.data);
            if (msg.id && waiting.has(msg.id)) { waiting.get(msg.id)(msg); waiting.delete(msg.id); }
        });
        const send = (method, params = {}) => new Promise((r) => {
            const n = ++id;
            waiting.set(n, r);
            ws.send(JSON.stringify({ id: n, method, params }));
        });

        await send('Page.enable');
        if (onlyBundled) {
            // Answer the local wallpaper catalog with an empty script.
            await send('Fetch.enable', { patterns: [{ urlPattern: '*wallpapers.local.js*' }] });
            ws.addEventListener('message', (e) => {
                const msg = JSON.parse(e.data);
                if (msg.method !== 'Fetch.requestPaused') return;
                ws.send(JSON.stringify({ id: ++id, method: 'Fetch.fulfillRequest', params: {
                    requestId: msg.params.requestId, responseCode: 200,
                    responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }],
                    body: Buffer.from('/* local wallpapers hidden for public screenshots */').toString('base64')
                } }));
            });
        }
        await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });

        // Warm-up: the first load fetches the TMDB backdrops into an empty cache.
        await send('Page.navigate', { url: PREVIEW });
        await sleep(9000);

        for (const shot of SHOTS) {
            const inject = `window.__MOCK_APPS__ = ${JSON.stringify(apps)};
                window.__MOCK_SOURCES__ = ${JSON.stringify(sources)};
                if (location.origin === ${JSON.stringify(new URL(PREVIEW).origin)}) {
                    localStorage.clear();
                    localStorage.setItem('tizenmod.prefs.v1', ${JSON.stringify(JSON.stringify(publicPrefs(shot.prefs)))});
                }`;
            const { result } = await send('Page.addScriptToEvaluateOnNewDocument', { source: inject });
            // about:blank first: a hash-only change would not reload the page or re-read prefs.
            await send('Page.navigate', { url: 'about:blank' });
            await sleep(200);
            await send('Page.navigate', { url: PREVIEW + (shot.view ? '#' + shot.view : '') });
            await sleep(5500);  // destacados (TMDB), clima y fondos
            for (const k of shot.keys || []) {
                for (const type of ['keyDown', 'keyUp']) {
                    await send('Input.dispatchKeyEvent', { type, windowsVirtualKeyCode: KEY[k], nativeVirtualKeyCode: KEY[k] });
                }
                await sleep(250);
            }
            if (shot.run) await send('Runtime.evaluate', { expression: shot.run });
            await sleep(shot.wait || 600);
            const shotData = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
            writeFileSync(join(out, shot.name + '.jpg'), Buffer.from(shotData.result.data, 'base64'));
            await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: result.identifier });
            console.log(shot.name);
        }
        ws.close();
    } finally {
        chrome.kill();
        await sleep(300);
        rmSync(profile, { recursive: true, force: true });
    }
}

main().catch((e) => { console.error(e); process.exit(1); });
