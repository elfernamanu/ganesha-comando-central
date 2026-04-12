# 🔗 INTEGRACIÓN N8N - GUÍA PASO A PASO

**Estado:** Ready for implementation  
**Fecha:** 12 Abril 2026

---

## 📋 CHECKLIST ANTES DE EMPEZAR

- ✅ n8n en 164.90.194.79:5678 - Funcionando
- ✅ PostgreSQL en 209.38.111.153 - Conectado a n8n
- ✅ Web en Vercel - Desplegada
- ✅ Backend proxy creado - `/src/app/api/webhook/route.ts`
- ✅ API client creado - `/src/lib/api.ts`
- ✅ Types creados - `/src/types/index.ts`

---

## 🚀 PASO 1: Configurar Variables Locales

**En la raíz de PROYECTOPRINCESA:**

```bash
cp .env.local.example .env.local
```

**Editar `.env.local`:**
```
N8N_TOKEN=Ganesha_Admin_2026_Secure
N8N_WEBHOOK_URL=http://164.90.194.79:5678/webhook/api/v1/bunker-ganesha
```

**Verificar que funciona:**
```bash
npm run dev
# Debería iniciar en http://localhost:3000
```

---

## 🚀 PASO 2: Testear Backend Proxy Localmente

**Hacer POST a `http://localhost:3000/api/webhook`:**

```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "action": "obtenerTurnos",
    "fecha": "2026-04-12"
  }'
```

**Debería responder:**
```json
{
  "status": "success",
  "bunker_status": "online",
  "last_update": "...",
  "data": [...],
  "count": 0
}
```

---

## 🚀 PASO 3: Crear Hook para Usar API

**Crear `/src/hooks/useN8n.ts`:**

```typescript
import { useState, useCallback } from 'react';
import { obtenerTurnosHoy, crearTurno } from '@/lib/api';
import type { CrearTurnoPayload } from '@/types';

export function useN8n() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTurnosHoy = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await obtenerTurnosHoy();
      return data;
    } catch (err) {
      setError('Error obteniendo turnos');
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const crearNuevoTurno = useCallback(async (payload: CrearTurnoPayload) => {
    setLoading(true);
    setError(null);
    try {
      const data = await crearTurno(payload);
      return data;
    } catch (err) {
      setError('Error creando turno');
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchTurnosHoy, crearNuevoTurno, loading, error };
}
```

---

## 🚀 PASO 4: Integrar en Componentes

**Ejemplo en `ShiftsGrid.tsx`:**

```typescript
'use client';

import { useN8n } from '@/hooks/useN8n';
import { useEffect, useState } from 'react';

export function ShiftsGrid() {
  const { fetchTurnosHoy, loading, error } = useN8n();
  const [turnos, setTurnos] = useState([]);

  useEffect(() => {
    const cargarTurnos = async () => {
      const data = await fetchTurnosHoy();
      if (data?.data) {
        setTurnos(data.data);
      }
    };
    cargarTurnos();
  }, [fetchTurnosHoy]);

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="grid grid-cols-4 gap-4">
      {turnos.map((turno) => (
        <div key={turno.id} className="border p-4">
          {turno.cliente?.nombre} - {turno.servicio?.nombre}
        </div>
      ))}
    </div>
  );
}
```

---

## 🚀 PASO 5: Desplegar a Vercel

**Agregar variables en Vercel Dashboard:**

1. Ve a: https://vercel.com/projects
2. Selecciona: `ganesha-comando-central`
3. Settings → Environment Variables
4. Agrega:
   ```
   N8N_TOKEN=Ganesha_Admin_2026_Secure
   N8N_WEBHOOK_URL=http://164.90.194.79:5678/webhook/api/v1/bunker-ganesha
   ```
5. Redeploy

---

## ✅ ARQUITECTURA FINAL

```
┌─────────────────────────┐
│   Browser (Cliente)      │
│  ganesha-comando...      │
│  - React Components      │
│  - useN8n hook           │
└──────────────┬───────────┘
               │
          fetch /api/webhook
               │
┌──────────────▼────────────┐
│   Vercel (Backend Proxy)  │
│   /src/app/api/webhook/   │
│   - Valida origen         │
│   - Oculta token          │
│   - Redirige a n8n        │
└──────────────┬────────────┘
               │
         HTTP POST
               │
┌──────────────▼──────────────┐
│   n8n (164.90.194.79:5678)  │
│   - Webhook valida token    │
│   - Ejecuta query SQL       │
│   - Retorna datos           │
└──────────────┬──────────────┘
               │
          TCP 5432
               │
┌──────────────▼──────────────┐
│   PostgreSQL (209.38.111...) │
│   - ganesha_db              │
│   - Tablas: turnos, etc.    │
└─────────────────────────────┘
```

---

## 🔐 SEGURIDAD

| Layer | Validación |
|-------|-----------|
| **Browser** | No expone token |
| **Vercel Proxy** | Valida CORS, oculta token |
| **n8n** | Valida header `x-ganesha-token` |
| **PostgreSQL** | pg_hba.conf + autenticación |

---

## 📝 COMANDOS ÚTILES

```bash
# Dev local
npm run dev

# Build
npm run build

# Ver logs locales
npm run dev -- --verbose

# Test API desde terminal
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"action":"obtenerTurnos"}'
```

---

## ⚠️ TROUBLESHOOTING

| Problema | Solución |
|----------|----------|
| CORS error | Verificar ALLOWED_ORIGINS en route.ts |
| Token no válido | Confirmar N8N_TOKEN en .env.local |
| n8n timeout | Verificar que 164.90.194.79:5678 es accesible |
| No se cargan datos | Verificar PostgreSQL está corriendo |

---

**¿Listo para empezar con PASO 1?**
