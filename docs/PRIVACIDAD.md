# Privacidad y arranque: ajustes a mano (Samsung TU7000, Tizen 5.5)

En Tizen no hay una consola para cambiar estos ajustes por comando (la de la Philips con ADB sí lo
permitía). Todo se hace con el control remoto. Los nombres son los del menú en español de una TV
2020; pueden variar un poco según el firmware y la región.

## 1. Que la TV arranque en el launcher

Samsung no deja reemplazar su pantalla de inicio (ver `BITACORA.md`). La forma oficial de
acercarse es que la TV reabra la última app usada:

1. **Configuración → General → Funciones inteligentes**
2. **Ejecución automática de Smart Hub:** desactivado (que no abra el menú de Samsung al encender).
3. **Ejecución automática de la última app:** activado.

Con eso, si apagas la TV estando en TizenMod, al encender vuelve al launcher. Si la apagas dentro
de Netflix, vuelve a Netflix. Al salir de una app con **Atrás**, Tizen regresa a la app anterior
(el launcher, si la abriste desde ahí).

### Dejar TizenMod solo en la barra de Samsung

El botón Home no se puede remapear (ver `BITACORA.md`, paso 13), pero sí se puede limpiar la barra
que abre, para que Home → OK siempre lleve a TizenMod:

1. Botón **Home** del control.
2. Por cada app de la barra: selecciónala, presiona **abajo** (o mantén OK) → **Quitar** /
   **Eliminar de Inicio**. En las apps de terceros esto solo las saca de la barra; no las
   desinstala, y siguen en TizenMod. Antes de confirmar, revisa que diga "quitar de Inicio" y no
   "Eliminar app".
3. Si TizenMod no está en la barra: **Apps** → busca TizenMod → **Agregar a Inicio**.
4. Selecciona TizenMod → abajo → **Mover** → llévalo al primer lugar.

Algunos elementos fijos de Samsung (Fuente, Buscar, Ambient, Samsung TV Plus, según firmware) no se
pueden quitar; quedan, pero TizenMod sale primero.

## 2. Privacidad

**Configuración → General → Términos y política de privacidad** (en algunos firmwares:
"Condiciones y privacidad"):

| Opción | Qué hace | Recomendado |
| --- | --- | --- |
| Servicios de información de visualización | Reconoce lo que ves (ACR) y lo envía a Samsung | Desactivar |
| Servicio de anuncios basados en intereses | Perfil publicitario | Desactivar |
| Servicios de reconocimiento de voz / Bixby | Envía audio a Samsung o terceros | Desactivar si no usas la voz |
| Restablecer PSID | Nuevo identificador publicitario | Usar una vez después de desactivar lo anterior |

Además:

- **Configuración → General → Funciones inteligentes → Samsung TV Plus / canales gratuitos**:
  si aparece la opción de abrirlo al encender, desactivarla.
- **Configuración → Soporte → Actualización de software → Actualización automática**: a gusto.
  Una actualización de firmware puede cambiar el comportamiento del modo desarrollador.

## 3. Bloquear anuncios y rastreo en la red

En la casa de la Philips hay un AdGuard Home (10.10.0.20) que filtra toda la red. Esta TV está en
otra red (192.168.1.x) y **no** pasa por ese filtro. Opciones:

- **Solo la TV:** Configuración → General → Red → Estado de la red → **Configuración IP** →
  DNS: Ingresar manualmente → `94.140.14.14` (AdGuard DNS público, bloquea anuncios y rastreo).
- **Toda la red:** poner ese DNS en el router (192.168.1.1).

Ojo: el DNS no quita los anuncios de YouTube (vienen del mismo dominio que los videos); para eso
está TizenTube.
