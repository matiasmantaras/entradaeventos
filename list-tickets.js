const { ticketDB } = require('./database-postgres.js');
const tickets = ticketDB.getAll();
console.log('Total tickets:', tickets.length);
tickets.forEach(t => {
    console.log('---');
    console.log('ID:', t.id);
    console.log('Nombre:', t.nombre);
    console.log('Email:', t.email);
    console.log('Estado:', t.estado);
});
