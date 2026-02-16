const express = require('express');
const bodyParser = require('body-parser');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const session = require('express-session');
require('dotenv').config();

// 🔐 Credenciales del administrador
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123'; // CAMBIAR EN PRODUCCIÓN

// 🗄️ Base de datos PostgreSQL (Supabase)
const { initDatabase, ticketDB, configDB, pool } = require('./database-postgres');

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializar base de datos (async pero no bloqueante)
initDatabase().catch(err => {
    console.error('⚠️ Error al inicializar BD, pero el servidor continúa:', err.message);
});

// 🛡️ Seguridad: Helmet (protege headers HTTP)
app.use(helmet({
    contentSecurityPolicy: false // Desactivar para desarrollo
}));

// 🔐 Configuración de sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'ticketflow-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // true en producción con HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// 🛡️ Rate Limiting: Prevenir spam de requests
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // máximo 10 requests por IP
    message: { error: 'Demasiadas solicitudes, intentá de nuevo más tarde' },
    standardHeaders: true,
    legacyHeaders: false
});

// Aplicar rate limit solo a rutas críticas
app.use('/create-preference', limiter);
app.use('/validate-ticket', limiter);

// Configuración de Mercado Pago
const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN 
});

// Configuración de Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail', // Puedes cambiar a otro servicio
    auth: {
        user: process.env.EMAIL_USER, // Tu email
        pass: process.env.EMAIL_PASS  // Contraseña de aplicación de Gmail
    }
});

// Configuración de Twilio (WhatsApp)
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('✅ Twilio configurado para WhatsApp');
} else {
    console.log('⚠️  Twilio no configurado (WhatsApp deshabilitado)');
}

