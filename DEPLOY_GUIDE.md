# 🚀 GUÍA DE DEPLOY A PRODUCCIÓN - RENDER.COM

## ✅ LO QUE TENÉS FUNCIONANDO AHORA

Sistema completo de venta de entradas con:
- ✅ Mercado Pago integrado (pago único, sin cuotas)
- ✅ Base de datos SQLite persistente
- ✅ Panel de administración con autenticación
- ✅ Envío de QR por email (Gmail SMTP)
- ✅ Control de stock automático
- ✅ Exportación CSV
- ✅ Validación de tickets con QR
- ✅ Seguridad (rate limiting, helmet, validación)

---

## 📋 PASOS PARA DEPLOY EN RENDER.COM (15 MINUTOS)

### PASO 1: PREPARAR GITHUB

1. **Crear cuenta en GitHub** (si no tenés):
   - Ir a: https://github.com/signup
   - Usar tu email: matiasmantaras220603@gmail.com

2. **Crear nuevo repositorio:**
   - Ir a: https://github.com/new
   - Nombre: `entradas-ekklesia-2026`
   - Público o Privado (recomiendo Privado)
   - NO inicializar con README
   - Click "Create repository"

3. **Subir código desde tu PC:**
   ```powershell
   cd C:\Users\Pelado\Desktop\entradaeventos
   
   git init
   git add .
   git commit -m "Sistema de entradas completo"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/entradas-ekklesia-2026.git
   git push -u origin main
   ```

---

### PASO 2: CREAR CUENTA EN RENDER

1. Ir a: https://render.com/
2. Click "Get Started"
3. **Registrarse con GitHub** (más fácil)
4. Autorizar Render para acceder a tus repos

---

### PASO 3: CREAR WEB SERVICE EN RENDER

1. En dashboard de Render, click "New +"
2. Seleccionar "Web Service"
3. Conectar tu repositorio `entradas-ekklesia-2026`
4. Click "Connect"

**Configuración del servicio:**

| Campo | Valor |
|-------|-------|
| **Name** | `entradas-ekklesia-2026` |
| **Region** | Oregon (US West) |
| **Branch** | `main` |
| **Root Directory** | (dejar vacío) |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` |

5. Click "Advanced" y agregar **Environment Variables**:

```
PORT=3000
ADMIN_USER=admin
ADMIN_PASS=TU-PASSWORD-SEGURA-AQUI
SESSION_SECRET=clave-super-secreta-aleatoria-123456
MP_ACCESS_TOKEN=TU-TOKEN-DE-MERCADO-PAGO-PRODUCCION
EMAIL_USER=matiasmantaras220603@gmail.com
EMAIL_PASS=yhrkehxkjwsvzryb
```

6. Click "Create Web Service"

---

### PASO 4: ESPERAR EL DEPLOY (5-10 MIN)

Render va a:
- ✅ Clonar tu código
- ✅ Instalar dependencias (`npm install`)
- ✅ Iniciar el servidor (`npm start`)
- ✅ Asignarte una URL pública: `https://entradas-ekklesia-2026.onrender.com`

**Logs en vivo:** Podés ver el progreso en la ventana de logs

---

### PASO 5: CONFIGURAR WEBHOOK EN MERCADO PAGO

**Una vez que el deploy esté listo:**

1. Copiar tu URL de Render (ejemplo): `https://entradas-ekklesia-2026.onrender.com`

2. Ir al panel de Mercado Pago:
   - https://www.mercadopago.com.ar/developers/panel/app

3. Seleccionar tu aplicación

4. Ir a **"Webhooks"** en el menú lateral

5. Click **"Configurar notificaciones"**

6. Configurar:
   ```
   URL de producción: https://TU-APP.onrender.com/webhook
   Eventos: payment.created, payment.updated
   ```

7. Click **"Guardar"**

8. **Probar webhook:**
   - Mercado Pago te permite enviar un webhook de prueba
   - Verificá que llegue a tu servidor (mirá los logs en Render)

---

### PASO 6: CAMBIAR A CREDENCIALES DE PRODUCCIÓN

**IMPORTANTE:** Cambiar de TEST a PROD

1. En Mercado Pago:
   - Ir a: https://www.mercadopago.com.ar/developers/panel/credentials
   - **Cambiar a modo PRODUCCIÓN** (arriba a la derecha)
   - Copiar **Access Token de Producción**

2. En Render:
   - Ir a tu Web Service
   - Environment → Edit
   - Cambiar `MP_ACCESS_TOKEN` al token de producción
   - Click "Save Changes"
   - El servicio se reiniciará automáticamente

---

### PASO 7: PROBAR SISTEMA COMPLETO

1. **Abrir tu sitio:**
   ```
   https://TU-APP.onrender.com
   ```

2. **Hacer compra de prueba:**
   - Llenar formulario
   - Usar tarjeta REAL (ya estás en producción)
   - Completar pago

3. **Verificar:**
   - ✅ Email con QR llegó automáticamente
   - ✅ Ticket aparece en panel admin como "PAGADO"
   - ✅ Stock se descontó

4. **Panel admin:**
   ```
   https://TU-APP.onrender.com/admin
   Usuario: admin (o el que configuraste)
   Password: tu-password-segura
   ```

---

## 🔐 SEGURIDAD POST-DEPLOY

**IMPORTANTE - Cambiar estas variables:**

```env
ADMIN_USER=un-usuario-seguro-que-nadie-adivine
ADMIN_PASS=Contraseña-Fuerte-Con-Números-Y-Símbolos-2026!
SESSION_SECRET=clave-aleatoria-muy-larga-y-compleja-abc123xyz789
```

**Recomendaciones:**
- Admin user sin palabras comunes
- Password con mínimo 12 caracteres
- Session secret de 32+ caracteres aleatorios

---

## 📊 MONITOREO

**Render te da gratis:**
- ✅ Logs en tiempo real
- ✅ Reinicio automático si falla
- ✅ HTTPS automático (certificado SSL)
- ✅ 750 horas/mes gratis

**Ver logs:**
- Dashboard de Render → Tu servicio → Logs

---

## 🔄 ACTUALIZAR CÓDIGO

Cada vez que hagas cambios:

```powershell
git add .
git commit -m "Descripción del cambio"
git push
```

**Render detecta el push y redeploya automáticamente** (2-3 minutos)

---

## ⚠️ LIMITACIONES PLAN GRATUITO

- **Servicios se duermen después de 15 min de inactividad**
  - Primera visita después de inactividad tarda 30-60 segundos
  - Solución: Plan Starter ($7/mes) para mantenerlo activo 24/7

- **Base de datos SQLite se resetea en cada deploy**
  - ⚠️ Para producción REAL con muchos tickets, considerar PostgreSQL
  - Render ofrece PostgreSQL gratis hasta 1GB

---

## 🎯 SIGUIENTE PASO

**¿Ya tenés cuenta GitHub?**
- SÍ → Ejecutá los comandos del PASO 1
- NO → Creá cuenta primero en https://github.com/signup

**Avisame cuando termines el PASO 1 y te ayudo con el resto.**

---

## 🆘 SOPORTE

Si algo falla:
- Logs de Render: Dashboard → Tu servicio → Logs
- Errores comunes: Variables de entorno mal configuradas
- Webhook: Verificar URL exacta en Mercado Pago

---

**¿Listo para empezar?** 🚀
