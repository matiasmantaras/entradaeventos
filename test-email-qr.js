const { ticketDB } = require('./database-postgres.js');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');

async function testEmailConQR() {
    try {
        const ticket = ticketDB.getById('77ab0a9f-6ceb-4225-9706-71068124ee14');
        
        if (!ticket) {
            console.log(' Ticket no encontrado');
            return;
        }
        
        console.log(' Ticket encontrado:', ticket.nombre);
        
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'matiasmantaras220603@gmail.com',
                pass: 'yhrkehxkjwsvzryb'
            }
        });
        
        console.log(' Generando QR como adjunto...');
        const qrData = JSON.stringify({
            id: ticket.id,
            nombre: ticket.nombre,
            dni: ticket.dni,
            cantidad: ticket.cantidad
        });
        
        const qrBuffer = await QRCode.toBuffer(qrData, {
            width: 400,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        
        console.log(' Enviando email con QR adjunto...');
        const mailOptions = {
            from: '"TicketFlow - EKKLESIA 2026" <matiasmantaras220603@gmail.com>',
            to: ticket.email,
            subject: ' Tu entrada para EKKLESIA 2026 - Código QR ACTUALIZADO',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a0a; color: #ffffff; padding: 20px;">
                    <h1 style="color: #3b82f6; text-align: center;">¡Compra Confirmada!</h1>
                    <h2 style="text-align: center; color: #10b981;">EKKLESIA 2026</h2>
                    
                    <div style="background-color: #151515; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <h3 style="color: #3b82f6;">Detalles de tu entrada:</h3>
                        <p><strong>Nombre:</strong> ${ticket.nombre}</p>
                        <p><strong>DNI:</strong> ${ticket.dni}</p>
                        <p><strong>Cantidad:</strong> ${ticket.cantidad}</p>
                        <p><strong>Total:</strong> $${ticket.precioTotal.toLocaleString()}</p>
                    </div>
                    
                    <div style="text-align: center; background-color: #ffffff; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <h3 style="color: #000000;">Tu código QR de entrada:</h3>
                        <img src="cid:qrcode" alt="QR Code" style="width: 300px; height: 300px; display: block; margin: 0 auto;" />
                        <p style="color: #666666; font-size: 12px; margin-top: 10px;">Escaneá este código en la entrada</p>
                    </div>
                    
                    <p style="text-align: center; color: #10b981; font-size: 16px;">¡Nos vemos en el evento! </p>
                </div>
            `,
            attachments: [
                {
                    filename: 'qr-entrada.png',
                    content: qrBuffer,
                    cid: 'qrcode'
                }
            ]
        };
        
        const result = await transporter.sendMail(mailOptions);
        console.log(' Email enviado con QR adjunto!');
        console.log('   Message ID:', result.messageId);
        console.log(' Revisá tu email:', ticket.email);
        console.log('');
        console.log(' El QR ahora debería verse correctamente (adjunto como imagen)');
        
    } catch (error) {
        console.error(' Error:', error.message);
    }
}

testEmailConQR();
