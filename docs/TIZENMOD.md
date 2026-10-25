# TizenMod — cambios de este fork

Fork de [NelsonEU/arn0-tv](https://github.com/NelsonEU/arn0-tv) (MIT) adaptado y probado en una
**Samsung UN55TU7090 (2020, Tizen 5.5, Chromium 69)**. El original se hizo para una Q70B con
Tizen 6.5. Solo se usa la parte "instalar como app". El ayudante nativo del original para
reasignar el botón Home (`native/` y `docs/setup-tv.md` allá) no se incluye: depende de su firmware
y en Tizen 5.5 no hay consola para ejecutarlo.

## Nombre e ícono

La app se llama **TizenMod** (`TizenMod00.Launcher`, `npm run build` → `dist/tizenmod.wgt`), con
ícono propio en `src/icon.png`. Las claves de `localStorage` usan el prefijo `tizenmod.`.

## Íconos de apps

- HBO Max: logo tipográfico (`html` en `brands.js`), porque Simple Icons solo tiene la placa "max".
- Apple Music: nota blanca sobre el degradado de Apple (`img/marks/applemusic.svg`, dibujada aquí).
- Internet (navegador de Samsung): globo (`img/marks/internet.svg`, dibujado aquí).

## TV por cable y botones de color

- `tvTile: { label: 'TV cable' }` en `config.local.js` agrega a la isla un ícono que cambia a la
  fuente TV (sintonizador) y abre el visor de Samsung.
- Botones de color dentro del launcher: A rojo = TV cable (o todas las apps si no hay `tvTile`),
  B verde = siguiente fondo, C amarillo = todas las apps, D azul = Ajustes.

## Sonidos al navegar

`src/js/sound.js` sintetiza todo con Web Audio (sin archivos): clic tipo Apple TV (ruido filtrado de
16 ms), Pop, Suave, Cálido, Brillante; campanita con OK, tono descendente con Atrás, golpe al borde.
Ajustes → Sonido al navegar: estilo y volumen.

## Diseño "Isla"

Inspirado en launchers tipo Apple TV / Projectivy:

- reloj grande centrado, fecha y una línea de clima;
- fila opcional de **Destacados** (ver abajo);
- las apps en una **isla** redondeada en la parte inferior.

Ajustes → **Inicio**: diseño (Isla / Clásico), fondo de la isla (Vidrio / Oscuro / Sin fondo),
íconos cuadrados o panorámicos, tamaño, clima bajo el reloj, Destacados, oscurecer el fondo.
El diseño Clásico es el original.

## Destacados (TMDB)

`src/js/featured.js` pide a [TMDB](https://www.themoviedb.org/) los títulos populares por servicio
de streaming en tu región, y los muestra como tarjetas; OK abre la app de ese servicio. También
pueden ser las imágenes del protector de pantalla.

Necesita un token de lectura de la API de TMDB (gratis) en `src/js/config.local.js`:

```js
featured: {
    token: '<TMDB API Read Access Token>',
    region: 'CL',              // tu país (ISO 3166-1)
    language: 'es-CL',
    providers: [               // ids de TMDB: /watch/providers/tv?watch_region=CL
        { id: 8, app: 'org.tizen.netflix-app', label: 'Netflix' },
        { id: 119, app: 'org.tizen.primevideo', label: 'Prime Video' },
        { id: 1899, app: '5b8c3eb16b.BeamCTVDev', label: 'HBO Max' }
    ]
}
```

`app` es el id de la app en tu TV (`sdb shell 0 vd_applist`). Sin token, la fila no aparece.
El token queda dentro del `.wgt`: es de solo lectura, pero no publiques un `.wgt` con tu token.

## Fondos de tu país o ciudad

Los fondos incluidos son genéricos (Unsplash). Para agregar los tuyos —tu país, tu ciudad, tus
fotos— sin que entren al repositorio:

```sh
node scripts/add-wallpapers.mjs ~/Fotos/fondos [creditos.json]
```

- Los deja en `src/img/wallpapers/local/` y `src/js/wallpapers.local.js` (ambos en `.gitignore`):
  van dentro de tu `.wgt`, nunca al repo.
- Les pone el oscurecido del diseño Isla (más oscuro tras el reloj y abajo, donde va la isla).
- `creditos.json` opcional, por nombre de archivo sin extensión:
  `{ "puente-lago": { "title": "Puente sobre el Lago", "artist": "Autor", "license": "CC0" } }`.
  El crédito se muestra al cambiar de fondo.
- Ajustes → Fondo → Rotar → **Rotar entre: Todos / Mis fondos / Incluidos**.

Wikimedia Commons es una buena fuente con licencia clara: busca tu ciudad, revisa la licencia de
cada foto y pon autor y licencia en `creditos.json`.

## Protector de pantalla

Ajustes → Protector de pantalla: imágenes (Fondos / Destacados / Ambos), reloj **Fijo** o **Se
mueve** (evita marcas en el panel), clima on/off. Además de lo que ya traía.

## Compatibilidad con Tizen 5.5 (Chromium 69)

- Sin `gap` en flexbox (llegó en Chromium 84): espaciado con márgenes.
- Errores no capturados se envían al registro del Mac (`npm run devlog` + `devLogUrl`).
- Fecha y clima en `es-CL` (las etiquetas del clima toman el idioma, no la región).

## Interfaz en español

Textos de pantallas, menús y ayudas traducidos. La pantalla Lab (pruebas de desarrollo) queda en
inglés.
