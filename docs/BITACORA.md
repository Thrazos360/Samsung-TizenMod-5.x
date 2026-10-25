# Bitácora: Samsung UN55TU7090 (Tizen 5.5)

Registro paso a paso de todo lo que se hizo con esta TV, en orden, con los comandos exactos y lo
que respondieron. Sirve para repetirlo en otra TV o para deshacerlo.

## La TV

| | |
| --- | --- |
| Modelo | UN55TU7090GXZS ("[TV] Samsung 7 Series (55)"), 2020, serie TU7000 |
| Código interno | `20_KANTSU2_UHD_BASIC` |
| Sistema | Tizen **5.5**, procesador armv7 (32 bits), perfil `tv` |
| DUID (ID del equipo) | `<DUID de tu TV>` |
| Red | TV `192.168.1.93`, Mac `192.168.1.122`, router `192.168.1.1` |

## Diferencia clave con Android TV

En la Philips (Google TV) se usó ADB: se pudieron desactivar apps del sistema, reemplazar el launcher
y cambiar ajustes ocultos. En Tizen, el modo desarrollador **solo** permite instalar apps propias
(`.wgt`) firmadas. No hay consola libre: comandos como `sdb shell id` o `vconftool` no devuelven
nada. Por eso:

- no se pueden desactivar apps del sistema ni cambiar la pantalla de inicio de Samsung;
- la privacidad se ajusta a mano desde los menús (ver `PRIVACIDAD.md`);
- el launcher se instala como app normal.

---

## Paso 1 — Activar el modo desarrollador en la TV

1. En la TV: **Apps** → con el panel abierto, marcar `1 2 3 4 5` en el control.
2. **Developer mode: On**, **Host PC IP:** la IP del Mac (`192.168.1.122`).
3. Reiniciar en frío: mantener presionado el botón de encendido hasta que aparezca el logo.
   **Sin este reinicio, el puerto de desarrollo (26101) queda cerrado.**

Comprobación desde el Mac, sin herramientas (la TV publica su estado en el puerto 8001):

```sh
# encontrar la TV por mDNS
dns-sd -B _samsungmsf._tcp local.
dns-sd -L "<uuid que aparezca>" _samsungmsf._tcp local.   # devuelve la IP

curl -s http://192.168.1.93:8001/api/v2/ | python3 -m json.tool
#   "developerMode": "1", "developerIP": "192.168.1.122", "modelName": "UN55TU7090GXZS"

nc -z -G 3 192.168.1.93 26101     # puerto de sdb: debe decir "succeeded"
```

## Paso 2 — Instalar Tizen Studio CLI en el Mac

El repo `Samsung/tizen-docs` es solo documentación; lo que hace falta es Tizen Studio CLI.

```sh
mkdir -p ~/Downloads/tizen && cd ~/Downloads/tizen
curl -fL -o web-cli.bin \
  https://download.tizen.org/sdk/Installer/tizen-studio_6.1/web-cli_Tizen_Studio_6.1_macos-64.bin
chmod +x web-cli.bin
./web-cli.bin --accept-license ~/tizen-studio
```

- Solo existe en x86_64; en un Mac con Apple Silicon corre con Rosetta.
- Trae su propio Java (lo deja en `~/.package-manager/jdk`).
- Herramientas: `~/tizen-studio/tools/sdb` y `~/tizen-studio/tools/ide/bin/tizen`.

Paquetes adicionales (certificados de Samsung y extensión de TV):

```sh
~/tizen-studio/package-manager/package-manager-cli.bin install --accept-license \
  Certificate-Manager cert-add-on TV-SAMSUNG-Extension-Tools
```

## Paso 3 — Conectar con sdb (y el problema de macOS)

```sh
~/tizen-studio/tools/sdb connect 192.168.1.93
# error: failed to connect to remote target '192.168.1.93'
```

La TV sí acepta la conexión: un saludo SDB (`CNXN`) enviado a mano con Python responde
`device::UN55TU7090GXZS::0`. El bloqueo está en el Mac: el servidor de `sdb` corre en segundo plano
y, con mayor probabilidad, el permiso de **Red local** de macOS no lo deja salir a la red.

