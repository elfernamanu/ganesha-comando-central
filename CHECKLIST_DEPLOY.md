# ✅ CHECKLIST PARA DEPLOY PERFECTO

Seguir ANTES de hacer `git push`:

## 1. VERIFICAR ESTRUCTURA
- [ ] Todos los archivos están en `/src/` (no en raíz)
- [ ] No hay archivos duplicados
- [ ] No hay archivos viejos sin usar

## 2. VERIFICAR IMPORTS
- [ ] Los imports usan `@/` correctamente
- [ ] Las rutas de imports apuntan a archivos que existen
- [ ] No hay imports circulares

```bash
# Comando para verificar:
grep -r "import.*from" src/ | grep -v node_modules
```

## 3. VERIFICAR CONFIGURACIÓN
- [ ] `tsconfig.json` tiene `"@/*": ["./src/*"]`
- [ ] `vercel.json` tiene `"use": "@vercel/next"`
- [ ] `package.json` tiene `"build": "next build"`
- [ ] No hay archivos `/api` viejos
- [ ] No hay `server.js` viejo

## 4. VERIFICAR COMPILACIÓN LOCAL
```bash
npm run build
```
- [ ] Compila sin errores
- [ ] No hay warnings de TypeScript
- [ ] Genera carpeta `.next`

## 5. VERIFICAR GIT
```bash
git status
```
- [ ] No hay archivos no tracked
- [ ] No hay merge conflicts
- [ ] Todos los cambios están en staging

## 6. COMMIT MESSAGE
Format: `fix: Descripción` o `feat: Descripción`

Siempre agregar al final:
```
Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

## 7. PUSH Y VERIFICAR VERCEL
```bash
git push origin main
```
- [ ] Esperar a que Vercel compile (3-5 min)
- [ ] Verificar que el build sea "Success" (no rojo)
- [ ] Limpiar cache del navegador: `Ctrl+Shift+R`
- [ ] Verificar que la web funciona

## 8. DOCUMENTAR CAMBIOS
Si fue un cambio importante:
- [ ] Actualizar `INFORME_ARQUITECTURA_REAL.md`
- [ ] Actualizar `INTEGRACION_N8N.md` si aplica

---

## 🚨 ERRORES COMUNES A EVITAR

| Error | Causa | Solución |
|-------|-------|----------|
| Module not found | tsconfig paths incorrecto | Verificar `@/*` → `./src/*` |
| Build command failed | package.json tiene script viejo | Cambiar a `next build` |
| Cannot find module @vercel/node | Archivo viejo de API | Eliminar `/api/` |
| Vercel warning about builds | vercel.json tiene configuración vieja | Simplificar a solo `@vercel/next` |
| Build compila pero web vacía | HTML estático vs Next.js | Verificar `vercel.json` |

---

## 📋 TEMPLATE PARA FUTURO

```bash
# 1. Crear rama
git checkout -b feature/nombre

# 2. Hacer cambios, verificar localmente
npm run build

# 3. Agregar cambios
git add -A

# 4. Commit
git commit -m "feat: Descripción

Detalles si es necesario.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"

# 5. Push
git push origin feature/nombre

# 6. Vercel deploy automático
# Esperar 3-5 minutos

# 7. Limpiar cache y verificar
curl https://ganesha-comando-central.vercel.app/
```

