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
3. Recomendado: Ajustes → General → Teclado → **フリックのみ** (solo deslizar, sin multitoque).

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
scripts/         post-build (precache del service worker)
```