Solución: un reenviador local (`scripts/sdb-proxy.py`). Las conexiones a `127.0.0.1` no pasan por
ese permiso, y el reenviador (lanzado desde la terminal) sí puede llegar a la TV.

```sh
python3 scripts/sdb-proxy.py 192.168.1.93 &      # 127.0.0.1:26111 -> 192.168.1.93:26101
~/tizen-studio/tools/sdb connect 127.0.0.1:26111
~/tizen-studio/tools/sdb devices
#   emulator-26111   device   UN55TU7090GXZS
```

`sdb` llama "emulator" a cualquier dispositivo en 127.0.0.1; es solo el nombre. El reenviador se
cierra con la sesión de terminal; hay que lanzarlo de nuevo antes de cada conexión.

Comandos útiles que la TV sí acepta (`shell 0 <comando>`):

```sh
sdb -s emulator-26111 capability            # versión de Tizen, arquitectura
sdb -s emulator-26111 shell 0 getduid       # DUID para el certificado
sdb -s emulator-26111 shell 0 vd_applist    # apps instaladas, con su app id
```

## Paso 4 — Certificado de Samsung

Las TV Samsung solo instalan apps firmadas con un certificado de autor + uno de distribuidor de
Samsung que incluya el DUID de la TV.

```sh
open ~/tizen-studio/tools/certificate-manager/certificate-manager.app
```

1. **+** → **Samsung** → **TV** → perfil `samsungtv`.
2. Certificado de autor nuevo (nombre + contraseña).
3. Iniciar sesión con la cuenta Samsung en el navegador.
4. Distribuidor con el DUID `<DUID de tu TV>`. Nivel: **Public** primero; **Partner** después, porque
   TizenTube lo exige (ver paso 7).

Queda en `~/SamsungCertificate/samsungtv/` y el perfil en `~/tizen-studio-data/profile/profiles.xml`.
**Respaldar esa carpeta:** sin el mismo certificado de autor, actualizar una app obliga a
desinstalarla primero (y se pierden sus ajustes).

## Paso 5 — Launcher (fork de arn0-tv)

Base: <https://github.com/NelsonEU/arn0-tv> (MIT), un launcher web hecho para una Samsung Q70B con
Tizen 6.5. Solo se usa la parte 1 (instalarlo como app). La parte 2 de su guía (cambiar el botón
Home con un ayudante nativo) no aplica: el autor lo amarró a su firmware, no publicó el ejecutor y en
esta TV no hay consola libre.

```sh
# en este repo el fork ya está en launcher/ (TizenMod)
cd launcher
npm run preview            # vista previa en http://localhost:8080
```

Configuración propia de esta TV en `src/js/config.local.js` (ignorado por git): las apps instaladas
(ids sacados con `vd_applist`), sin entradas HDMI, `es-CL`, clima de Santiago.

### Firmar e instalar

`tizen install` falla con "There is the problem to transfer package" a través del reenviador,
aunque `sdb push` funciona. Se instala con los comandos propios de la TV:

```sh
npm run build                                   # -> dist/tizenmod.wgt (antes arn0-launcher.wgt), sin firmar
cp dist/tizenmod.wgt /tmp/firmar/ && cd /tmp/firmar
~/tizen-studio/tools/ide/bin/tizen package -t wgt -s samsungtv -- tizenmod.wgt
sdb -s emulator-26111 push tizenmod.wgt /home/owner/share/tmp/sdk_tools/tizenmod.wgt
sdb -s emulator-26111 shell 0 vd_appinstall TizenMod00 /home/owner/share/tmp/sdk_tools/tizenmod.wgt
#   app_id[TizenMod00] install completed
sdb -s emulator-26111 shell 0 was_execute TizenMod00.Launcher      # abrirlo
sdb -s emulator-26111 shell 0 rm /home/owner/share/tmp/sdk_tools/tizenmod.wgt
```

`scripts/instalar.sh` hace todo eso en un solo paso.

Desinstalar: `sdb -s emulator-26111 shell 0 vd_appuninstall <paquete>` (por ejemplo `TizenMod00`), o
desde la lista de apps de la TV. Sin argumento no responde nada; con un id válido sí funciona.

