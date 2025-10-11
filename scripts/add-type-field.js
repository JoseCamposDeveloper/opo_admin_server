// Script para agregar el campo 'type' a todos los topics
// Ejecutar con: node add-type-field.js [DB_URL]
// Ejemplo: node add-type-field.js "mongodb+srv://user:pass@cluster.mongodb.net/opo"

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

async function addTypeField() {
    // Intentar obtener DB_URL de múltiples fuentes
    let uri = process.argv[2]; // Desde argumento de línea de comandos
    
    if (!uri) {
        // Intentar leer del archivo .env
        try {
            const envPath = path.join(__dirname, '..', '.env');
            const envContent = fs.readFileSync(envPath, 'utf8');
            const dbUrlMatch = envContent.match(/DB_URL=(.+)/);
            const mongoUrlMatch = envContent.match(/MONGO_URL=(.+)/);
            uri = (dbUrlMatch && dbUrlMatch[1]) || (mongoUrlMatch && mongoUrlMatch[1]);
        } catch (error) {
            // Archivo .env no encontrado o error leyéndolo
        }
    }
    
    if (!uri) {
        uri = process.env.DB_URL || process.env.MONGO_URL;
    }

    if (!uri) {
        console.error('❌ Error: No se encontró DB_URL');
        console.log('\n💡 Ejecuta el script de una de estas formas:');
        console.log('   1. node add-type-field.js "mongodb+srv://user:pass@cluster.mongodb.net/opo"');
        console.log('   2. Configura DB_URL en el archivo .env');
        console.log('   3. Configura la variable de entorno DB_URL');
        process.exit(1);
    }
    
    const dbName = process.env.DB_NAME || 'opo';

    console.log('🔗 Conectando a MongoDB...');
    console.log(`📦 Base de datos: ${dbName}`);
    
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('✅ Conectado a MongoDB');

        const database = client.db(dbName);
        const collection = database.collection('topics_uuid_map');

        // Contar documentos sin el campo type
        const countWithoutType = await collection.countDocuments({ 
            type: { $exists: false } 
        });
        console.log(`\n📊 Topics sin campo 'type': ${countWithoutType}`);

        if (countWithoutType === 0) {
            console.log('✅ Todos los topics ya tienen el campo type definido');
            return;
        }

        // Actualizar todos los documentos que no tienen el campo type
        // Por defecto, asignamos "topic" a todos
        const result = await collection.updateMany(
            { type: { $exists: false } },
            { $set: { type: 'topic' } }
        );

        console.log(`\n✅ Operación completada:`);
        console.log(`   - Documentos encontrados: ${result.matchedCount}`);
        console.log(`   - Documentos actualizados: ${result.modifiedCount}`);

        // Verificar el resultado
        const totalTopics = await collection.countDocuments({});
        const topicTypeTopics = await collection.countDocuments({ type: 'topic' });
        const examTypeTopics = await collection.countDocuments({ type: 'exam' });
        const miscTypeTopics = await collection.countDocuments({ type: 'misc' });

        console.log(`\n📊 Estadísticas finales:`);
        console.log(`   - Total de topics: ${totalTopics}`);
        console.log(`   - Topics tipo 'topic': ${topicTypeTopics}`);
        console.log(`   - Topics tipo 'exam': ${examTypeTopics}`);
        console.log(`   - Topics tipo 'misc': ${miscTypeTopics}`);

        // Mostrar algunos ejemplos
        console.log(`\n🔍 Ejemplos de topics actualizados:`);
        const samples = await collection.find({ type: 'topic' }).limit(5).toArray();
        samples.forEach((topic, index) => {
            console.log(`   ${index + 1}. ID: ${topic.id}, Title: ${topic.title}, Type: ${topic.type}`);
        });

        console.log(`\n💡 Nota: Todos los topics fueron inicializados con type='topic'.`);
        console.log(`   Puedes cambiar el tipo manualmente desde el panel de administración.`);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await client.close();
        console.log('\n🔌 Conexión cerrada');
    }
}

addTypeField();