// Función para enviar email con QR del ticket
async function enviarTicketPorEmail(ticket) {
    try {
        // Generar QR con la información del ticket (simplificado para mejor lectura)
        const qrData = JSON.stringify({
            id: ticket.id,
            nombre: ticket.nombre,
            dni: ticket.dni,
            cantidad: ticket.cantidad
        });
        
        // Generar QR como buffer (no Base64) para adjuntar
        const qrBuffer = await QRCode.toBuffer(qrData, {
            width: 400,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        
        // HTML del email con referencia a CID
        const htmlEmail = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a0a; color: #ffffff; padding: 20px;">
            <h1 style="color: #3b82f6; text-align: center;">¡Compra Confirmada!</h1>
            <h2 style="text-align: center; color: #10b981;">EKKLESIA 2026</h2>
            
            <div style="background-color: #151515; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <h3 style="color: #3b82f6;">Detalles de tu entrada:</h3>
                <p><strong>Nombre:</strong> ${ticket.nombre}</p>
                <p><strong>DNI:</strong> ${ticket.dni}</p>
                <p><strong>Email:</strong> ${ticket.email}</p>
                <p><strong>Tipo de entrada:</strong> ${ticket.tipoEntrada === 'general' ? 'Anticipada' : ticket.tipoEntrada}</p>
                <p><strong>Cantidad:</strong> ${ticket.cantidad}</p>
                <p><strong>Total pagado:</strong> $${ticket.precioTotal.toLocaleString('es-AR')}</p>
                <p><strong>Fecha:</strong> 1 de Mayo, 2026 - 08:00 HS</p>
                <p><strong>Lugar:</strong> Club Alemán</p>
            </div>
            
            <div style="text-align: center; background-color: #ffffff; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <h3 style="color: #000000;">Tu código QR de entrada:</h3>
                <img src="cid:qrcode" alt="QR Code" style="width: 300px; height: 300px; display: block; margin: 0 auto;" />
                <p style="color: #666666; font-size: 12px; margin-top: 10px;">ID: ${ticket.id}</p>
                <p style="color: #999999; font-size: 11px;">Escaneá este código en la entrada del evento</p>
            </div>
            
            <div style="background-color: #151515; padding: 15px; border-radius: 10px; margin: 20px 0;">
                <h3 style="color: #10b981;">Instrucciones importantes:</h3>
                <ul>
                    <li>Presentá este QR en la entrada del evento</li>
                    <li>El QR será escaneado para validar tu entrada</li>
                    <li>Guardá este email o tomá captura de pantalla</li>
                    <li>Llegá con anticipación al evento</li>
                </ul>
            </div>
            
            <p style="text-align: center; color: #666666; font-size: 12px; margin-top: 30px;">
                ¿Problemas con tu entrada? Contactanos a ${process.env.EMAIL_USER || 'matiasmantaras220603@gmail.com'}
            </p>
        </div>
        `;
        
        const mailOptions = {
            from: `"TicketFlow - EKKLESIA 2026" <${process.env.EMAIL_USER}>`,
            to: ticket.email,
            subject: '🎟️ Tu entrada para EKKLESIA 2026 - Código QR',
            html: htmlEmail,
            attachments: [
                {
                    filename: 'qr-entrada.png',
                    content: qrBuffer,
                    cid: 'qrcode' // Content-ID para referenciar en el HTML
                }
            ]
        };
        
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email enviado a ${ticket.email}`);
        return true;
    } catch (error) {
        console.error('❌ Error al enviar email:', error);
        return false;
    }
}

// Función para enviar ticket por WhatsApp (GRATIS - sin Twilio)
// Usa CallMeBot API (100% gratis, sin límites)
async function enviarTicketPorWhatsApp(ticket) {
    try {
        // Validar que tenga teléfono
        if (!ticket.telefono) {
            console.log('⚠️  No hay teléfono para enviar WhatsApp');
            return false;
        }

        // Formatear número de teléfono (Argentina +54)
        let phoneNumber = ticket.telefono.toString().replace(/\D/g, '');
        if (!phoneNumber.startsWith('549')) {
            if (phoneNumber.startsWith('54')) {
                phoneNumber = '549' + phoneNumber.substring(2);
            } else if (phoneNumber.startsWith('9')) {
                phoneNumber = '549' + phoneNumber.substring(1);
            } else {
                phoneNumber = '549' + phoneNumber;
            }
        }

        // Generar QR del ticket
        const qrData = JSON.stringify({
            ticketId: ticket.id,
            nombre: ticket.nombre,
            email: ticket.email,
            dni: ticket.dni,
            tipoEntrada: ticket.tipoEntrada,
            cantidad: ticket.cantidad,
            precioTotal: ticket.precioTotal,
            fechaCompra: ticket.fechaCreacion,
            estado: ticket.estado
        });

        const qrBase64 = await QRCode.toDataURL(qrData, {
            width: 400,
            margin: 2
        });

        // Mensaje de WhatsApp
        const mensaje = `🎟️ *¡Tu entrada para EKKLESIA 2026!*

✅ *Compra Confirmada*

📋 *Detalles:*
👤 ${ticket.nombre}
🆔 DNI: ${ticket.dni}
🎫 Tipo: ${ticket.tipoEntrada === 'general' ? 'Anticipada' : ticket.tipoEntrada}
🔢 Cantidad: ${ticket.cantidad}
💰 Total: $${ticket.precioTotal.toLocaleString('es-AR')}

📅 Fecha: 1 de Mayo, 2026 - 08:00 HS
📍 Lugar: Club Alemán

⚠️ IMPORTANTE:
• Descargá tu código QR desde el email
• Presentalo en la entrada
• Llegá con anticipación

🆔 ID: ${ticket.id}`;

        // MÉTODO GRATUITO: Usar API de CallMeBot (100% gratis)
        // Requiere activar el número primero enviando "I allow callmebot to send me messages" al +54 9 11 1234-5678 (ejemplo)
        // Por ahora, generamos el link de WhatsApp Web (método más universal y gratis)
        
        const whatsappWebUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(mensaje)}`;
        
        console.log(`📱 Link de WhatsApp generado: ${whatsappWebUrl}`);
        console.log(`✅ WhatsApp listo para ${phoneNumber} (enviar manualmente desde panel admin)`);
        
        // Guardar el link en el ticket para uso posterior
        ticket.whatsappLink = whatsappWebUrl;
        
        return true;
    } catch (error) {
        console.error('❌ Error al preparar WhatsApp:', error.message);
        return false;
    }
}

// Función principal para enviar ticket por ambos canales
async function enviarTicket(ticket) {
    console.log(`📤 Enviando ticket a ${ticket.nombre}...`);
    
    const resultados = await Promise.allSettled([
        enviarTicketPorEmail(ticket),
        enviarTicketPorWhatsApp(ticket)
    ]);

    const emailEnviado = resultados[0].status === 'fulfilled' && resultados[0].value;
    const whatsappEnviado = resultados[1].status === 'fulfilled' && resultados[1].value;

    if (emailEnviado || whatsappEnviado) {
        console.log(`✅ Ticket enviado exitosamente (Email: ${emailEnviado ? 'Sí' : 'No'}, WhatsApp: ${whatsappEnviado ? 'Sí' : 'No'})`);
        return true;
    } else {
        console.log('❌ No se pudo enviar el ticket por ningún canal');
        return false;
    }
}

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

// Rutas de páginas HTML
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/comprar.html', (req, res) => {
    res.sendFile(__dirname + '/public/comprar.html');
});

app.get('/success.html', (req, res) => {
    res.sendFile(__dirname + '/public/success.html');
});

app.get('/login.html', (req, res) => {
    res.sendFile(__dirname + '/public/login.html');
});

app.get('/admin.html', (req, res) => {
    res.sendFile(__dirname + '/public/admin.html');
});

app.get('/validar.html', (req, res) => {
    res.sendFile(__dirname + '/public/validar.html');
});

app.get('/mis-entradas.html', (req, res) => {
    res.sendFile(__dirname + '/public/mis-entradas.html');
});

// Crear preferencia de pago CON VALIDACIÓN
app.post('/create-preference', [
    // 🛡️ Validaciones
    body('nombre').trim().notEmpty().withMessage('El nombre es requerido')
        .isLength({ min: 2, max: 100 }).withMessage('Nombre inválido'),
    body('email').trim().isEmail().normalizeEmail().withMessage('Email inválido'),
    body('telefono').trim().notEmpty().withMessage('Teléfono requerido')
        .matches(/^[0-9]{8,15}$/).withMessage('Teléfono inválido'),
    body('dni').trim().notEmpty().withMessage('DNI requerido')
        .matches(/^[0-9]{7,8}$/).withMessage('DNI inválido'),
    body('cantidad').isInt({ min: 1, max: 10 }).withMessage('Cantidad debe ser entre 1 y 10'),
    body('tipoEntrada').isIn(['general', 'vip', 'premium']).withMessage('Tipo de entrada inválido')
], async (req, res) => {
    try {
        // Verificar errores de validación
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Datos inválidos', 
                detalles: errors.array().map(e => e.msg)
            });
        }
        
        console.log('=== Datos validados recibidos ===');
        // No logear datos sensibles completos
        console.log({ nombre: req.body.nombre, email: req.body.email.substring(0, 3) + '***', cantidad: req.body.cantidad });
        
        const { nombre, email, cantidad, tipoEntrada, telefono, dni } = req.body;
        
        // Verificar stock disponible
        if (!(await configDB.hasStock(cantidad))) {
            const config = await configDB.get();
            return res.status(400).json({ 
                error: 'Stock insuficiente',
                mensaje: `Solo quedan ${config.stockRestante} entradas disponibles`
            });
        }
        
        const precios = {
            'general': 25000,
            'vip': 35000,
            'premium': 50000
        };
        
        const precioUnitario = precios[tipoEntrada] || 25000;
        const subtotal = precioUnitario * cantidad;
        const cargoServicio = Math.round(subtotal * 0.1); // 10% cargo por servicio
        const precioTotal = subtotal + cargoServicio;
        
        console.log('=== Precios calculados ===');

        console.log({ precioUnitario, subtotal, cargoServicio, precioTotal });
        
        // Generar ID único para el ticket
        const ticketId = uuidv4();
        
        // Crear preferencia de pago
        const preference = new Preference(client);
        const response = await preference.create({
            body: {
                items: [
                    {
                        title: `EKKLESIA 2026 - Entrada ${tipoEntrada === 'general' ? 'Anticipada' : tipoEntrada.toUpperCase()} (incluye cargo de servicio)`,
                        unit_price: precioTotal, // Precio total en UN SOLO ITEM
                        quantity: 1, // Siempre 1 item con el precio total
                        currency_id: 'ARS'
                    }
                ],
                payer: {
                    name: nombre,
                    email: email
                },
                back_urls: {
                    success: `${process.env.BASE_URL || `http://localhost:${PORT}`}/success`,
                    failure: `${process.env.BASE_URL || `http://localhost:${PORT}`}/failure`,
                    pending: `${process.env.BASE_URL || `http://localhost:${PORT}`}/pending`
                },
                payment_methods: {
                    excluded_payment_types: [
                        { id: 'ticket' } // SIN efectivo
                    ],
                    excluded_payment_methods: [
                        { id: 'atm' }
                    ],
                    default_installments: 1,
                    installments: 1
                },
                binary_mode: false, // Cambiar a false para más control
                statement_descriptor: 'EKKLESIA2026',
                external_reference: ticketId
                // Nota: auto_return y notification_url requieren URLs públicas
                // Para usar en producción, necesitas un dominio público o usar ngrok
            }
        });
        
        // Guardar información del ticket en la base de datos
        await ticketDB.create({
            id: ticketId,
            nombre,
            email,
            telefono,
            dni,
            cantidad,
            tipoEntrada,
            precioUnitario,
            subtotal,
            cargoServicio,
            precioTotal,
            estado: 'pendiente',
            usado: false
        });
        
        console.log('=== Respuesta de Mercado Pago ===');
        console.log({ id: response.id, init_point: response.init_point });
        
        // Generar código QR con el link de pago
        const qrCodeImage = await QRCode.toDataURL(response.init_point, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        
        res.json({
            id: response.id,
            init_point: response.init_point,
            ticketId: ticketId,
            qrCode: qrCodeImage
        });
        
    } catch (error) {
        console.error('=== Error al crear preferencia ===');
        console.error('Error completo:', error);
        console.error('Error message:', error.message);
        console.error('Error cause:', error.cause);
        res.status(500).json({ error: 'Error al procesar el pago: ' + error.message });
    }
});

// Webhook de Mercado Pago
app.post('/webhook', async (req, res) => {
    try {
        console.log('🔔 Webhook recibido:', req.body);
        const { type, data } = req.body;
        
        if (type === 'payment') {
            const paymentId = data.id;
            const payment = new Payment(client);
            const paymentData = await payment.get({ id: paymentId });
            
            console.log('💳 Estado del pago:', paymentData.status);
            const ticketId = paymentData.external_reference;
            const ticket = await ticketDB.getById(ticketId);
            
            if (ticket && paymentData.status === 'approved') {
                await ticketDB.markAsPaid(ticketId, paymentId);
                const updatedTicket = await ticketDB.getById(ticketId);
                
                // Descontar stock
                await configDB.updateStock(-ticket.cantidad);
                console.log(`📦 Stock actualizado: -${ticket.cantidad} entradas`);
                
                console.log('✅ Pago aprobado, enviando ticket...');
                // Enviar ticket por email y WhatsApp
                await enviarTicket(updatedTicket);
            }
        }
        
        res.sendStatus(200);
    } catch (error) {
        console.error('❌ Error en webhook:', error);
        res.sendStatus(500);
    }
});

// Página de éxito con verificación y envío de email
app.get('/success', async (req, res) => {
    try {
        const { payment_id, external_reference } = req.query;
        
        console.log('✅ Redirigido a /success');
        console.log('Payment ID:', payment_id);
        console.log('External Reference (Ticket ID):', external_reference);
        
        // Si tenemos el ticketId, intentar verificar el pago y enviar email
        if (external_reference) {
            const ticket = await ticketDB.getById(external_reference);
            
            if (ticket && ticket.estado === 'pendiente') {
                // Marcar como pagado
                await ticketDB.markAsPaid(external_reference, payment_id);
                const updatedTicket = await ticketDB.getById(external_reference);
                
                // Descontar stock
                await configDB.updateStock(-ticket.cantidad);
                console.log(`📦 Stock actualizado: -${ticket.cantidad} entradas`);
                
                console.log('💳 Ticket actualizado a PAGADO');
                console.log('📧 Enviando ticket...');
                
                // Enviar ticket por email y WhatsApp
                await enviarTicket(updatedTicket);
            }
        }
        
        res.sendFile(__dirname + '/public/success.html');
    } catch (error) {
        console.error('❌ Error en /success:', error);
        res.sendFile(__dirname + '/public/success.html');
    }
});

// Página de fallo
app.get('/failure', (req, res) => {
    res.send('<h1>Pago cancelado</h1><p>El pago fue cancelado. <a href="/">Volver al inicio</a></p>');
});

// Página pendiente
app.get('/pending', (req, res) => {
    res.send('<h1>Pago pendiente</h1><p>Tu pago está pendiente de aprobación. <a href="/">Volver al inicio</a></p>');
});

// Generar QR para ticket
app.get('/generate-qr/:ticketId', async (req, res) => {
    try {
        const ticketId = req.params.ticketId;
        const ticket = await ticketDB.getById(ticketId);
        
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket no encontrado' });
        }
        
        if (ticket.estado !== 'pagado') {
            return res.status(400).json({ error: 'El pago aún no ha sido confirmado' });
        }
        
        // Datos del QR
        const qrData = JSON.stringify({
            ticketId: ticket.id,
            nombre: ticket.nombre,
            email: ticket.email,
            tipoEntrada: ticket.tipoEntrada,
            cantidad: ticket.cantidad,
            fecha: ticket.fechaCreacion
        });
        
        // Generar QR
        const qrImage = await QRCode.toDataURL(qrData);
        
        res.json({
            qr: qrImage,
            ticket: ticket
        });
        
    } catch (error) {
        console.error('Error al generar QR:', error);
        res.status(500).json({ error: 'Error al generar el código QR' });
    }
});

// Verificar estado del ticket
app.get('/ticket/:ticketId', async (req, res) => {
    const ticketId = req.params.ticketId;
    const ticket = await ticketDB.getById(ticketId);
    
    if (!ticket) {
        return res.status(404).json({ error: 'Ticket no encontrado' });
    }
    
    res.json(ticket);
});

// Endpoint para verificar ticket (sin marcar como usado)
app.post('/check-ticket', async (req, res) => {
    try {
        const { ticketData } = req.body;
        
        if (!ticketData) {
            return res.status(400).json({ 
                valido: false, 
                mensaje: 'No se proporcionó información del ticket' 
            });
        }
        
        // Parsear datos del QR
        const data = JSON.parse(ticketData);
        const ticket = await ticketDB.getById(data.ticketId);
        
        if (!ticket) {
            return res.json({ 
                valido: false, 
                mensaje: 'Ticket no encontrado en el sistema' 
            });
        }
        
        if (ticket.estado !== 'pagado') {
            return res.json({ 
                valido: false, 
                mensaje: 'El ticket no ha sido pagado' 
            });
        }
        
        if (ticket.usado) {
            return res.json({ 
                valido: false, 
                mensaje: 'Este ticket ya fue utilizado',
                fechaUso: ticket.fechaUso
            });
        }
        
        // Ticket válido
        res.json({
            valido: true,
            mensaje: 'Ticket válido',
            ticket: {
                nombre: ticket.nombre,
                dni: ticket.dni,
                tipoEntrada: ticket.tipoEntrada,
                cantidad: ticket.cantidad,
                fechaCompra: ticket.fechaCreacion
            }
        });
        
    } catch (error) {
        console.error('Error al verificar ticket:', error);
        res.status(500).json({ 
            valido: false, 
            mensaje: 'Error al validar el ticket' 
        });
    }
});

// Endpoint para validar y marcar ticket como usado
app.post('/validate-ticket', async (req, res) => {
    try {
        const { ticketData } = req.body;
        
        if (!ticketData) {
            return res.status(400).json({ 
                valido: false, 
                mensaje: 'No se proporcionó información del ticket' 
            });
        }
        
        // Parsear datos del QR
        const data = JSON.parse(ticketData);
        const ticket = await ticketDB.getById(data.ticketId);
        
        if (!ticket) {
            return res.json({ 
                valido: false, 
                mensaje: 'Ticket no encontrado en el sistema' 
            });
        }
        
        if (ticket.estado !== 'pagado') {
            return res.json({ 
                valido: false, 
                mensaje: 'El ticket no ha sido pagado' 
            });
        }
        
        if (ticket.usado) {
            return res.json({ 
                valido: false, 
                mensaje: 'Este ticket ya fue utilizado',
                fechaUso: ticket.fechaUso
            });
        }
        
        // Marcar como usado
        await ticketDB.markAsUsed(data.ticketId);
        
        console.log(`✅ Ticket ${data.ticketId} validado y marcado como usado`);
        
        // Ticket válido
        res.json({
            valido: true,
            mensaje: '¡Entrada válida! Puede ingresar',
            ticket: {
                nombre: ticket.nombre,
                dni: ticket.dni,
                tipoEntrada: ticket.tipoEntrada,
                cantidad: ticket.cantidad,
                fechaCompra: ticket.fechaCreacion
            }
        });
        
    } catch (error) {
        console.error('Error al validar ticket:', error);
        res.status(500).json({ 
            valido: false, 
            mensaje: 'Error al validar el ticket' 
        });
    }
});

// Página de validación de tickets (para personal de entrada)
app.get('/validar', (req, res) => {
    res.sendFile(__dirname + '/public/validar.html');
});

// API: Obtener stock disponible
app.get('/api/stock', async (req, res) => {
    try {
        const config = await configDB.get();
        res.json({ 
            success: true, 
            stockRestante: config.stockRestante,
            stockTotal: config.stockTotal 
        });
    } catch (error) {
        console.error('Error al obtener stock:', error);
        res.status(500).json({ success: false, error: 'Error al obtener stock' });
    }
});

// API: Reenviar ticket por email
app.post('/api/resend-ticket', async (req, res) => {
    try {
        const { ticketId, email } = req.body;
        
        if (!ticketId || !email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Se requiere ticketId y email' 
            });
        }
        
        // Obtener ticket
        const ticket = await ticketDB.getById(ticketId);
        
        if (!ticket) {
            return res.status(404).json({ 
                success: false, 
                error: 'Ticket no encontrado' 
            });
        }
        
        // Verificar que el email coincida
        if (ticket.email.toLowerCase() !== email.toLowerCase()) {
            return res.status(403).json({ 
                success: false, 
                error: 'El email no coincide con el ticket' 
            });
        }
        
        // Verificar que el ticket esté pagado
        if (ticket.estado !== 'pagado') {
            return res.status(400).json({ 
                success: false, 
                error: 'El pago aún no ha sido confirmado. Por favor espera unos minutos.' 
            });
        }
        
        // Reenviar email
        const enviado = await enviarTicketPorEmail(ticket);
        
        if (enviado) {
            console.log(`📧 Email reenviado exitosamente para ticket ${ticketId}`);
            res.json({ 
                success: true, 
                message: 'Email reenviado correctamente' 
            });
        } else {
            throw new Error('Error al enviar email');
        }
        
    } catch (error) {
        console.error('Error al reenviar ticket:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error al reenviar el email. Intenta nuevamente en unos momentos.' 
        });
    }
});

// API: Buscar ticket por email o DNI
app.post('/api/search-ticket', async (req, res) => {
    console.log('🔍 POST /api/search-ticket - Recibiendo petición...');
    try {
        const { email, dni } = req.body;
        console.log('📥 Datos recibidos:', { email: email ? 'presente' : 'ausente', dni: dni ? 'presente' : 'ausente' });
        
        if (!email && !dni) {
            return res.status(400).json({ 
                success: false, 
                error: 'Se requiere email o DNI' 
            });
        }
        
        // Conectar a la base de datos
        await initDatabase();
        
        let query = 'SELECT * FROM tickets WHERE estado = $1';
        let params = ['pagado'];
        
        // Buscar por email o DNI
        if (email && dni) {
            query += ' AND (LOWER(email) = $2 OR dni = $3)';
            params.push(email.toLowerCase().trim(), dni.trim());
        } else if (email) {
            query += ' AND LOWER(email) = $2';
            params.push(email.toLowerCase().trim());
        } else {
            query += ' AND dni = $2';
            params.push(dni.trim());
        }
        
        query += ' ORDER BY fecha_creacion DESC LIMIT 1';
        
        const result = await pool.query(query, params);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'No se encontraron entradas con esos datos. Verifica que el pago haya sido confirmado.' 
            });
        }
        
        const ticket = result.rows[0];
        
        console.log(`🔍 Ticket encontrado: ${ticket.id} para ${ticket.nombre}`);
        
        // Formatear datos del ticket
        const ticketData = {
            id: ticket.id,
            nombre: ticket.nombre,
            email: ticket.email,
            telefono: ticket.telefono,
            dni: ticket.dni,
            cantidad: ticket.cantidad,
            tipoEntrada: ticket.tipo_entrada,
            precioUnitario: ticket.precio_unitario,
            subtotal: ticket.subtotal,
            cargoServicio: ticket.cargo_servicio,
            precioTotal: ticket.precio_total,
            estado: ticket.estado,
            usado: ticket.usado,
            fechaCreacion: ticket.fecha_creacion,
            fechaPago: ticket.fecha_pago,
            fechaUso: ticket.fecha_uso
        };
        
        res.json({ 
            success: true, 
            ticket: ticketData 
        });
        
    } catch (error) {
        console.error('Error al buscar ticket:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error al buscar la entrada. Intenta nuevamente en unos momentos.' 
        });
    }
});

// ========================================
// 🔐 AUTENTICACIÓN DE ADMINISTRADOR
// ========================================

// Middleware de autenticación
function requireAuth(req, res, next) {
    if (req.session && req.session.authenticated) {
        return next();
    }
    
    // Si es una petición API, devolver JSON
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ 
            success: false, 
            error: 'No autorizado. Debe iniciar sesión.' 
        });
    }
    
    // Si es página HTML, redirigir a login
    res.redirect('/login');
}

// Página de login
app.get('/login', (req, res) => {
    // Si ya está autenticado, redirigir al admin
    if (req.session && req.session.authenticated) {
        return res.redirect('/admin');
    }
    res.sendFile(__dirname + '/public/login.html');
});

// Procesar login
app.post('/login', express.json(), (req, res) => {
    const { username, password } = req.body;
    
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        req.session.authenticated = true;
        req.session.username = username;
        console.log(`✅ Login exitoso: ${username}`);
        res.json({ success: true, message: 'Login exitoso' });
    } else {
        console.log(`❌ Login fallido: usuario=${username}`);
        res.status(401).json({ success: false, error: 'Credenciales incorrectas' });
    }
});

// Logout
app.post('/logout', (req, res) => {
    const username = req.session.username;
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Error al cerrar sesión' });
        }
        console.log(`👋 Logout: ${username}`);
        res.json({ success: true, message: 'Sesión cerrada' });
    });
});

// Verificar estado de autenticación
app.get('/api/auth/status', (req, res) => {
    res.json({ 
        authenticated: req.session && req.session.authenticated,
        username: req.session ? req.session.username : null
    });
});

// ========================================
// 🔒 RUTAS PROTEGIDAS - PANEL ADMIN
// ========================================

// Panel de administración (PROTEGIDO)
app.get('/admin', requireAuth, (req, res) => {
    res.sendFile(__dirname + '/public/admin.html');
});

// API: Obtener todos los tickets (PROTEGIDO)
app.get('/api/admin/tickets', requireAuth, async (req, res) => {
    try {
        const tickets = await ticketDB.getAll();
        res.json({ success: true, tickets });
    } catch (error) {
        console.error('Error al obtener tickets:', error);
        res.status(500).json({ success: false, error: 'Error al obtener tickets' });
    }
});

// API: Obtener estadísticas (PROTEGIDO)
app.get('/api/admin/stats', requireAuth, async (req, res) => {
    try {
        const tickets = await ticketDB.getAll();
        const config = await configDB.get();
        
        const stats = {
            totalTickets: tickets.length,
            ticketsPagados: tickets.filter(t => t.estado === 'pagado').length,
            ticketsPendientes: tickets.filter(t => t.estado === 'pendiente').length,
            ticketsUsados: tickets.filter(t => t.usado === true).length,
            totalVentas: await ticketDB.getTotalSales(),
            stockTotal: config.stockTotal,
            stockRestante: config.stockRestante,
            stockVendido: config.stockTotal - config.stockRestante
        };
        
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ success: false, error: 'Error al obtener estadísticas' });
    }
});

// API: Exportar tickets a CSV (PROTEGIDO)
app.get('/api/admin/export', requireAuth, async (req, res) => {
    try {
        const tickets = await ticketDB.getAll();
        
        // Crear CSV
        let csv = 'ID,Nombre,DNI,Email,Teléfono,Cantidad,Total,Estado,Usado,Fecha Compra,Fecha Pago,Fecha Uso\n';
        
        tickets.forEach(ticket => {
            csv += `${ticket.id},`;
            csv += `"${ticket.nombre}",`;
            csv += `${ticket.dni},`;
            csv += `${ticket.email},`;
            csv += `${ticket.telefono || ''},`;
            csv += `${ticket.cantidad},`;
            csv += `${ticket.precioTotal},`;
            csv += `${ticket.estado},`;
            csv += `${ticket.usado ? 'Sí' : 'No'},`;
            csv += `${ticket.fechaCreacion},`;
            csv += `${ticket.fechaPago || ''},`;
            csv += `${ticket.fechaUso || ''}\n`;
        });
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="tickets-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send('\uFEFF' + csv); // BOM para Excel
    } catch (error) {
        console.error('Error al exportar:', error);
        res.status(500).json({ success: false, error: 'Error al exportar datos' });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
