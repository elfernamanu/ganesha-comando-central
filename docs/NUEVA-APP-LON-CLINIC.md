# Nueva app para LON CLINIC — informe de traspaso

Fecha: 16/10/2026. Este archivo resume todo lo necesario para seguir el trabajo en una conversación nueva.

## 1. Qué se pide

El técnico (dueño del proyecto, habla español rioplatense, no es programador) quiere **una app igual a la de Ganesha Esthetic** para otra estética, **LON CLINIC**, con **su propio nombre, logo y datos**.

Cómo trabajar con él:
- Explicar simple, sin jerga, con pasos cortos. Pide informes antes de tocar cosas.
- Tiene mucho miedo de perder datos: **nunca borrar ni pisar datos**, avisar antes de cualquier cambio que toque datos.
- Le gusta ver cómo va a quedar (páginas, capturas) más que mapas técnicos.
- La forma de trabajo usada hasta ahora: cambios en `main`, `git push origin main`, Vercel publica solo desde `main`.

## 2. Datos de LON CLINIC (tomados de su Instagram)

| Dato | Valor |
|---|---|
| Nombre | LON CLINIC |
| Bajada | Centro de Estética Profesional |
| Instagram | @estetica.lonclinic — https://www.instagram.com/estetica.lonclinic |
| Lema | "Vos sabés qué te molesta. Yo sé qué hacer" |
| Especialidad | Método LON · Abdomen & Rejuvenecimiento · Reducción · Firmeza · Calidad de piel |
| Servicios que se ven | Evaluación (primera consulta), Método LON (abdomen), HIFU, Depilación (DEPI), tecnología láser |
| Dirección | Diego 1516 p1A, timbre LON CLINIC, Don Torcuato, Buenos Aires (CP 1611) |
| WhatsApp | En Instagram figura `wa.me/91151812192`. **Ese link está mal**: le falta el 54 y así WhatsApp lo toma como un número de India (código 91). El número parece ser **+54 9 11 5181-2192** → link correcto `wa.me/5491151812192`. Confirmar con el técnico. |
| Otro nombre en el local | "LON CLINIC Beauty House · Don Torcuato" (cartel en pared de madera) |

Marca (sacado de la foto del perfil, confirmar con el logo original):
- Logo: círculo **verde salvia ≈ `#6B776E`** con "LON" en letras finas con serifa, claras, y "CLINIC" chico abajo.
- Color secundario posible: **madera cálida ≈ `#B47844`** (pared del local).
- Estilo: sobrio, elegante, clínico. Muy distinto del ciruela de Ganesha (`#6B2D5C`).

Falta pedirle al técnico:
1. El **logo en buena calidad** (PNG grande o SVG). La captura de Instagram sirve solo de muestra.
2. **Servicios y precios** (o los carga ella desde "Servicios y precios").
3. Si se dice **clientas, clientes o pacientes**. En LON aparece un profesional varón y es una "clínica"; puede que no sea "clientas".
4. Si trabaja por **jornadas** como Ganesha (días con cupo) o con **agenda normal + sesiones por paquete** (HIFU, Método LON suelen venderse en paquetes de sesiones). La primera versión usa lo mismo que Ganesha; paquetes de sesiones y ficha de evaluación (fotos antes/después) serían un agregado posterior.
5. Confirmar el **número de WhatsApp**.

## 3. Decisión: un solo sistema, una instalación por estética

El técnico quiere **no copiar nada**: "si mañana quiero mejorar todo el sistema, que pueda hacerlo". Por eso **no se hace un repo copia**. Se usa **este mismo repositorio** y cada estética tiene su propio Vercel y su propia base:

| | Ganesha | LON CLINIC |
|---|---|---|
| Código (GitHub) | `elfernamanu/ganesha-comando-central` | **el mismo** |
| Vercel | proyecto actual (`ganesha-comando-central.vercel.app`) | **proyecto nuevo** desde el mismo repo |
| Base de datos | Supabase de Ganesha | **Supabase nuevo**, vacío |
| Marca | `NEXT_PUBLIC_MARCA` sin definir → Ganesha | `NEXT_PUBLIC_MARCA=lon` |

