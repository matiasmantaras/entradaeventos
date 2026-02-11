const { ticketDB, configDB } = require('./database-postgres.js');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');

// ========================================
// SCRIPT PARA CONFIRMAR PAGO Y ENVIAR QR
// ========================================
// USO: node confirmar-pago.js <email-del-comprador>

async function confirmarPagoYEnviarQR() {
    try {
        const emailComprador = process.argv[2];
        
        if (!emailComprador) {
            console.log('\n❌ ERROR: Debes proporcionar el email del comprador\n');
            console.log('Uso: node confirmar-pago.js <email>\n');
            console.log('Ejemplo: node confirmar-pago.js juan@example.com\n');
            return;
        }
        
        console.log('\n🔍 Buscando tickets pendientes para:', emailComprador);
        
        const tickets = ticketDB.getAll();
        const ticketsPendientes = tickets.filter(t => 
            t.email.toLowerCase() === emailComprador.toLowerCase() && 
            t.estado === 'pendiente'
        );
        
        if (ticketsPendientes.length === 0) {
            console.log('\n❌ No hay tickets pendientes para este email\n');
            console.log('Tickets disponibles:');
            tickets.filter(t => t.estado === 'pendiente').forEach(t => {
                console.log(`  - ${t.nombre} (${t.email}) - ${t.cantidad} entrada(s)`);
            });
            return;
        }
        
        console.log(`\n✅ Encontrados ${ticketsPendientes.length} ticket(s) pendiente(s):\n`);
        ticketsPendientes.forEach((t, i) => {
            console.log(`${i + 1}. ${t.nombre}`);
            console.log(`   Cantidad: ${t.cantidad} entrada(s)`);
            console.log(`   Total: $${t.precioTotal.toLocaleString()}`);
            console.log(`   ID: ${t.id}\n`);
        });
        
        // Procesar todos los tickets pendientes de este email
        for (const ticket of ticketsPendientes) {
            console.log(`\n💳 Procesando ticket: ${ticket.nombre}...`);
            
            // Marcar como pagado
            ticketDB.markAsPaid(ticket.id, `MANUAL-PAYMENT-${Date.now()}`);
            
            // Actualizar stock
            configDB.updateStock(-ticket.cantidad);
            console.log(`✅ Stock actualizado: -${ticket.cantidad}`);
            
            const updatedTicket = ticketDB.getById(ticket.id);
            
            // Enviar email con QR
            console.log('📧 Enviando email con QR...');
            
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER || 'matiasmantaras220603@gmail.com',
                    pass: process.env.EMAIL_PASS || 'yhrkehxkjwsvzryb'
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
                from: `"TicketFlow - EKKLESIA 2026" <${process.env.EMAIL_USER || 'matiasmantaras220603@gmail.com'}>`,
                to: updatedTicket.email,
                subject: '🎟️ PAGO CONFIRMADO - Tu entrada para EKKLESIA 2026',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a0a; color: #ffffff; padding: 20px;">
                        <h1 style="color: #3b82f6; text-align: center;">¡Pago Confirmado! 🎉</h1>
                        <h2 style="text-align: center; color: #10b981;">EKKLESIA 2026</h2>
                        
                        <div style="background-color: #151515; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <h3 style="color: #3b82f6;">Detalles de tu compra:</h3>
                            <p><strong>Nombre:</strong> ${updatedTicket.nombre}</p>
                            <p><strong>DNI:</strong> ${updatedTicket.dni}</p>
                            <p><strong>Email:</strong> ${updatedTicket.email}</p>
                            <p><strong>Teléfono:</strong> ${updatedTicket.telefono}</p>
                            <p><strong>Cantidad:</strong> ${updatedTicket.cantidad} entrada(s)</p>
                            <p><strong>Total pagado:</strong> $${updatedTicket.precioTotal.toLocaleString('es-AR')}</p>
                            <p><strong>Fecha del evento:</strong> 1 de Mayo, 2026 - 08:00 HS</p>
                            <p><strong>Lugar:</strong> Club Alemán, Posadas, Misiones</p>
                        </div>
                        
                        <div style="text-align: center; background-color: #ffffff; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <h3 style="color: #000000;">Tu código QR de entrada:</h3>
                            <img src="cid:qrcode" alt="QR Code" style="width: 300px; height: 300px; display: block; margin: 0 auto;" />
                            <p style="color: #666666; font-size: 12px; margin-top: 10px;">ID: ${updatedTicket.id}</p>
                            <p style="color: #999999; font-size: 11px;">Escaneá este código en la entrada del evento</p>
                        </div>
                        
                        <div style="background-color: #151515; padding: 15px; border-radius: 10px; margin: 20px 0;">
                            <h3 style="color: #10b981;">📋 Instrucciones importantes:</h3>
                            <ul>
                                <li>✅ Presentá este QR en la entrada del evento</li>
                                <li>✅ Guardá este email o tomá captura de pantalla</li>
                                <li>✅ Llegá con anticipación al evento</li>
                                <li>✅ El QR solo puede usarse UNA vez</li>
                                <li>✅ No compartas tu QR con nadie</li>
                            </ul>
                        </div>
                        
                        <div style="text-align: center; padding: 20px; border-top: 1px solid #333; margin-top: 30px;">
                            <p style="color: #10b981; font-size: 18px; font-weight: bold; margin: 0;">¡Nos vemos en EKKLESIA 2026! 🎉</p>
                        </div>
                        
                        <p style="text-align: center; color: #666666; font-size: 12px; margin-top: 20px;">
                            ¿Problemas con tu entrada? Contactanos a ${process.env.EMAIL_USER || 'matiasmantaras220603@gmail.com'}
                        </p>
                    </div>
                `,
                attachments: [{
                    filename: 'qr-entrada-ekklesia2026.png',
                    content: qrBuffer,
                    cid: 'qrcode'
                }]
            };
            
            const result = await transporter.sendMail(mailOptions);
            
            console.log('✅ Email enviado!');
            console.log(`   Message ID: ${result.messageId}`);
        }
        
        console.log('\n🎉 ¡PROCESO COMPLETADO!\n');
        console.log(`Total tickets procesados: ${ticketsPendientes.length}`);
        console.log(`Total entradas: ${ticketsPendientes.reduce((sum, t) => sum + t.cantidad, 0)}`);
        console.log(`Total recaudado: $${ticketsPendientes.reduce((sum, t) => sum + t.precioTotal, 0).toLocaleString()}`);
        console.log('\n📬 Revisá el email (o carpeta SPAM)\n');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
    }
}

confirmarPagoYEnviarQR();
