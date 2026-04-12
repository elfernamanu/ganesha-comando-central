# 📦 BACKUP - Estructura Ganesha Esthetic

**Fecha:** 12 Abril 2026  
**Estado:** Backup limpio antes de integración con n8n

---

## 📂 ESTRUCTURA ACTUAL (LIMPIA)

```
PROYECTOPRINCESA/
├── src/
│   ├── app/
│   │   ├── layout.tsx          ✅ Provider global + metadata
│   │   └── page.tsx            ✅ Página principal (vacía)
│   ├── components/
│   │   ├── Controls/
│   │   │   └── ThemeZoomControls.tsx ✅
│   │   ├── Drawer/
│   │   │   └── DrawerMain.tsx ✅
│   │   └── MainContent/
│   │       ├── Header.tsx ✅
│   │       ├── ServiceBox.tsx ✅
│   │       └── ShiftsGrid.tsx ✅
│   ├── context/
│   │   └── AccessibilityCtx.tsx ✅ Context API
│   ├── config/
│   │   └── designTokens.ts ✅ Tokens de diseño
│   └── styles/
│       └── globals.css ✅ Tailwind + custom
├── public/
│   ├── next.svg, vercel.svg (innecesarios)
│   └── (agregar: logo.svg, icons)
├── .git/                       ✅ Git history
├── package.json                ✅ Dependencias
├── tsconfig.json               ✅ TypeScript config
├── next.config.ts              ✅ Next.js config
├── postcss.config.mjs           ✅ Tailwind config
├── CLAUDE.md                   ✅ Instrucciones
├── AGENTS.md                   ✅ Agentes
├── .gitignore                  ✅ Git ignore
└── node_modules/               ✅ (no hace falta copiar)
```

---

## 🔄 INFRAESTRUCTURA (NO en PROYECTOPRINCESA)

| Componente | IP | Ubicación | Estado |
|-----------|-----|-----------|--------|
| Web | Vercel | Nube | ✅ Desplegada |
| n8n | 164.90.194.79:5678 | DigitalOcean | ✅ Funcionando |
| PostgreSQL | 209.38.111.153 | DigitalOcean | ✅ Funcionando |

---

## 📋 PLAN PASO A PASO

### FASE 1: CONECTAR WEB CON n8n (AHORA)
- [ ] Crear `/src/app/api/webhook/route.ts` (Backend proxy)
- [ ] Agregar variables Vercel
- [ ] Crear función `sendToN8n()` en componentes
- [ ] Testear conexión

### FASE 2: INTEGRAR DATOS REALES (DESPUÉS)
- [ ] Conectar ShiftsGrid con datos de n8n
- [ ] Agregar formulario para crear turnos
- [ ] Guardar cliente + servicio + fecha
- [ ] Validaciones

### FASE 3: UI/UX (DESPUÉS)
- [ ] Confirmaciones visuales
- [ ] Mensajes de error
- [ ] Loading states
- [ ] Responsive mobile

### FASE 4: AUTENTICACIÓN (FUTURO)
- [ ] Login de usuarios
- [ ] Roles (admin, cliente, estético)
- [ ] Historial de turnos

---

## ✅ ARCHIVOS LISTOS

- ✅ `src/app/layout.tsx` - Wrapper global
- ✅ `src/context/AccessibilityCtx.tsx` - State tema/zoom
- ✅ `src/components/**/*.tsx` - Componentes UI
- ✅ `src/styles/globals.css` - Tailwind

## ❌ ARCHIVOS QUE FALTA CREAR

- ❌ `/src/app/api/webhook/route.ts` - Backend proxy (PRIORIDAD)
- ❌ `/src/lib/api.ts` - Funciones para n8n
- ❌ `/src/types/index.ts` - TypeScript types

---

## 📝 CONFIGURACIÓN NECESARIA

**Variables Vercel (.env.local):**
```
NEXT_PUBLIC_N8N_URL=http://164.90.194.79:5678/webhook/api/v1/bunker-ganesha
N8N_TOKEN=Ganesha_Admin_2026_Secure
N8N_API_KEY=(si es necesario)
```

---

**¿Está claro el plan?**
