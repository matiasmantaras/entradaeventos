# 🔄 ACTUALIZACIÓN CRÍTICA: Sistema de QR con URL

## 📅 Fecha de cambio
Abril 28, 2026

## ⚠️ CAMBIOS IMPORTANTES

### 🐛 Bug Crítico Corregido
**Problema anterior:** El sistema tenía una inconsistencia que hacía que la validación NO funcionara:
- El QR contenía JSON con la clave `"id"`
- Pero el servidor buscaba `"ticketId"` 
- Resultado: **Ningún ticket podía validarse** ❌

**Solución:** Cambiado a sistema de URL único.

---

## 🆕 Nuevo Sistema de QR

### Antes (JSON - NO FUNCIONABA)
```json
{"id":"abc-123","nombre":"Juan Perez","dni":"12345678","cantidad":2}
```

### Ahora (URL - FUNCIONA ✅)
```
https://tudominio.com/entrada/abc-123-def-456-ghi-789
```

---

## ✨ Ventajas del Nuevo Sistema

1. **Mejor experiencia de usuario:**
   - Al escanear con la cámara → abre página bonita
   - Muestra: nombre, DNI, cantidad, estado
   - Diseño profesional y moderno

2. **Más fácil de validar:**
   - Staff puede pegar URL completa o solo el ID
   - Ambos formatos funcionan
   - Menos errores de validación

3. **Compartible:**
   - La URL se puede compartir por WhatsApp
   - Los clientes pueden ver su entrada cuando quieran
   - Funciona como "Ver mi entrada"

4. **Más seguro:**
   - Validación por ID único
   - Menos datos expuestos en el QR
   - Estado actualizado en tiempo real

---

## 📋 Archivos Modificados

### Nuevos archivos:
- ✅ `public/ver-entrada.html` - Página pública para ver entradas
- ✅ `test-qr-url.js` - Script de prueba del nuevo sistema
- ✅ `CAMBIOS_QR.md` - Este archivo

### Archivos actualizados:
- ✅ `server.js` - Endpoints y generación de QR
- ✅ `public/validar.html` - Acepta URLs o IDs
- ✅ `README.md` - Documentación actualizada

---

## 🚀 Nuevos Endpoints

### GET `/entrada/:id`
**Público - Sin autenticación**
- Muestra página bonita con información del ticket
- Al escanear QR, se abre esta página
- Funciona en cualquier dispositivo

### GET `/api/entrada/:id`
**Público - API REST**
- Devuelve datos del ticket en JSON
- Incluye QR generado como base64
- Usado por `/entrada/:id` para cargar datos

**Ejemplo de respuesta:**
```json
{
  "success": true,
  "ticket": {
    "id": "abc-123",
    "nombre": "Juan Perez",
    "dni": "12345678",
    "cantidad": 2,
    "tipoEntrada": "individual",
    "precioTotal": 38500,
    "estado": "confirmado",
    "usado": false,
    "qrCode": "data:image/png;base64,..."
  }
}
```

### POST `/validate-ticket` (ACTUALIZADO)
**Requiere autenticación**
- Ahora acepta URL completa o ID directo
- Extrae el ID automáticamente
- Valida y marca como usado

**Ejemplo de uso:**
```javascript
// Ambos formatos funcionan:
{ "ticketData": "https://tudominio.com/entrada/abc-123" }
{ "ticketData": "abc-123" }
```

---

## ⚠️ IMPORTANTE: Tickets Existentes

### Problema
Los tickets que ya fueron vendidos **tienen QR con formato antiguo (JSON)** y pueden no funcionar correctamente debido al bug.

### Soluciones

#### Opción 1: Re-enviar emails (RECOMENDADA)
```bash
# Crear script para regenerar y reenviar
node regenerar-qr-tickets.js
```

#### Opción 2: Validación manual
En el evento, el staff puede:
1. Ver el JSON del QR viejo
2. Copiar solo el ID
3. Pegarlo en `/validar`
4. Validar normalmente

