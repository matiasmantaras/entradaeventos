const { ticketDB } = require('./database-postgres.js');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');

async function testEmail() {
    try {
        const ticket = ticketDB.getById('77ab0a9f-6ceb-4225-9706-71068124ee14');
        
        if (!ticket) {
            console.log(' Ticket no encontrado');
            return;
        }
        
        console.log(' Ticket encontrado:', ticket.nombre, ticket.email);
        
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'matiasmantaras220603@gmail.com',
                pass: 'yhrkehxkjwsvzryb'
            }
        });
        
        console.log(' Generando QR...');
        const qrBase64 = await QRCode.toDataURL(ticket.id, { width: 300, margin: 2 });
        
        console.log(' Enviando email...');
        const mailOptions = {
            from: 'matiasmantaras220603@gmail.com',
            to: ticket.email,
            subject: ' Tu entrada - Presentá este QR en la puerta',
            html: `
                <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
                    <h1>¡Tu entrada está lista! </h1>
                    <p>Hola ${ticket.nombre},</p>
                    <p>Recibimos tu pago correctamente. Presentá este QR en la entrada:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <img src="${qrBase64}" alt="QR Code" style="width: 300px; height: 300px;"/>
                    </div>
                    <p><strong>Detalles:</strong></p>
                    <ul>
                        <li>Cantidad: ${ticket.cantidad} entrada(s)</li>
                        <li>Total: $${ticket.precioTotal.toLocaleString()}</li>
                        <li>ID: ${ticket.id}</li>
                    </ul>
                    <p>¡Nos vemos en el evento!</p>
                </div>
            `
        };
        
        const result = await transporter.sendMail(mailOptions);
        console.log(' Email enviado exitosamente!');
        console.log('   Message ID:', result.messageId);
        console.log(' Revisá tu email:', ticket.email);
        
    } catch (error) {
        console.error(' Error al enviar email:', error.message);
        if (error.code) console.error('   Código:', error.code);
        if (error.response) console.error('   Respuesta:', error.response);
    }
}

testEmail();