## Paso 6 — Registro remoto (ver errores de la TV desde el Mac)

La TV no deja capturar pantalla ni ver la consola del navegador. El launcher ya traía un registro que
puede enviar líneas al Mac; se activó y se le agregó el envío de errores no capturados.

```sh
cd launcher && npm run devlog          # escucha en el puerto 8099, escribe logs/tv.jsonl
# en src/js/config.local.js:  devLogUrl: 'http://192.168.1.122:8099/log'
```

Primer dato útil: el navegador de la TV es **Chromium 69**
(`Tizen 5.5 ... 69.0.3497.106/5.5 TV Safari`). El launcher se hizo para Chromium 85, así que:

- el `gap` de flexbox no existe (llegó en Chromium 84): se reemplazó por márgenes en la barra de
  ayuda y en el reloj del protector de pantalla;
- el JavaScript del launcher es ES5, así que funciona sin cambios.

## Paso 7 — Certificado Partner y TizenTube

TizenTube (YouTube sin anuncios, con SponsorBlock) tiene una versión para Tizen 3–5.5:
`TizenTubeOld.wgt` de <https://github.com/reisxd/TizenTube/releases> (v2.1.1). Pide permisos de
nivel Partner (`network.public` y un servicio de fondo), así que se recreó **solo el certificado de
distribuidor** del perfil `samsungtv` con nivel **Partner** (mismo certificado de autor, para poder
seguir actualizando el launcher sin desinstalarlo).

```sh
curl -fsSL -o TizenTube.wgt \
  https://github.com/reisxd/TizenTube/releases/download/v2.1.1/TizenTubeOld.wgt
scripts/instalar.sh TizenTube.wgt --abrir
#   Paquete: xvvl3S1TT1  App: xvvl3S1TT1.TizenTubeStandalone
#   app_id[xvvl3S1TT1] install completed
```

La guía de TizenTube advierte que en Tizen 5.5 o anterior puede hacer falta poner
**Host PC IP = 127.0.0.1** en el modo desarrollador (y reiniciar) si los videos no se reproducen.
Eso corta la conexión desde el Mac: para volver a instalar algo, hay que poner de nuevo la IP del Mac.

En el launcher, la ficha de YouTube apunta a TizenTube (`xvvl3S1TT1.TizenTubeStandalone`).

## Paso 8 — Universal+

No hay app de Universal+ para Samsung en Chile. En TMDB, Universal+ figura en Chile como
**"Universal+ Amazon Channel"**: se contrata y se ve dentro de **Prime Video** (Channels), que ya
está instalada. Las apps de la tienda de Samsung no se pueden instalar desde el Mac.

## Paso 9 — Rediseño del launcher

Cambios en el fork (detalle en `docs/TIZENMOD.md`):

- **Diseño "Isla"** (por defecto): reloj grande centrado, fecha, línea de clima
  ("Santiago · 23° Nublado · 24° / 6°") y las apps en una isla redondeada abajo.
- **Destacados**: fila de títulos populares en Netflix, Prime Video y HBO Max en Chile (TMDB). OK
  abre la app del servicio.
- **Ajustes → Inicio**: diseño (isla/clásico), fondo de la isla (vidrio/oscuro/sin fondo), forma y
  tamaño de los íconos, clima, destacados, oscurecer el fondo.
- **Protector de pantalla**: imágenes (fondos / destacados / ambos), reloj fijo o en movimiento,
  clima on/off.
- **Fondos locales**: `scripts/add-wallpapers.mjs <carpeta> [creditos.json]` agrega fotos propias
  (de tu país o ciudad) **fuera de git**; en Ajustes → Fondo → Rotar se puede elegir "Mis fondos".
  En esta TV: 8 del Zulia (Puente sobre el Lago, Catatumbo, Chiquinquirá, Vereda del Lago…) y 7 de
  Chile (Torres del Paine, Atacama…), de Wikimedia Commons con su licencia en los créditos.
- Toda la interfaz en español.

Verificado en la TV: arranca sin errores en el registro y descarga los 15 destacados.

## Paso 10 — Arranque con el launcher