Consecuencias:
- Una mejora o arreglo llega a **todas** las estéticas a la vez.
- Datos totalmente separados: cada una tiene su base.
- Un error también llega a todas: por eso hay que trabajar con ramas y vista previa (ver punto 10) en vez de publicar directo en `main`.
- Sirve igual para una tercera estética.

## 4. Estado actual (antes de empezar)

- **La web de Ganesha está APAGADA a pedido del técnico** (commit `d2b48e1`). Lo hace `src/proxy.ts` (en Next 16 `middleware` se llama `proxy`): responde 503 con un aviso a todo, menos a `/api/health` cuando lo llama el cron de Vercel (user-agent `vercel-cron`), para que Supabase no se pause.
- El técnico dijo "ya cargué crédito" pero no aclaró de qué ni si quiere prender Ganesha. **Preguntarle.**
- Base de Ganesha: Supabase, conectada con `DATABASE_URL` en Vercel (pooler de transacciones, puerto 6543). `POSTGRES_URL` es la vieja de DigitalOcean (muerta).
- **La copia de datos más importante está en el navegador de la PC de la dueña de Ganesha** (localStorage, claves `ganesha_*`). Todavía no se confirmó que se haya subido toda al servidor.
- El conector de Vercel de las sesiones de Claude está en **otra cuenta** (`gym-ar-pro`): no se puede tocar el proyecto Ganesha por MCP. Todo lo de Vercel lo hace el técnico con clicks (guiarlo con capturas).

## 5. Cambios a hacer en el código (en orden)

### 5.1 Apagado por instalación (hacer PRIMERO)
Hoy `src/proxy.ts` apaga todo sin condición, y como el código es compartido **apagaría también LON**.
Cambiarlo a: **apagado salvo que la instalación tenga `WEB_ENCENDIDA=si`**.
- Ganesha no tiene esa variable → sigue apagada (no se prende por accidente al publicar).
- LON se crea con `WEB_ENCENDIDA=si`.
- Para prender Ganesha: el técnico agrega `WEB_ENCENDIDA=si` en su proyecto de Vercel y redespliega (lo puede hacer solo).

### 5.2 Marca en un solo lugar
Crear `src/config/marca.ts` con un objeto por marca (`ganesha`, `lon`) elegido por `NEXT_PUBLIC_MARCA` (sin valor = `ganesha`, así Ganesha queda idéntica):
`nombre`, `nombreCorto`, `bajada`, `colores` (principal, fondo, etc.), `logo`, `whatsapp`, `direccion`, `instagram`, `palabraClientes`.

Archivos que hoy tienen "Ganesha" visible (reemplazar por `marca.*`):
- `src/app/layout.tsx` (3), `src/app/page.tsx` (2), `src/app/loading.tsx`
- `src/app/admin/layout.tsx`
- `src/components/CargandoServidor.tsx`, `src/components/Drawer/DrawerMain.tsx`, `src/components/MainContent/Header.tsx`
- `src/app/admin/panel-control/caja/utils/reporteGenerator.ts` (2)
- `src/app/admin/panel-control/contactos/page.tsx` (4)
- `src/app/admin/panel-control/copia/page.tsx` (6), `src/lib/backupCompleto.ts` (2)
- `src/app/api/admin/importar/route.ts`, `src/lib/auth.ts`, `src/types/index.ts`

Logo e íconos (6 lugares):
- `public/icon-192.svg`, `public/icon-512.svg`, `public/manifest.json`
- `src/app/icon.tsx`, `src/app/apple-icon.tsx`
- `src/app/api/icon-192/route.tsx`, `src/app/api/icon-512/route.tsx`
- El `manifest.json` debería pasar a ser dinámico (`src/app/manifest.ts`) para que cada instalación tenga su nombre e ícono al "instalar" la app en el celular.

