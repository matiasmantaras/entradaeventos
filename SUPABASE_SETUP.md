# 🗄️ GUÍA: MIGRACIÓN A SUPABASE (PostgreSQL)

## ¿POR QUÉ SUPABASE?

- ✅ **Vercel compatible** (SQLite NO funciona en Vercel)
- ✅ **PostgreSQL** (más robusto y escalable)
- ✅ **Gratis** hasta 500MB + 2GB transferencia
- ✅ **Backups automáticos** cada 24hs
- ✅ **Dashboard visual** para ver tus datos
- ✅ **No se resetea** en cada deploy

---

## 📋 PASO A PASO

### PASO 1: CREAR PROYECTO EN SUPABASE (5 MIN)

1. **Ir a:** https://supabase.com/
2. Click **"Start your project"**
3. **Registrarse** con GitHub (más rápido)
4. Click **"New Organization"**
   - Name: `Tu Nombre` o `Tu Equipo`
5. Click **"New Project"**

**Configuración del proyecto:**
- **Name:** `ekklesia-entradas`
- **Database Password:** **⚠️ GUARDÁ BIEN ESTA CONTRASEÑA**
  - Sugerencia: usar generador → 16+ caracteres
  - Ejemplo: `Ek2026_Db$Pass!Strong`
- **Region:** South America (São Paulo) o US East (Ohio)
- **Plan:** Free (500MB gratis)

6. Click **"Create new project"**
7. **Esperar 2-3 minutos** mientras crea la base de datos

---

### PASO 2: OBTENER URL DE CONEXIÓN

1. En tu proyecto de Supabase, ir al menú lateral:
   - **Settings** (⚙️)
   - **Database**

2. Scroll hasta **"Connection String"**

3. Buscar la pestaña **"URI"**

4. Copiar la URL completa que se ve así:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
   ```

5. ⚠️ **IMPORTANTE:** Reemplazar `[YOUR-PASSWORD]` con la contraseña que usaste al crear el proyecto

   **Ejemplo:**
   ```
   postgresql://postgres:Ek2026_Db$Pass!Strong@db.ajshdjkasd.supabase.co:5432/postgres
   ```

---

### PASO 3: CONFIGURAR EN TU PROYECTO

1. **Abrir tu archivo `.env`**

2. **Agregar la línea:**
   ```env
   DATABASE_URL=postgresql://postgres:TU-PASSWORD@db.xxxxx.supabase.co:5432/postgres
   ```

3. **Guardar el archivo**

**Tu `.env` debería verse así:**
```env
PORT=3000
DATABASE_URL=postgresql://postgres:Ek2026_Db$Pass!Strong@db.ajshdjkasd.supabase.co:5432/postgres
ADMIN_USER=admin
ADMIN_PASS=admin123
SESSION_SECRET=ticketflow-secret-key
MP_ACCESS_TOKEN=TEST-2933626016027318...
EMAIL_USER=matiasmantaras220603@gmail.com
EMAIL_PASS=yhrkehxkjwsvzryb
```

---

### PASO 4: MIGRAR TUS DATOS EXISTENTES (OPCIONAL)

⚠️ **Solo necesario si tenés tickets/datos en SQLite que querés conservar**

Si es un proyecto nuevo o no te importa perder los datos de prueba, podés saltar este paso.

**Para migrar:**

```powershell
node migrate-to-postgres.js
```

**Esto va a:**
- ✅ Leer todos los tickets de SQLite
- ✅ Copiarlos a PostgreSQL (Supabase)
- ✅ Mantener el estado (pagado/pendiente)
- ✅ Preservar stock restante

---

### PASO 5: ACTUALIZAR TU CÓDIGO

**Necesitás cambiar 1 línea en server.js:**

**Buscar (línea ~1):**
```javascript
const { initDatabase, ticketDB, configDB } = require('./database.js');
```

**Reemplazar por:**
```javascript
const { initDatabase, ticketDB, configDB } = require('./database-postgres.js');
```

---

### PASO 6: PROBAR CONEXIÓN

```powershell
# Detener servidor actual
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Iniciar con PostgreSQL
node server.js
```

**Deberías ver:**
```
🔄 Inicializando base de datos PostgreSQL...
✅ Configuración inicial creada: 500 entradas, $25.000 c/u
✅ Base de datos PostgreSQL lista
🚀 Servidor escuchando en http://localhost:3000
```

---

### PASO 7: VERIFICAR EN SUPABASE DASHBOARD

1. En Supabase, ir al menú lateral → **Table Editor**

2. Deberías ver 2 tablas:
   - `config` (con 1 fila de configuración)
   - `tickets` (con tus tickets si migraste)

3. Podés **ver, editar y buscar** tickets desde aquí

---

## 🎯 VENTAJAS DE POSTGRESQL VS SQLITE

| Característica | SQLite | PostgreSQL (Supabase) |
|----------------|--------|----------------------|
| **Vercel** | ❌ No compatible | ✅ Compatible |
| **Backups** | ❌ Manual | ✅ Automáticos |
| **Escalabilidad** | ❌ Limitada | ✅ Hasta 500MB gratis |
| **Dashboard** | ❌ No | ✅ Sí (visual) |
| **Concurrencia** | ❌ Limitada | ✅ Excelente |
| **Deploy** | ❌ Se resetea | ✅ Persiste |

---

## 🔐 SEGURIDAD

**⚠️ NUNCA COMPARTAS:**
- La contraseña de Supabase
- La URL de conexión completa (contiene la password)
- Agregá `DATABASE_URL` a tu `.gitignore`

**El archivo `.env` ya está en .gitignore**, así que no se subirá a GitHub.

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### Error: "password authentication failed"
- ✅ Verificá que la password en DATABASE_URL sea correcta
- ✅ Asegurate de haber reemplazado `[YOUR-PASSWORD]`

### Error: "ENOTFOUND"
- ✅ Verificá que copiaste la URL completa
- ✅ Chequeá tu conexión a internet

### Error: "self signed certificate"
- ✅ Ya está configurado `ssl: { rejectUnauthorized: false }`
- ✅ Si persiste, contactá soporte de Supabase

### No veo mis datos en Supabase
- ✅ Ejecutá `node migrate-to-postgres.js` para migrar
- ✅ Verificá que server.js use `database-postgres.js`

---

## 🚀 PRÓXIMO PASO: DEPLOY A VERCEL

Una vez que todo funcione con PostgreSQL:

1. **Subir código a GitHub**
   ```powershell
   git add .
   git commit -m "Migrado a PostgreSQL/Supabase"
   git push
   ```

2. **Deployar en Vercel:**
   - Conectar repositorio
   - Agregar `DATABASE_URL` en variables de entorno
   - Deploy automático ✅

---

## 📊 MONITOREO

**Dashboard de Supabase te da:**
- 📈 Uso de base de datos (MB)
- 🔢 Cantidad de filas por tabla
- 📊 Consultas por día
- ⚡ Performance

**Ver en:** Supabase → Reports

---

**¿Listo para migrar?** Seguí los pasos en orden y avisame si tenés algún error. 🚀
