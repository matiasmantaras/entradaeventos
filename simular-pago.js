const { ticketDB, configDB } = require('./database-postgres.js');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');

async function marcarPagadoYEnviarEmail() {
    try {
        const ticketId = 'b7705b10-526b-4486-a5a1-933c6de87f94';
        
        console.log(' Buscando ticket...');
        const ticket = ticketDB.getById(ticketId);
        
        if (!ticket) {
            console.log(' Ticket no encontrado');
            return;
        }
        
        console.log(' Ticket encontrado:', ticket.nombre);
        console.log('   Email:', ticket.email);
        console.log('   Cantidad:', ticket.cantidad, 'entrada(s)');
        console.log('   Total: $' + ticket.precioTotal.toLocaleString());
        
        console.log('\n Marcando ticket como PAGADO...');
        ticketDB.markAsPaid(ticketId, 'TEST-PAYMENT-123456');
        
        console.log(' Actualizando stock...');
        configDB.updateStock(-ticket.cantidad);
        
        const updatedTicket = ticketDB.getById(ticketId);
        console.log(' Ticket actualizado - Estado:', updatedTicket.estado);
        
        console.log('\n Preparando email con QR...');
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'matiasmantaras220603@gmail.com',
                pass: 'yhrkehxkjwsvzryb'
            }
        });
        
        const qrData = JSON.stringify({
            id: updatedTicket.id,
            nombre: updatedTicket.nombre,
            dni: updatedTicket.dni,
            cantidad: updatedTicket.cantidad
        });
        
        const qrBuffer = await QRCode.toBuffer(qrData, {
            width: 400,
            margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' }
        });
        
        const mailOptions = {
            from: '"TicketFlow - EKKLESIA 2026" <matiasmantaras220603@gmail.com>',
            to: updatedTicket.email,
            subject: ' PAGO CONFIRMADO - Tu entrada para EKKLESIA 2026',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a0a; color: #ffffff; padding: 20px;">
                    <h1 style="color: #3b82f6; text-align: center;">¡Pago Confirmado! </h1>
                    <h2 style="text-align: center; color: #10b981;">EKKLESIA 2026</h2>
                    
                    <div style="background-color: #151515; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <h3 style="color: #3b82f6;">Detalles de tu compra:</h3>
                        <p><strong>Nombre:</strong> ${updatedTicket.nombre}</p>
                        <p><strong>DNI:</strong> ${updatedTicket.dni}</p>
                        <p><strong>Email:</strong> ${updatedTicket.email}</p>
                        <p><strong>Cantidad:</strong> ${updatedTicket.cantidad} entrada(s)</p>
                        <p><strong>Total pagado:</strong> $${updatedTicket.precioTotal.toLocaleString('es-AR')}</p>
                        <p><strong>Fecha:</strong> 1 de Mayo, 2026 - 08:00 HS</p>
                        <p><strong>Lugar:</strong> Club Alemán</p>
                    </div>
                    
                    <div style="text-align: center; background-color: #ffffff; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <h3 style="color: #000000;">Tu código QR de entrada:</h3>
                        <img src="cid:qrcode" alt="QR Code" style="width: 300px; height: 300px; display: block; margin: 0 auto;" />
                        <p style="color: #666666; font-size: 12px; margin-top: 10px;">ID: ${updatedTicket.id}</p>
                        <p style="color: #999999; font-size: 11px;">Escaneá este código en la entrada del evento</p>
                    </div>
                    
                    <div style="background-color: #151515; padding: 15px; border-radius: 10px; margin: 20px 0;">
                        <h3 style="color: #10b981;"> Instrucciones:</h3>
                        <ul>
                            <li> Presentá este QR en la entrada del evento</li>
                            <li> Guardá este email o screenshot</li>
                            <li> Llegá con anticipación</li>
                            <li> El QR solo puede usarse UNA vez</li>
                        </ul>
                    </div>
                    
                    <p style="text-align: center; color: #10b981; font-size: 18px; font-weight: bold;">¡Nos vemos en EKKLESIA 2026! </p>
                </div>
            `,
            attachments: [{
                filename: 'qr-entrada.png',
                content: qrBuffer,
                cid: 'qrcode'
            }]
        };
        
        console.log(' Enviando email...');
        const result = await transporter.sendMail(mailOptions);
        
        console.log('\n ¡EMAIL ENVIADO EXITOSAMENTE!');
        console.log('   Message ID:', result.messageId);
        console.log('   Destinatario:', updatedTicket.email);
        console.log('\n Revisá tu bandeja de entrada (o SPAM)');
        console.log(' El ticket ahora está PAGADO y el QR fue enviado\n');
        
    } catch (error) {
        console.error(' Error:', error.message);
    }
}

marcarPagadoYEnviarEmail();
