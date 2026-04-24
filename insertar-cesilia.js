const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Configuración de conexión a Supabase (PostgreSQL)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function insertarCesilia() {
    let client;
    try {
        client = await pool.connect();
        
        // Primero obtenemos la configuración de precios
        const configResult = await client.query('SELECT * FROM config LIMIT 1');
        const config = configResult.rows[0];
        
        const precioUnitario = parseFloat(config.precio_entrada);
        const cargoServicioPorcentaje = parseInt(config.cargo_servicio_porcentaje);
        const cantidad = 1; // Cambiar si necesita más entradas
        
        const subtotal = precioUnitario * cantidad;
        const cargoServicio = subtotal * (cargoServicioPorcentaje / 100);
        const precioTotal = subtotal + cargoServicio;
        
        // Datos de Cesilia
        const ticketData = {
            id: uuidv4(),
            nombre: 'Cesilia Schmidt',
            dni: '32305213',
            email: 'checky.accesorios@gmail.com',
            telefono: '3754406334',
            cantidad: cantidad,
            tipo_entrada: 'general',
            precio_unitario: precioUnitario,
            subtotal: subtotal,
            cargo_servicio: cargoServicio,
            precio_total: precioTotal,
            estado: 'confirmado', // Cambiar a 'pendiente' si no está pagado
            usado: false
        };
        
        // Insertar el ticket
        const query = `
            INSERT INTO tickets (
                id, nombre, dni, email, telefono, cantidad, tipo_entrada,
                precio_unitario, subtotal, cargo_servicio, precio_total,
                estado, usado, fecha_pago
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
            ) RETURNING *;
        `;
        
        const values = [
            ticketData.id,
            ticketData.nombre,
            ticketData.dni,
            ticketData.email,
            ticketData.telefono,
            ticketData.cantidad,
            ticketData.tipo_entrada,
            ticketData.precio_unitario,
            ticketData.subtotal,
            ticketData.cargo_servicio,
            ticketData.precio_total,
            ticketData.estado,
            ticketData.usado
        ];
        
        const result = await client.query(query, values);
        
        console.log('✅ Ticket insertado exitosamente:');
        console.log('ID:', result.rows[0].id);
        console.log('Nombre:', result.rows[0].nombre);
        console.log('DNI:', result.rows[0].dni);
        console.log('Email:', result.rows[0].email);
        console.log('Teléfono:', result.rows[0].telefono);
        console.log('Cantidad:', result.rows[0].cantidad);
        console.log('Precio Total:', result.rows[0].precio_total);
        console.log('Estado:', result.rows[0].estado);
        
        // Actualizar stock
        await client.query(`
            UPDATE config 
            SET stock_restante = stock_restante - $1,
                updated_at = NOW()
            WHERE id = 1
        `, [cantidad]);
        
        console.log(`✅ Stock actualizado: -${cantidad} entradas`);
        
    } catch (error) {
        console.error('❌ Error al insertar ticket:', error);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

insertarCesilia();
