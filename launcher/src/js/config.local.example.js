/*
 * Copia este archivo a js/config.local.js y pon tus valores. Ese archivo está en .gitignore: entra
 * en tu .wgt (npm run build) y en la vista previa, pero nunca al repositorio.
 *
 * Se mezcla sobre js/config.js un nivel de profundidad: puedes poner weather.latitude sin repetir
 * el resto del bloque. Las listas (apps, inputs) reemplazan completa la de config.js.
 */
window.LAUNCHER_LOCAL = {
    // Apps de la isla, en orden. Los ids salen de la TV: sdb shell 0 vd_applist
    // apps: [
    //     { id: 'org.tizen.netflix-app', label: 'Netflix' },
    //     { id: 'xvvl3S1TT1.TizenTubeStandalone', label: 'YouTube', brand: 'youtube' }
    // ],

    // Entradas HDMI con algo conectado (vacío = no se muestra la fila).
    // inputs: [{ hdmi: 2, label: 'Apple TV' }],

    // Ícono que cambia a la TV por cable/antena (sintonizador) y abre el visor de Samsung.
    // tvTile: { label: 'TV cable' },

    // Idioma de la fecha y del clima.
    // locale: 'es-CL',

    // Clima (Open-Meteo, sin clave). Dos decimales bastan.
    // weather: { latitude: -33.45, longitude: -70.67, city: 'Santiago' },

    // "Destacados" (TMDB). Token de lectura gratis en themoviedb.org → Ajustes → API.
    // Ids de servicios por país: https://api.themoviedb.org/3/watch/providers/tv?watch_region=CL
    // featured: {
    //     token: '<TMDB API Read Access Token>',
    //     region: 'CL',
    //     language: 'es-CL',
    //     providers: [
    //         { id: 8, app: 'org.tizen.netflix-app', label: 'Netflix' },
    //         { id: 119, app: 'org.tizen.primevideo', label: 'Prime Video' },
    //         { id: 1899, app: '5b8c3eb16b.BeamCTVDev', label: 'HBO Max' }
    //     ]
    // },

    // Registro de desarrollo: `npm run devlog` en tu computador.
    // devLogUrl: 'http://<ip-de-tu-computador>:8099/log'
};