La consola de la TV no ejecuta comandos genéricos, así que no se puede repetir el método del autor
de arn0 (cambiar `db/appfw/home_appid` con un ayudante nativo). Se usa la opción oficial
"Ejecución automática de la última app": ver `PRIVACIDAD.md`, sección 1.

## Paso 11 — Qué permite exactamente el modo desarrollador

Lo dice la propia TV con `sdb -s emulator-26111 capability`:

| Capacidad | Valor | Significado |
| --- | --- | --- |
| `intershell_support` | disabled | No hay consola interactiva ni genérica |
| `sdbd_rootperm`, `rootonoff_support` | disabled | Sin root y sin forma de pedirlo |
| `appcmd_support` | disabled | El canal genérico `appcmd` de Tizen está apagado |
| `filesync_support` | pushpull | Hay transferencia de archivos (ver abajo) |
| `pkgcmd_debugmode`, `netcoredbg_support` | enabled | Depuración de apps propias |

Comandos que sí responden (`sdb shell 0 <comando>`):

| Comando | Para qué |
| --- | --- |
| `getduid` | ID del equipo (para el certificado) |
| `vd_applist` | Lista de apps instaladas con su id |
| `vd_appinstall <paquete> <ruta>` | Instalar un `.wgt` firmado ya copiado |
| `vd_appuninstall <paquete>` | Desinstalar |
| `was_execute <app id>` | Abrir una app web |
| `was_kill <app id>` | Cerrar una app web |

Cualquier otro comando (`id`, `ls`, `cat`…) se ignora en silencio. `sdb push` funciona hacia
`/home/owner/share/tmp/sdk_tools/`; `sdb pull` está bloqueado en todas las rutas probadas
("You cannot pull files from this path"). En resumen: el modo desarrollador sirve para instalar,
abrir, cerrar, desinstalar y depurar apps propias firmadas; los ajustes del sistema solo se cambian
desde los menús.

## Paso 12 — TizenMod: nombre, íconos, isla más chica y sonidos

- El launcher pasa a llamarse **TizenMod** (id `TizenMod00.Launcher`, archivo `dist/tizenmod.wgt`)
  con ícono propio. El paquete anterior se quitó con `vd_appuninstall Arn0Lnchr0`.
- Íconos corregidos: **HBO Max** (logo tipográfico "HBO max" sobre azul; Simple Icons solo tiene la
  placa "max" de 2023), **Apple Music** (nota blanca sobre el degradado rojo de Apple) e
  **Internet** (globo sobre azul en vez de las iniciales). Internet se agregó a la isla.
- Isla más pequeña: íconos de 128 px (antes 168), menos relleno, tarjetas de Destacados más chicas.
- Sonidos sintetizados (sin archivos de audio): clic tipo Apple TV al moverse, campanita al abrir
  con OK, tono descendente con Atrás, golpe sordo al llegar al borde. Ajustes → Sonido al navegar:
  estilo (Clic, Pop, Suave, Cálido, Brillante) y volumen (Bajo, Medio, Alto).

Verificado en la TV: TizenMod arranca sin errores y carga los destacados.

## Paso 13 — TV cable, botones de color y barra de Samsung

- Fuentes que reporta la TV (`tizen.systeminfo` VIDEOSOURCE, registrado al iniciar TizenMod):
  `connected TV | disconnected HDMI 1, HDMI 2`. La TV por cable entra por el sintonizador.
- Nuevo ícono **TV cable** en la isla (`tvTile` en `config.local.js`): cambia la ventana principal a
  la fuente TV con `tizen.tvwindow.setSource` y abre el visor de Samsung (`org.tizen.tv-viewer`), que
  maneja canales, guía y números.
- Botones de color **dentro de TizenMod**: A (rojo) = TV cable, B (verde) = siguiente fondo,
  C (amarillo) = todas las apps, D (azul) = Ajustes. Fuera de TizenMod la TV no se los entrega a
  ninguna app propia, así que no sirven como atajo global.
- **Botón Home**: no se puede remapear. La asignación vive en ajustes internos de Samsung
  (`home_appid`) que el modo desarrollador no deja tocar (paso 11). La alternativa es dejar TizenMod
  como única app en la barra de Samsung (`PRIVACIDAD.md`, sección 1): Home → OK.
