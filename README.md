# Sistema de Venta de Entradas con Mercado Pago

Sistema completo para vender entradas de eventos con integración de Mercado Pago y generación de códigos QR.

## 🚀 Características

- ✅ Integración completa con Mercado Pago
- ✅ Generación automática de códigos QR
- ✅ Tres tipos de entradas (General, VIP, Premium)
- ✅ Diseño moderno y responsivo
- ✅ Confirmación de pago en tiempo real
- ✅ Descarga e impresión de entradas

## 📋 Requisitos Previos

- Node.js (v14 o superior)
- Cuenta de Mercado Pago
- npm o yarn

## 🔧 Instalación

1. **Clonar o descargar el proyecto**

2. **Instalar dependencias:**
```bash
npm install
```

3. **Configurar Mercado Pago:**

   - Crea una cuenta en [Mercado Pago Developers](https://www.mercadopago.com.ar/developers)
   - Obtén tu Access Token desde el panel de credenciales
   - Copia el archivo `.env.example` a `.env`:
   ```bash
   copy .env.example .env
   ```
   - Edita el archivo `.env` y agrega tu Access Token:
   ```
   MP_ACCESS_TOKEN=tu_access_token_real_aqui
   ```

## 🎯 Uso

1. **Iniciar el servidor:**
```bash
npm start
```

O en modo desarrollo con auto-reload:
```bash
npm run dev
```

2. **Abrir en el navegador:**
```
http://localhost:3000
```

3. **Flujo de compra:**
   - El usuario completa el formulario con sus datos
   - Selecciona el tipo de entrada y cantidad
   - Es redirigido a Mercado Pago para completar el pago
   - Después del pago exitoso, se genera automáticamente un código QR
   - El usuario puede descargar o imprimir su entrada

## 🏗️ Estructura del Proyecto

```
entradaeventos/
├── server.js              # Servidor Express y lógica backend
├── package.json           # Dependencias del proyecto
├── .env                   # Variables de entorno (no incluir en git)
├── .env.example           # Plantilla de variables de entorno
├── README.md              # Este archivo
└── public/
    ├── index.html         # Página principal de compra
    └── success.html       # Página de confirmación con QR
```

## 💰 Tipos de Entradas

| Tipo | Precio | Descripción |
|------|--------|-------------|
| General | $5.000 | Acceso al evento |
| VIP | $10.000 | Área preferencial + bebida |
| Premium | $15.000 | Meet & greet + merchandising |

## 🔐 Seguridad

- El archivo `.env` contiene información sensible y NO debe subirse a repositorios públicos
- Los Access Tokens de Mercado Pago deben mantenerse privados
- En producción, usa HTTPS y variables de entorno seguras

## 🌐 Despliegue en Producción

Para desplegar en producción:

1. **Configurar las URLs correctas** en `server.js`:
   - Actualiza `back_urls` con tu dominio real
   - Configura `notification_url` con tu URL pública

2. **Variables de entorno:**
   - Configura `MP_ACCESS_TOKEN` en tu servidor
   - Configura `PORT` si es necesario

3. **Usar credenciales de producción:**
   - En el panel de Mercado Pago, cambia de modo Test a Producción
   - Usa el Access Token de producción

## 📱 Funcionalidades del Código QR

El código QR generado contiene:
- ID único del ticket
- Nombre del comprador
- Email
- Tipo de entrada
- Cantidad de entradas
- Fecha de compra

Este QR puede ser escaneado en el evento para validar la entrada.

## 🛠️ Tecnologías Utilizadas

- **Backend:** Node.js + Express
- **Pagos:** Mercado Pago SDK
- **QR:** qrcode (node library)
- **Frontend:** HTML5 + CSS3 + JavaScript vanilla

## 📧 Soporte

Para problemas con Mercado Pago, visita:
- [Documentación oficial](https://www.mercadopago.com.ar/developers/es/docs)
- [Foro de desarrolladores](https://www.mercadopago.com.ar/developers/es/support)

## 📝 Notas Importantes

- En modo test, usa las [tarjetas de prueba de Mercado Pago](https://www.mercadopago.com.ar/developers/es/docs/checkout-api/testing)
- Los webhooks requieren una URL pública (usa ngrok para desarrollo local)
- Los datos de los tickets se almacenan en memoria (implementa una base de datos para producción)

## 🔄 Próximas Mejoras

- [ ] Base de datos persistente (MongoDB, PostgreSQL)
- [ ] Panel de administración
- [ ] Envío de emails automáticos
- [ ] Sistema de validación de QR
- [ ] Estadísticas de ventas
- [ ] Múltiples eventos
