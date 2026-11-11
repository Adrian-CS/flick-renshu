# フリック練習 (flick-renshu)

App personal (PWA, mobile-first, offline) para aprender a escribir japonés con フリック入力,
el teclado de 12 teclas del móvil, deslizando. Todo se guarda en el propio móvil (IndexedDB);
no hay servidor ni cuentas.

## En el PC (Windows + PowerShell)

Requisitos: Node 22.23.4 (lo fija `.node-version`) y git.

```powershell
node -v            # debe decir v22.23.4 (o 24.22.1+ / 26.12.1+)
npm ci             # instala exactamente lo del package-lock.json
npm run dev        # http://localhost:3000 (desarrollo)
```

Comandos:

| comando | qué hace |
|---|---|
| `npm run dev` | servidor de desarrollo |
| `npm test` | tests (Vitest) |
| `npm run typecheck` | TypeScript (strict) |
| `npm run build` | export estático en `out/` + lista de precache del service worker |
| `npm start` | sirve `out/` para probar la build (el service worker solo se activa en la build) |
| `npm run data:words` | regenera `public/data/words.json` desde JMdict (ver abajo) |

Para probar en el iPhone en la misma wifi, `npm run dev` y abre `http://<IP-del-PC>:3000`
(la IP sale con `ipconfig`, línea «IPv4 アドレス»). Windows puede preguntar por el firewall:
permite redes privadas. Ojo: sin HTTPS no se instala como app ni hay service worker; para eso,
la versión publicada.

No publiques desde el PC: se publica solo con `git push`.

## Publicar (Cloudflare Pages)

1. dash.cloudflare.com → Workers & Pages → Create → Pages → *Connect to Git* → `Adrian-CS/flick-renshu`.
2. Configuración de build:
   - Framework preset: *None*
   - Build command: `npm run build`
   - Build output directory: `out`
   - Node: lo fija `.node-version`; no hace falta la variable `NODE_VERSION`.
3. Deploy → `https://<nombre>.pages.dev`. Cada `git push` a la rama de producción vuelve a
   publicar; las demás ramas generan previews.

`public/_headers` hace que el service worker y su lista de ficheros se revaliden en cada visita:
las versiones nuevas llegan a la app instalada y se aplican al volver a abrirla.

## Instalar en el iPhone

1. Safari → abre la URL → Compartir → *Añadir a pantalla de inicio*.
2. Ábrela una vez con conexión; desde entonces funciona en modo avión.
   Las versiones nuevas se descargan al volver a abrir la app; cuando hay una, sale un aviso
   «Hay una versión nueva» con un botón para recargar.
3. Recomendado: Ajustes → General → Teclado → **フリックのみ** (solo deslizar, sin multitoque).

## Palabras (JMdict)

`public/data/words.json` está versionado: no hace falta regenerarlo para compilar.
Sale de **JMdict** (EDRDG, licencia CC BY-SA 4.0), en el JSON de
[jmdict-simplified](https://github.com/scriptin/jmdict-simplified) (fichero `jmdict-eng-common`):
entradas comunes, lectura en hiragana escribible con el teclado, 2–8 kana, y sus formas con
kanji para reconocerlas. La atribución se ve en la app (Lecciones y Créditos) y el fichero
derivado lleva la misma licencia.

```powershell
npm run data:words                      # descarga la versión fijada en scripts/build-words.ts
npm run data:words -- .\jmdict.json.zip  # o usa un fichero ya descargado
```

El script es TypeScript que Node 22 ejecuta directamente (sin `tsx`). `meta` dentro del JSON
guarda la versión, la fecha del diccionario y el SHA-256 del fichero de origen.

## Teclado del sistema y Mis textos

- En cada lección se puede elegir **teclado virtual** (el de la app, con estadísticas por gesto)
  o **del sistema** (el フリック real del iPhone en un campo de texto). Con el del sistema se
  puede encadenar varios objetivos sin confirmar; si el objetivo está en hiragana hay que
  confirmar con 確定 sin elegir kanji. Las sesiones con el teclado del sistema se guardan
  aparte (`sys:…`) y no cambian las estadísticas por gesto.
- **Mis textos**: textos que pega el usuario (por ejemplo letras de canciones) para escribirlos
  línea a línea. Se guardan **solo en IndexedDB del móvil**; nunca van al repositorio. Con kanji
  solo sirven con el teclado del sistema (se convierte como al escribir de verdad); en kana,
  con los dos.

### Karaoke en Mis textos

- **Tiempos de cada línea:** se pega la letra en formato LRC (`[01:23.45] …`, se detecta al
  guardar) o se sincroniza a mano (suena la canción y se toca cuando empieza cada línea).
  Se pueden desplazar ±0,5 s y copiar como LRC.
- **Audio:** opcional, un fichero del móvil (mp3, m4a…), guardado solo en IndexedDB y fuera de
  la copia de seguridad. Sin audio se usa un cronómetro y la canción suena en otra app.
- **Modos:** *A tu ritmo* (sin canción), *Karaoke* (la canción sigue; al final, cuántas líneas
  se escribieron a tiempo) y *La canción te espera* (se pausa al llegar a la línea siguiente
  hasta terminar la actual).

## Progreso y copia de seguridad

進捗 muestra kana/min por sesión (teclado virtual o del sistema, por grupo de lecciones), el
mapa de calor de fallos / pistas / tiempo por tecla y dirección, y los gestos que más cuestan.
Desde ahí se exporta todo (estadísticas, sesiones, ajustes y Mis textos) a un `.json` y se
vuelve a importar sin duplicar.

## Seguridad de dependencias

- `.npmrc` tiene `ignore-scripts=true`: npm no ejecuta scripts `preinstall`/`postinstall`.
- Versiones exactas + `package-lock.json`. Instala siempre con `npm ci`.
- `overrides` fija vite, rolldown, postcss y caniuse-lite en versiones parcheadas
  (igual que KanjiRenshuKen). `npm audit`: 0 avisos a 09-11-2026.
- La CI (GitHub Actions) ejecuta `npm audit`, typecheck, tests y build en cada push.

## Estructura

```
src/app/         páginas (componentes finos)
src/components/  componentes compartidos
src/lib/         lógica pura (con tests)
tests/           Vitest
public/          manifest, iconos, service worker
src/data/        frases (inventadas)
public/data/     words.json (JMdict, CC BY-SA 4.0)
scripts/         post-build (precache) y generación de words.json
```
