const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Script de prueba para el nuevo sistema de QR con URL

async function testQRSystem() {
    console.log('🧪 PRUEBA DEL SISTEMA DE QR CON URL\n');
    
    const PORT = process.env.PORT || 3000;
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    
    // Generar ID de ticket de ejemplo
    const ticketId = uuidv4();
    
    console.log('📋 Datos de prueba:');
    console.log(`   ID del ticket: ${ticketId}`);
    console.log(`   URL base: ${baseUrl}`);
    
    // Generar URL para el QR
    const qrUrl = `${baseUrl}/entrada/${ticketId}`;
    console.log(`   URL del QR: ${qrUrl}\n`);
    
    // Generar QR como imagen
    try {
        const qrImage = await QRCode.toDataURL(qrUrl, {
            width: 300,
            margin: 2
        });
        
        console.log('✅ QR generado exitosamente');
        console.log('📱 Al escanear este QR se abrirá:', qrUrl);
        console.log('👁️  El usuario verá una página con:');
        console.log('   - Nombre, DNI, cantidad de entradas');
        console.log('   - Tipo de entrada y total pagado');
        console.log('   - El código QR visual');
        console.log('   - Detalles del evento\n');
        
        console.log('🔐 Para validar en /validar, el staff puede:');
        console.log('   1. Escanear el QR y pegar la URL completa');
        console.log('   2. O simplemente pegar el ID:', ticketId);
        console.log('   3. Ambos métodos funcionan ✓\n');
        
        console.log('📊 Ventajas del nuevo sistema:');
        console.log('   ✓ Al escanear con cámara normal → página bonita');
        console.log('   ✓ Fácil de compartir (es una URL)');
        console.log('   ✓ Funciona sin internet después de cargar');
        console.log('   ✓ Más profesional y moderno');
        console.log('   ✓ Compatible con todos los dispositivos\n');
        
        console.log('⚠️  IMPORTANTE:');
        console.log('   - Los tickets viejos (con JSON) NO funcionarán');
        console.log('   - Necesitas regenerar QRs para tickets existentes');
        console.log('   - O esperar a que se corrija el bug y reenviar emails\n');
        
        console.log('🚀 Para probar:');
        console.log('   1. Iniciá el servidor: npm start');
        console.log(`   2. Abrí: ${baseUrl}/entrada/${ticketId}`);
        console.log('   3. (No existirá porque es un ID falso, pero verás el diseño)\n');
        
    } catch (error) {
        console.error('❌ Error al generar QR:', error);
    }
}

testQRSystem();