#### Opción 3: Mantener compatibilidad (temporal)
Si necesitas compatibilidad temporal, podés agregar este código en `server.js`:

```javascript
// En /validate-ticket, después de extraer ticketId:
if (!ticketId && ticketData.startsWith('{')) {
    // Intentar parsear JSON viejo
    try {
        const oldData = JSON.parse(ticketData);
        ticketId = oldData.id; // El viejo usaba "id"
    } catch (e) {
        // No es JSON válido
    }
}
```

---

## 🧪 Cómo Probar

### 1. Probar generación de QR:
```bash
node test-qr-url.js
```

### 2. Probar en navegador:
```bash
npm start
# Abrir: http://localhost:3000/entrada/test-123
# (Mostrará error porque no existe, pero verás el diseño)
```

### 3. Probar compra completa:
1. Ir a `/` 
2. Comprar entrada de prueba (modo test de MP)
3. Verificar email recibido
4. Escanear QR → debe abrir `/entrada/:id`
5. Ir a `/validar` y pegar la URL
6. Debe validar correctamente

---

## 📊 Flujo Completo

```
Usuario compra entrada
      ↓
Sistema genera QR con URL: /entrada/abc-123
      ↓
Envía email con QR
      ↓
Usuario escanea QR con celular
      ↓
Se abre página bonita mostrando entrada
      ↓
En el evento, muestra QR al staff
      ↓
Staff escanea y pega URL en /validar
      ↓
Sistema valida y marca como usado
      ↓
Feedback visual: ✅ Entrada válida
      ↓
Usuario ingresa al evento
```

---

## 🔒 Seguridad

### Datos públicos en `/entrada/:id`:
- ✅ Nombre, DNI, cantidad (necesarios para validación)
- ✅ Estado de la entrada (usado/no usado)
- ✅ Total pagado (ya es público en el ticket)

### Datos privados (NO expuestos):
- ❌ Email
- ❌ Teléfono
- ❌ Payment ID de Mercado Pago
- ❌ Datos bancarios

### Protección:
- IDs UUID (imposibles de adivinar)
- Solo datos necesarios expuestos
- Validación requiere acceso a `/validar`

---

## 🐛 Debugging

### Si el QR no funciona:
1. Verificar que `BASE_URL` esté configurado en `.env`
2. Verificar que el servidor esté corriendo
3. Revisar logs del servidor: `console.log`
4. Probar manualmente: `/api/entrada/[ID-DEL-TICKET]`

### Si la validación falla:
1. Verificar que el ticket exista en la BD
2. Verificar que el ID sea correcto (UUID válido)
3. Revisar estado del ticket (debe ser "pagado" o "confirmado")
4. Verificar que no esté ya usado

---

## 📞 Soporte

Si hay problemas:
1. Revisar logs del servidor
2. Verificar `.env` esté configurado
3. Probar con `test-qr-url.js`
4. Verificar que la base de datos esté accesible

---

## ✅ Checklist de Despliegue

Antes de hacer deploy a producción:

- [ ] Actualizar `BASE_URL` en `.env` con dominio real
- [ ] Probar generación de QR en local
- [ ] Probar validación en `/validar`
- [ ] Verificar que `/entrada/:id` se vea bien en móvil
- [ ] Hacer push a GitHub
- [ ] Deploy a Vercel
- [ ] Probar compra completa en producción (modo test)
- [ ] Verificar email con QR
- [ ] Escanear QR con celular
- [ ] Validar entrada en `/validar`
- [ ] ✅ Todo funciona → Activar modo producción

---

## 🎉 Resultado Final

Los clientes ahora recibirán un QR profesional que:
- Se ve bien al escanearlo
- Es fácil de usar
- Funciona en todos los dispositivos
- Permite validación rápida en el evento
- Reduce errores y confusión

¡Sistema listo para EKKLESIA 2026! 🎊
