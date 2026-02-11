const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Configuración de conexión a Supabase (PostgreSQL)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Inicializar base de datos con tablas
async function initDatabase() {
    const client = await pool.connect();
    
    try {
        console.log('🔄 Inicializando base de datos PostgreSQL...');
        
        // Crear tabla de configuración
        await client.query(`
            CREATE TABLE IF NOT EXISTS config (
                id SERIAL PRIMARY KEY,
                stock_total INTEGER NOT NULL DEFAULT 500,
                stock_restante INTEGER NOT NULL DEFAULT 500,
                precio_entrada DECIMAL(10, 2) NOT NULL DEFAULT 25000.00,
                cargo_servicio_porcentaje INTEGER NOT NULL DEFAULT 10,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Crear tabla de tickets
        await client.query(`
            CREATE TABLE IF NOT EXISTS tickets (
                id UUID PRIMARY KEY,
                nombre VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                telefono VARCHAR(50) NOT NULL,
                dni VARCHAR(50) NOT NULL,
                cantidad INTEGER NOT NULL,
                tipo_entrada VARCHAR(50) NOT NULL DEFAULT 'general',
                precio_unitario DECIMAL(10, 2) NOT NULL,
                subtotal DECIMAL(10, 2) NOT NULL,
                cargo_servicio DECIMAL(10, 2) NOT NULL,
                precio_total DECIMAL(10, 2) NOT NULL,
                estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
                usado BOOLEAN NOT NULL DEFAULT FALSE,
                payment_id VARCHAR(255),
                whatsapp_link TEXT,
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                fecha_pago TIMESTAMP,
                fecha_uso TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Crear índices para búsquedas rápidas
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_tickets_email ON tickets(email);
            CREATE INDEX IF NOT EXISTS idx_tickets_estado ON tickets(estado);
            CREATE INDEX IF NOT EXISTS idx_tickets_payment_id ON tickets(payment_id);
            CREATE INDEX IF NOT EXISTS idx_tickets_fecha_creacion ON tickets(fecha_creacion DESC);
        `);
        
        // Insertar configuración inicial si no existe
        const configCheck = await client.query('SELECT COUNT(*) FROM config');
        if (parseInt(configCheck.rows[0].count) === 0) {
            await client.query(`
                INSERT INTO config (stock_total, stock_restante, precio_entrada, cargo_servicio_porcentaje)
                VALUES (500, 500, 25000.00, 10);
            `);
            console.log('✅ Configuración inicial creada: 500 entradas, $25.000 c/u, 10% cargo servicio');
        }
        
        console.log('✅ Base de datos PostgreSQL lista');
        
    } catch (error) {
        console.error('❌ Error al inicializar base de datos:', error);
        throw error;
    } finally {
        client.release();
    }
}

// ======================
// OPERACIONES DE TICKETS
// ======================

const ticketDB = {
    // Crear nuevo ticket
    create: async (ticketData) => {
        const client = await pool.connect();
        try {
            const id = uuidv4();
            const query = `
                INSERT INTO tickets (
                    id, nombre, email, telefono, dni, cantidad, tipo_entrada,
                    precio_unitario, subtotal, cargo_servicio, precio_total,
                    estado, usado, fecha_creacion
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
                RETURNING *;
            `;
            
            const values = [
                id,
                ticketData.nombre,
                ticketData.email,
                ticketData.telefono,
                ticketData.dni,
                ticketData.cantidad,
                ticketData.tipoEntrada || 'general',
                ticketData.precioUnitario,
                ticketData.subtotal,
                ticketData.cargoServicio,
                ticketData.precioTotal,
                'pendiente',
                false
            ];
            
            const result = await client.query(query, values);
            console.log(`✅ Ticket creado: ${id}`);
            return mapTicketFromDB(result.rows[0]);
            
        } finally {
            client.release();
        }
    },
    
    // Obtener ticket por ID
    getById: async (id) => {
        const result = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
        return result.rows.length > 0 ? mapTicketFromDB(result.rows[0]) : null;
    },
    
    // Obtener todos los tickets
    getAll: async () => {
        const result = await pool.query('SELECT * FROM tickets ORDER BY fecha_creacion DESC');
        return result.rows.map(mapTicketFromDB);
    },
    
    // Actualizar ticket
    update: async (id, updates) => {
        const client = await pool.connect();
        try {
            const fields = [];
            const values = [];
            let paramCount = 1;
            
            Object.keys(updates).forEach(key => {
                const dbKey = camelToSnake(key);
                fields.push(`${dbKey} = $${paramCount}`);
                values.push(updates[key]);
                paramCount++;
            });
            
            fields.push(`updated_at = CURRENT_TIMESTAMP`);
            values.push(id);
            
            const query = `
                UPDATE tickets 
                SET ${fields.join(', ')}
                WHERE id = $${paramCount}
                RETURNING *;
            `;
            
            const result = await client.query(query, values);
            return result.rows.length > 0 ? mapTicketFromDB(result.rows[0]) : null;
            
        } finally {
            client.release();
        }
    },
    
    // Marcar ticket como pagado
    markAsPaid: async (id, paymentId) => {
        const result = await pool.query(`
            UPDATE tickets 
            SET estado = 'pagado', 
                payment_id = $1, 
                fecha_pago = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *;
        `, [paymentId, id]);
        
        console.log(`✅ Ticket ${id} marcado como PAGADO`);
        return result.rows.length > 0 ? mapTicketFromDB(result.rows[0]) : null;
    },
    
    // Marcar ticket como usado
    markAsUsed: async (id) => {
        const result = await pool.query(`
            UPDATE tickets 
            SET usado = TRUE, 
                fecha_uso = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *;
        `, [id]);
        
        console.log(`✅ Ticket ${id} marcado como USADO`);
        return result.rows.length > 0 ? mapTicketFromDB(result.rows[0]) : null;
    },
    
    // Contar tickets por estado
    countByStatus: async (estado) => {
        const result = await pool.query(
            'SELECT COUNT(*) as count FROM tickets WHERE estado = $1',
            [estado]
        );
        return parseInt(result.rows[0].count);
    },
    
    // Obtener total de ventas
    getTotalSales: async () => {
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_ventas,
                COALESCE(SUM(cantidad), 0) as total_entradas,
                COALESCE(SUM(precio_total), 0) as total_dinero
            FROM tickets 
            WHERE estado = 'pagado';
        `);
        
        return {
            totalVentas: parseInt(result.rows[0].total_ventas),
            totalEntradas: parseInt(result.rows[0].total_entradas),
            totalDinero: parseFloat(result.rows[0].total_dinero)
        };
    }
};

// ===========================
// OPERACIONES DE CONFIGURACIÓN
// ===========================

const configDB = {
    // Obtener configuración
    get: async () => {
        const result = await pool.query('SELECT * FROM config WHERE id = 1');
        return result.rows.length > 0 ? mapConfigFromDB(result.rows[0]) : null;
    },
    
    // Actualizar stock
    updateStock: async (cantidad) => {
        const result = await pool.query(`
            UPDATE config 
            SET stock_restante = stock_restante + $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
            RETURNING *;
        `, [cantidad]);
        
        console.log(`📦 Stock actualizado: ${cantidad > 0 ? '+' : ''}${cantidad}`);
        return result.rows.length > 0 ? mapConfigFromDB(result.rows[0]) : null;
    },
    
    // Verificar si hay stock disponible
    hasStock: async (cantidad) => {
        const result = await pool.query(
            'SELECT stock_restante FROM config WHERE id = 1'
        );
        return result.rows.length > 0 && result.rows[0].stock_restante >= cantidad;
    },
    
    // Actualizar configuración completa
    update: async (updates) => {
        const client = await pool.connect();
        try {
            const fields = [];
            const values = [];
            let paramCount = 1;
            
            Object.keys(updates).forEach(key => {
                const dbKey = camelToSnake(key);
                fields.push(`${dbKey} = $${paramCount}`);
                values.push(updates[key]);
                paramCount++;
            });
            
            fields.push(`updated_at = CURRENT_TIMESTAMP`);
            
            const query = `
                UPDATE config 
                SET ${fields.join(', ')}
                WHERE id = 1
                RETURNING *;
            `;
            
            const result = await client.query(query, values);
            return result.rows.length > 0 ? mapConfigFromDB(result.rows[0]) : null;
            
        } finally {
            client.release();
        }
    }
};

// ======================
// FUNCIONES AUXILIARES
// ======================

// Convertir nombres de columnas snake_case a camelCase
function mapTicketFromDB(row) {
    return {
        id: row.id,
        nombre: row.nombre,
        email: row.email,
        telefono: row.telefono,
        dni: row.dni,
        cantidad: row.cantidad,
        tipoEntrada: row.tipo_entrada,
        precioUnitario: parseFloat(row.precio_unitario),
        subtotal: parseFloat(row.subtotal),
        cargoServicio: parseFloat(row.cargo_servicio),
        precioTotal: parseFloat(row.precio_total),
        estado: row.estado,
        usado: row.usado,
        paymentId: row.payment_id,
        whatsappLink: row.whatsapp_link,
        fechaCreacion: row.fecha_creacion,
        fechaPago: row.fecha_pago,
        fechaUso: row.fecha_uso
    };
}

function mapConfigFromDB(row) {
    return {
        id: row.id,
        stockTotal: row.stock_total,
        stockRestante: row.stock_restante,
        precioEntrada: parseFloat(row.precio_entrada),
        cargoServicioPorcentaje: row.cargo_servicio_porcentaje
    };
}

// Convertir camelCase a snake_case
function camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Cerrar conexiones (para testing o cierre graceful)
async function closeDatabase() {
    await pool.end();
    console.log('🔌 Conexión a PostgreSQL cerrada');
}

module.exports = {
    initDatabase,
    ticketDB,
    configDB,
    closeDatabase,
    pool
};
