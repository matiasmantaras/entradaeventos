const express = require('express');
const bodyParser = require('body-parser');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Mercado Pago
const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN 
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Base de datos simulada (en producción usar una DB real)
const tickets = new Map();

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Crear preferencia de pago
app.post('/create-preference', async (req, res) => {
    try {
        const { nombre, email, cantidad, tipoEntrada } = req.body;
        
        const precios = {
            'general': 5000,
            'vip': 10000,
            'premium': 15000
        };
        
        const precioUnitario = precios[tipoEntrada] || 5000;
        const precioTotal = precioUnitario * cantidad;
        
        // Generar ID único para el ticket
        const ticketId = uuidv4();
        
        // Crear preferencia de pago
        const preference = new Preference(client);
        const response = await preference.create({
            body: {
                items: [
                    {
                        title: `Entrada ${tipoEntrada.toUpperCase()} - Evento 2026`,
                        unit_price: precioUnitario,
                        quantity: parseInt(cantidad),
                        currency_id: 'ARS'
                    }
                ],
                payer: {
                    name: nombre,
                    email: email
                },
                back_urls: {
                    success: `http://localhost:${PORT}/success`,
                    failure: `http://localhost:${PORT}/failure`,
                    pending: `http://localhost:${PORT}/pending`
                },
                auto_return: 'approved',
                external_reference: ticketId,
                notification_url: `http://localhost:${PORT}/webhook`
            }
        });
        
        // Guardar información del ticket
        tickets.set(ticketId, {
            id: ticketId,
            nombre,
            email,
            cantidad,
            tipoEntrada,
            precioTotal,
            estado: 'pendiente',
            fechaCreacion: new Date()
        });
        
        res.json({
            id: response.id,
            init_point: response.init_point,
            ticketId: ticketId
        });
        
    } catch (error) {
        console.error('Error al crear preferencia:', error);
        res.status(500).json({ error: 'Error al procesar el pago' });
    }
});

// Webhook de Mercado Pago
app.post('/webhook', async (req, res) => {
    try {
        const { type, data } = req.body;
        
        if (type === 'payment') {
            const paymentId = data.id;
            const payment = new Payment(client);
            const paymentData = await payment.get({ id: paymentId });
            
            const ticketId = paymentData.external_reference;
            const ticket = tickets.get(ticketId);
            
            if (ticket && paymentData.status === 'approved') {
                ticket.estado = 'pagado';
                ticket.paymentId = paymentId;
                tickets.set(ticketId, ticket);
            }
        }
        
        res.sendStatus(200);
    } catch (error) {
        console.error('Error en webhook:', error);
        res.sendStatus(500);
    }
});

// Página de éxito
app.get('/success', (req, res) => {
    res.sendFile(__dirname + '/public/success.html');
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
        const ticket = tickets.get(ticketId);
        
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
app.get('/ticket/:ticketId', (req, res) => {
    const ticketId = req.params.ticketId;
    const ticket = tickets.get(ticketId);
    
    if (!ticket) {
        return res.status(404).json({ error: 'Ticket no encontrado' });
    }
    
    res.json(ticket);
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
