const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'servicio_comunitario'
});

db.connect(err => {
    if (err) {
        console.error('❌ Error al conectar a MySQL:', err.message);
        console.error('Por favor, asegúrate de que MySQL en XAMPP esté corriendo y que la base de datos "servicio_comunitario" exista.');
        process.exit(1);
    }
    console.log('✅ Conectado a MySQL');
    
    const queries = [
        // 1. Modificar tabla personas
        `ALTER TABLE personas 
         CHANGE COLUMN stock_pequenas stock_10kg int(11) DEFAULT 0,
         CHANGE COLUMN stock_medianas stock_18kg int(11) DEFAULT 0,
         CHANGE COLUMN stock_grandes stock_27kg int(11) DEFAULT 0,
         ADD COLUMN stock_43kg int(11) DEFAULT 0`,
         
        // 2. Modificar tabla registro_bombonas
        `ALTER TABLE registro_bombonas 
         CHANGE COLUMN bombonas_pequenas bombonas_10kg int(11) DEFAULT 0,
         CHANGE COLUMN bombonas_medianas bombonas_18kg int(11) DEFAULT 0,
         CHANGE COLUMN bombonas_grandes bombonas_27kg int(11) DEFAULT 0,
         ADD COLUMN bombonas_43kg int(11) DEFAULT 0`,
         
        // 3. Modificar tabla pagos_bombonas
        `ALTER TABLE pagos_bombonas 
         CHANGE COLUMN cant_peq cant_10kg int(11) DEFAULT 0,
         CHANGE COLUMN cant_med cant_18kg int(11) DEFAULT 0,
         CHANGE COLUMN cant_gra cant_27kg int(11) DEFAULT 0,
         ADD COLUMN cant_43kg int(11) DEFAULT 0`
    ];
    
    let current = 0;
    
    function executeNext() {
        if (current >= queries.length) {
            console.log('🎉 Migración completada exitosamente.');
            db.end();
            process.exit(0);
        }
        
        console.log(`Ejecutando consulta ${current + 1}...`);
        db.query(queries[current], (err) => {
            if (err) {
                console.warn(`⚠️ Advertencia/Error en consulta ${current + 1} (puede ser que las columnas ya se modificaron):`, err.message);
            } else {
                console.log(`✅ Consulta ${current + 1} ejecutada con éxito.`);
            }
            current++;
            executeNext();
        });
    }
    
    executeNext();
});
