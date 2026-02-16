require('dotenv').config();
const { initDatabase, ticketDB, configDB, pool } = require('./database-postgres.js');

// ========================================
// SCRIPT PARA ACTUALIZAR ESTADO DE TICKET
// ========================================
// USO: node actualizar-ticket.js <dni-o-email>

async function actualizarTicket() {
    try {
        const busqueda = process.argv[2];
        
        if (!busqueda) {
            console.log('\n❌ ERROR: Debes proporcionar el DNI o email del comprador\n');
            console.log('Uso: node actualizar-ticket.js <dni-o-email>\n');
            console.log('Ejemplo: node actualizar-ticket.js 44987813\n');
            console.log('Ejemplo: node actualizar-ticket.js juan@example.com\n');
            process.exit(1);
        }
        
        console.log('\n🔍 Buscando ticket para:', busqueda);
        console.log('⏳ Conectando a la base de datos...\n');
        
        await initDatabase();
        
        // Buscar por DNI o email
        let query;
        let params;
        
        if (busqueda.includes('@')) {
            console.log('📧 Buscando por email...');
            query = 'SELECT * FROM tickets WHERE LOWER(email) = $1 ORDER BY fecha_creacion DESC LIMIT 1';
            params = [busqueda.toLowerCase()];
        } else {
            console.log('🆔 Buscando por DNI...');
            query = 'SELECT * FROM tickets WHERE dni = $1 ORDER BY fecha_creacion DESC LIMIT 1';
            params = [busqueda];
        }
        
        const result = await pool.query(query, params);
        
        if (result.rows.length === 0) {
            console.log('\n❌ No se encontró ningún ticket con esos datos\n');
            
            // Mostrar algunos tickets pendientes para referencia
            const pendientes = await pool.query('SELECT id, nombre, email, dni, estado FROM tickets WHERE estado = $1 LIMIT 5', ['pendiente']);
            if (pendientes.rows.length > 0) {
                console.log('📋 Tickets pendientes recientes:');
                pendientes.rows.forEach(t => {
                    console.log(`  - ${t.nombre} | DNI: ${t.dni} | Email: ${t.email}`);
                });
            }
            
            pool.end();
            process.exit(1);
        }
        
        const ticket = result.rows[0];
        
        console.log('\n✅ TICKET ENCONTRADO:\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('ID:', ticket.id);
        console.log('Nombre:', ticket.nombre);
        console.log('Email:', ticket.email);
        console.log('DNI:', ticket.dni);
        console.log('Cantidad:', ticket.cantidad);
        console.log('Tipo:', ticket.tipo_entrada);
        console.log('Total: $', ticket.precio_total);
        console.log('Estado actual:', ticket.estado);
        console.log('Usado:', ticket.usado ? 'Sí' : 'No');
        console.log('Payment ID:', ticket.payment_id || 'N/A');
        console.log('Fecha creación:', ticket.fecha_creacion);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        if (ticket.estado === 'pagado') {
            console.log('ℹ️  Este ticket ya está marcado como PAGADO\n');
            console.log('✅ Puede acceder a su entrada en: https://entradaeventos.vercel.app/mis-entradas.html\n');
            pool.end();
            return;
        }
        
        // Si se pasa "confirmar" o "s" como segundo argumento, actualizar automáticamente
        const autoConfirm = process.argv[3];
        
        if (autoConfirm === 'confirmar' || autoConfirm === 's') {
            console.log('\n💳 Actualizando estado a PAGADO...');
            
            // Actualizar estado
            await pool.query(
                'UPDATE tickets SET estado = $1, fecha_pago = NOW() WHERE id = $2',
                ['pagado', ticket.id]
            );
            
            console.log('✅ Estado actualizado correctamente\n');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('✅ TICKET CONFIRMADO');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            console.log('El usuario puede ahora:');
            console.log('1. Ver su entrada en: https://entradaeventos.vercel.app/mis-entradas.html');
            console.log('2. Buscar con DNI:', ticket.dni);
            console.log('3. O con Email:', ticket.email);
            console.log('\n📧 Nota: Si no recibió el email, puede reenviarlo desde "Mis Entradas"\n');
            
            pool.end();
            process.exit(0);
        }
        
        // Preguntar si quiere actualizar
        console.log('⚠️  El ticket está en estado:', ticket.estado);
        console.log('\n¿Deseas actualizar el estado a PAGADO? (s/n)');
        console.log('💡 Tip: Usa "node actualizar-ticket.js <dni> s" para confirmar automáticamente\n');
        
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        readline.question('Confirmar (s/n): ', async (respuesta) => {
            if (respuesta.toLowerCase() === 's' || respuesta.toLowerCase() === 'si') {
                console.log('\n💳 Actualizando estado a PAGADO...');
                
                // Actualizar estado
                await pool.query(
                    'UPDATE tickets SET estado = $1, fecha_pago = NOW() WHERE id = $2',
                    ['pagado', ticket.id]
                );
                
                console.log('✅ Estado actualizado correctamente\n');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('✅ TICKET CONFIRMADO');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
                console.log('El usuario puede ahora:');
                console.log('1. Ver su entrada en: https://entradaeventos.vercel.app/mis-entradas.html');
                console.log('2. Buscar con DNI:', ticket.dni);
                console.log('3. O con Email:', ticket.email);
                console.log('\n📧 Nota: Si no recibió el email, puede reenviarlo desde "Mis Entradas"\n');
                
            } else {
                console.log('\n❌ Operación cancelada\n');
            }
            
            readline.close();
            pool.end();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error);
        process.exit(1);
    }
}

actualizarTicket();
