# 🎫 SOLUCIÓN: Entradas Agotadas

## 📋 Diagnóstico del Problema

Las entradas aparecen como "agotadas" cuando el **stock restante** en la base de datos llega a **0**.

Esto puede ocurrir por:
1. ✅ Stock inicial configurado en 0
2. ✅ Todas las entradas fueron vendidas
3. ✅ Error en la base de datos

---

## 🔍 PASO 1: Verificar el Stock Actual

Ejecuta este comando para ver el estado actual del stock:

```bash
node check-stock.js
```

Esto mostrará:
- Stock total configurado
- Stock restante disponible
- Cuántas entradas se han vendido
- Estadísticas de tickets pagados y pendientes

---

## 🔄 PASO 2: Resetear el Stock (si es necesario)

Si el stock está en 0 y necesitas aumentarlo, ejecuta:

```bash
node reset-stock.js
```

Este script te permitirá:
- Ver el stock actual
- Establecer un nuevo stock total
- Establecer cuántas entradas quedan disponibles
- Confirmar los cambios antes de aplicarlos

### Ejemplo de uso:

```
¿A cuánto quieres establecer el stock total? (actual: 500): 1000
¿A cuánto quieres establecer el stock restante? (actual: 0): 1000
```

Esto establecerá 1000 entradas totales con 1000 disponibles.

---

## ⚡ PASO 3: Reiniciar el Servidor

Después de actualizar el stock, reinicia el servidor:

1. Detén el servidor actual (Ctrl+C)
2. Inicia nuevamente:
   ```bash
   node server.js
   ```

---

## 🎯 Solución Rápida (Un Solo Comando)

Si quieres verificar Y resetear todo de una vez:

```bash
# 1. Verificar stock
node check-stock.js

# 2. Si necesitas resetearlo
node reset-stock.js

# 3. Reiniciar servidor
node server.js
```

---

## 📊 Comandos Útiles

### Ver todos los tickets en la base de datos:
```bash
node list-tickets.js
```

### Ver stock sin interacción:
```bash
node check-stock.js
```

### Resetear stock de forma interactiva:
```bash
node reset-stock.js
```

---

## 🔧 Configuración Recomendada

Para un evento típico:

- **Stock Total**: 500-1000 entradas
- **Stock Restante**: Igual al total al inicio
- **Precio General**: $25.000
- **Cargo por servicio**: 10%

---

## ⚠️ Notas Importantes

1. **El stock se reduce automáticamente** cuando un pago es confirmado
2. **Los tickets pendientes NO reducen el stock** hasta que se confirme el pago
3. **Puedes aumentar el stock en cualquier momento** usando `reset-stock.js`
4. **Reinicia el servidor** después de cambiar la configuración

---

## 🆘 Problemas Comunes

### "No se encontró configuración"
→ Ejecuta primero `node server.js` para crear la base de datos

### "Stock restante: 0"
→ Ejecuta `node reset-stock.js` para aumentar el stock

### Los cambios no se reflejan en la web
→ Recarga la página (F5) o limpia caché (Ctrl+Shift+R)

---

## 📞 Contacto

Si los problemas persisten, verifica:
- Que la base de datos `tickets.db` exista
- Que no haya errores en la consola del servidor
- Que el servidor esté corriendo sin errores
