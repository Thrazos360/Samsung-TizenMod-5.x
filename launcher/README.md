# TizenMod (launcher)

App web (`.wgt`) para televisores Samsung con Tizen 5.x. Fork de
[arn0-tv](https://github.com/NelsonEU/arn0-tv) (MIT); los cambios están en
[`../docs/TIZENMOD.md`](../docs/TIZENMOD.md).

## Comandos

```sh
npm run preview      # vista previa en http://localhost:8080 (flechas, Enter, Esc = Atrás, R/G/Y/B = colores)
npm run build        # -> dist/tizenmod.wgt (sin firmar)
npm run devlog       # recibe el registro de la TV en logs/tv.jsonl
node scripts/add-wallpapers.mjs <carpeta> [creditos.json]   # tus fondos, fuera de git
```

Firmar e instalar: `../scripts/instalar.sh dist/tizenmod.wgt --abrir`.

## Configuración

- `src/js/config.js`: valores por defecto (en el repo).
- `src/js/config.local.js`: lo tuyo (apps, ciudad, token de TMDB…); en `.gitignore`. Parte de
  [`config.local.example.js`](src/js/config.local.example.js).
- La mayoría se cambia también desde Ajustes en la TV, y lo guardado en la TV manda.

## Control remoto

| Tecla | Acción |
| --- | --- |
| Flechas / OK | Moverse / abrir |
| Atrás | Volver (en Inicio no hace nada) |
| A rojo | TV cable (si está `tvTile`), si no, todas las apps |
| B verde | Siguiente fondo |
| C amarillo | Todas las apps |
| D azul | Ajustes |

## Estructura

```
src/
  config.xml        manifiesto Tizen (id TizenMod00.Launcher)
  css/style.css     escenario 1920x1080; compatible con Chromium 69 (Tizen 5.5)
  js/config.js      valores por defecto
  js/home.js        Inicio, isla, destacados, todas las apps, Lab
  js/featured.js    Destacados (TMDB)
  js/settings.js    páginas de Ajustes
  js/screensaver.js protector de pantalla
  js/sound.js       sonidos sintetizados (Web Audio)
  js/inputs.js      HDMI y TV por cable (tizen.tvwindow)
  js/tizen-mock.js  APIs de Tizen simuladas para la vista previa (inactivo en la TV)
scripts/            build.sh, serve.mjs, devlog-server.mjs, add-wallpapers.mjs, …
```