Colores: `src/config/designTokens.ts` y clases de Tailwind sueltas.

### 5.3 Lo que NO hay que cambiar
- **NO renombrar las claves `ganesha_*` de localStorage.** Cada dirección web tiene su propio almacenamiento, así que no se mezclan. Si se renombran, la copia de la PC de la dueña de Ganesha deja de verse.
- **NO cambiar** el marcador de archivos de copia `app: 'ganesha-comando-central'` (`copia/page.tsx`, `backupCompleto.ts`): reconoce los archivos de copia ya descargados. Sí **agregar un campo `marca`** a los archivos nuevos y que la importación rechace un archivo de otra marca, para que no se pueda subir por error un backup de Ganesha a LON.
- `normalizarCelularAR` (`src/lib/combinarTurnos.ts`) asume código de área 11: está bien para Don Torcuato.
- `vercel.json` trae el cron diario a `/api/health` (mantiene despierta la base gratis de Supabase): dejarlo.

### 5.4 Datos iniciales de LON
- Base vacía. Crear tablas: `POST /api/admin/instalar` (usa `src/lib/schema.ts`). Verificar que la app nueva lo haga sola o con un botón visible.
- Catálogo por defecto: hoy los servicios/promos de Ganesha están en `src/app/admin/panel-control/_shared/catalogoPromos.ts` y `precios/page.tsx`. **LON no debe arrancar con los precios de Ganesha**: catálogo por marca o vacío.
- Gastos fijos por defecto (`caja/hooks/useGastosFijos.ts`): revisar que no traiga los de Ganesha.

### 5.5 Variables de entorno del proyecto LON en Vercel
- `DATABASE_URL` = URL del Supabase nuevo (Transaction pooler, puerto 6543, con la contraseña real sin corchetes).
- `NEXT_PUBLIC_MARCA=lon`
- `WEB_ENCENDIDA=si`
- No poner `POSTGRES_URL`. No hace falta `PANEL_PIN` (el candado está sacado).
- El webhook a n8n (`src/app/api/webhook/route.ts`, usa `ALLOWED_ORIGINS`) es del bot de WhatsApp de Ganesha en DigitalOcean: no configurarlo en LON.

## 6. Pasos del técnico (guiarlo con capturas)
1. **GitHub**: nada. No se crea repo nuevo ni se usa "template".
2. **Supabase**: crear proyecto nuevo (plan gratis permite 2 proyectos activos: Ganesha + LON). Guardar la contraseña. Copiar la URL de *Connect → Transaction pooler*.
3. **Vercel**, cuando el código ya tenga la marca y el apagado por instalación (5.1 y 5.2): *Add New → Project* → importar `elfernamanu/ganesha-comando-central` (el mismo repo) → nombre `lon-clinic` → cargar las variables del punto 5.5 → *Deploy*.
4. Abrir la dirección nueva, revisar `/api/health` (tiene que decir conectado) y probar.

A tener en cuenta: el plan gratis de Vercel (Hobby) es para uso personal no comercial. Con dos negocios funcionando conviene pasar a Pro más adelante.

## 7. Diseño nuevo
Se diseñó una app nueva (más profesional) para Ganesha, que también sirve de base para LON cambiando colores y logo:
- Vista previa interactiva con datos de ejemplo: `docs/diseno/vista-previa-app-nueva.html` (abrir en el navegador; barra abajo en celular, menú al costado en PC).
- Lienzo de diseño publicado: https://claude.ai/artifact/HB8tgYW9jg2AuAdSX5vd9v
- Mapa de funciones y datos (qué va dónde): https://claude.ai/artifact/AWcvfHmYzeNeKrsSEAeRMs
- Estilo: fuente Figtree; Ganesha ciruela `#6B2D5C`, fondo `#F5F4F7`; estados ok `#1F7A4D`, aviso `#9A5B00`, error `#B4232C`; barra Hoy / Agenda / Clientas / Caja / Más.
- El técnico todavía no la aprobó del todo. Recomendado: primero dejar LON andando con la app actual y su marca (5.1–5.4), y después preguntarle si quiere el diseño nuevo con los colores de LON.

