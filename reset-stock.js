const { configDB, pool } = require('./database-postgres.js');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function pregunta(texto) {
    return new Promise((resolve) => {
        rl.question(texto, (respuesta) => {
            resolve(respuesta);
        });
    });
}

async function resetearStock() {
    console.log('='.repeat(50));
    console.log('🔄 RESETEAR STOCK DE ENTRADAS');
    console.log('='.repeat(50));
    
    try {
        const config = await configDB.get();
        
        if (!config) {
            console.log('❌ No se encontró configuración en la base de datos');
            console.log('💡 Ejecuta: node server.js (para inicializar la BD)');
            rl.close();
            await pool.end();
            process.exit(1);
        }
        
        console.log('\n📊 ESTADO ACTUAL:');
        console.log('   Stock Total:    ', config.stockTotal);
        console.log('   Stock Restante: ', config.stockRestante);
        console.log('   Vendidas:       ', config.stockTotal - config.stockRestante);
        
        const nuevoStockTotal = await pregunta('\n¿A cuánto quieres establecer el stock total? (actual: ' + config.stockTotal + '): ');
        const stockTotal = nuevoStockTotal ? parseInt(nuevoStockTotal) : config.stockTotal;
        
        if (isNaN(stockTotal) || stockTotal < 0) {
            console.log('❌ Valor inválido');
            rl.close();
            await pool.end();
            return;
        }
        
        const nuevoStockRestante = await pregunta('¿A cuánto quieres establecer el stock restante? (actual: ' + config.stockRestante + '): ');
        const stockRestante = nuevoStockRestante ? parseInt(nuevoStockRestante) : stockTotal;
        
        if (isNaN(stockRestante) || stockRestante < 0 || stockRestante > stockTotal) {
            console.log('❌ Valor inválido (debe ser entre 0 y ' + stockTotal + ')');
            rl.close();
            await pool.end();
            return;
        }
        
        console.log('\n📝 CAMBIOS A REALIZAR:');
        console.log('   Stock Total:     ', config.stockTotal, ' → ', stockTotal);
        console.log('   Stock Restante:  ', config.stockRestante, ' → ', stockRestante);
        
        const confirmacion = await pregunta('\n¿Confirmas estos cambios? (s/N): ');
        
        if (confirmacion.toLowerCase() === 's' || confirmacion.toLowerCase() === 'si') {
            await pool.query(
                'UPDATE config SET stock_total = $1, stock_restante = $2 WHERE id = 1',
                [stockTotal, stockRestante]
            );
            
            console.log('\n✅ Stock actualizado correctamente en Supabase');
            
            const nuevaConfig = await configDB.get();
            console.log('\n📊 NUEVO ESTADO:');
            console.log('   Stock Total:    ', nuevaConfig.stockTotal);
            console.log('   Stock Restante: ', nuevaConfig.stockRestante);
            console.log('   Vendidas:       ', nuevaConfig.stockTotal - nuevaConfig.stockRestante);
            
            console.log('\n💡 Los cambios ya están aplicados en tu base de datos Supabase');
        } else {
            console.log('\n❌ Operación cancelada');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('💡 Verifica que DATABASE_URL esté configurado en .env');
    }
    
    rl.close();
    await pool.end();
}

resetearStock();
