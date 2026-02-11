const { configDB, ticketDB } = require('./database-postgres.js');

console.log('='.repeat(50));
console.log('📊 VERIFICACIÓN DE STOCK Y CONFIGURACIÓN');
console.log('='.repeat(50));

async function verificarStock() {
    try {
        // Obtener configuración actual
        const config = await configDB.get();
        
        if (!config) {
            console.log('❌ No se encontró configuración en la base de datos');
            console.log('💡 Ejecuta: node server.js (para inicializar la BD)');
            process.exit(1);
        }
        
        console.log('\n📦 STOCK ACTUAL:');
        console.log('   Stock Total:     ', config.stockTotal);
        console.log('   Stock Restante:  ', config.stockRestante);
        console.log('   Stock Vendido:   ', config.stockTotal - config.stockRestante);
        
        if (config.stockRestante === 0) {
            console.log('\n⚠️  ¡ENTRADAS AGOTADAS!');
        } else if (config.stockRestante < 50) {
            console.log('\n⚠️  ¡Pocas entradas disponibles!');
        } else {
            console.log('\n✅ Hay entradas disponibles');
        }
        
        console.log('\n💰 PRECIOS:');
        console.log('   General:  $', config.precioEntrada?.toLocaleString('es-AR') || '25.000');
        console.log('   Cargo:     ', config.cargoServicioPorcentaje || 10, '%');
        
        // Obtener estadísticas de tickets
        const tickets = await ticketDB.getAll();
        const ticketsPagados = tickets.filter(t => t.estado === 'pagado');
        const ticketsPendientes = tickets.filter(t => t.estado === 'pendiente');
        const ticketsUsados = tickets.filter(t => t.usado === true);
        
        const totalEntradasPagadas = ticketsPagados.reduce((sum, t) => sum + t.cantidad, 0);
        const totalEntradasPendientes = ticketsPendientes.reduce((sum, t) => sum + t.cantidad, 0);
        
        console.log('\n🎫 ESTADÍSTICAS DE TICKETS:');
        console.log('   Total registros:        ', tickets.length);
        console.log('   Pagados:                ', ticketsPagados.length);
        console.log('   Pendientes:             ', ticketsPendientes.length);
        console.log('   Tickets usados:         ', ticketsUsados.length);
        console.log('\n   Entradas pagadas:       ', totalEntradasPagadas);
        console.log('   Entradas pendientes:    ', totalEntradasPendientes);
        console.log('   Total entradas vendidas:', totalEntradasPagadas + totalEntradasPendientes);
        
        console.log('\n' + '='.repeat(50));
        
        // Dar recomendación
        if (config.stockRestante === 0) {
            console.log('\n💡 SOLUCIÓN:');
            console.log('   Para aumentar el stock:');
            console.log('   1. Ve a tu dashboard de Supabase');
            console.log('   2. Tabla Editor → config');
            console.log('   3. Edita stock_restante y stock_total');
            console.log('   O ejecuta: node reset-stock.js');
        }
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('💡 Verifica que DATABASE_URL esté configurado en .env');
        process.exit(1);
    }
}

verificarStock();