## 8. Cómo compilar y probar
- `npm run build` local falla porque `src/app/icon.tsx` y `apple-icon.tsx` bajan una fuente de jsdelivr (bloqueado en el contenedor). Moverlos fuera temporalmente para compilar y volverlos a poner. Después de `npm install`, revertir `package-lock.json` con `git checkout`.
- Pruebas de punta a punta usadas (Playwright, datos de ejemplo): `docs/pruebas/*.mjs`. Tienen rutas y puertos fijos de la sesión anterior; ajustarlas antes de usar. Postgres 16 local para simular la base.
- No usar `pkill -f "next start"` (mata la propia terminal): usar `ps`/`awk`/`kill`.
- Probar siempre que **Ganesha siga idéntica** (sin `NEXT_PUBLIC_MARCA`) y siga apagada (sin `WEB_ENCENDIDA`), y que LON no muestre ningún "Ganesha" ni precios de Ganesha.

## 9. Pendientes de Ganesha (no perderlos)
- Confirmar que la PC de la dueña subió su copia y descargar los 4 archivos de backup (`/admin/panel-control/copia`).
- Riesgos conocidos: `/api/admin/fix` (GET pisa la configuración, conviene sacarlo); borrar fechas viejas (`DELETE antes_de`) sin backup previo; el botón "Recuperar backup" manda `?restaurar=turnos` en vez de `tabla=`; solo se guardan 5 versiones de backup.
- WhatsApp a futuro: plataforma oficial de Meta con número nuevo, nunca herramientas no oficiales de envío masivo.
- Planes publicados: https://claude.ai/artifact/Do9ScNxNd5qnmUKrc5nBq2 (plan general) y https://claude.ai/artifact/Am1Su4WsbaPagEmppoSL2Y (WhatsApp).

## 10. Forma de trabajo profesional con GitHub (gratis)
Con dos estéticas en el mismo código, publicar directo en `main` es riesgoso: un error llega a las dos al instante. Herramientas gratis a usar, en este orden:
1. **Ramas + Pull Request + vista previa de Vercel**: cada cambio se hace en una rama; Vercel arma un link de prueba solo para esa rama; el técnico lo prueba y recién ahí se une a `main` y se publica en todas las estéticas.
2. **GitHub Actions** (plan gratis: 2.000 minutos por mes en repos privados):
   - Control automático en cada cambio: que compile (`npm run build`) y pasen las pruebas antes de unir a `main`.
   - **Backup diario de cada base** (Ganesha y LON) guardado en privado (artefactos de Actions, hasta 90 días). La `DATABASE_URL` de cada una va como *secret* del repo. Cubre el pendiente "backup diario fuera del sistema".
3. **Issues + Projects**: tablero de pedidos y errores por estética (etiquetas `ganesha`, `lon`).
4. **Releases** (versiones v1.0, v1.1…): saber qué cambió en cada publicación. Para volver atrás rápido, Vercel tiene *Instant Rollback*.
5. **Dependabot**: avisos de seguridad de las librerías.
6. Más adelante: **organización gratis de GitHub** con el nombre del producto, para que el repo no dependa de la cuenta personal. Mover el repo obliga a reconectar Vercel: no hacerlo mientras haya estéticas trabajando sin avisar.

No hace falta: el "Programa para desarrolladores de GitHub" (es para quien hace integraciones con GitHub), Copilot (se trabaja con Claude), protección de ramas en repo privado (es de pago, GitHub Pro).

Límites a tener en cuenta:
- Supabase gratis: 2 proyectos activos. Una **tercera estética** necesita Supabase pago o pasar a **una sola base con los datos separados por estética** (cambio grande, planificarlo).
- Vercel Hobby es para uso no comercial; con varias estéticas cobrando conviene Vercel Pro.
