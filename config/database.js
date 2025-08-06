const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 's41_phoenix',
    port: process.env.DB_PORT || 3306,
    charset: 'utf8mb4',
    connectionLimit: 10,
    queueLimit: 0
};

let connection;

async function connectToDatabase() {
    try {
        if (connection) {
            // Test existing connection
            await connection.ping();
            return connection;
        }

        console.log(`Connecting to database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL database successfully');
        return connection;
    } catch (error) {
        console.error('Database connection failed:', error.message);

        if (error.code === 'ECONNREFUSED') {
            console.log('\n🔧 Database connection refused:');
            console.log('1. Ensure MySQL/MariaDB is running');
            console.log('2. Check if the database server is accessible');
            console.log(`3. Verify connection details: ${dbConfig.host}:${dbConfig.port}`);
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('\n🔧 Database access denied:');
            console.log('1. Check database username and password in .env');
            console.log('2. Ensure the user has access to the database');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.log('\n🔧 Database does not exist:');
            console.log(`1. Create the database "${dbConfig.database}"`);
            console.log('2. Import the database schema');
        }

        connection = null;
        throw error;
    }
}

async function getConnection() {
    try {
        if (!connection) {
            await connectToDatabase();
        } else {
            // Test the connection
            await connection.ping();
        }
        return connection;
    } catch (error) {
        console.log('Connection lost, attempting to reconnect...');
        connection = null;
        await connectToDatabase();
        return connection;
    }
}

module.exports = {
    connectToDatabase,
    getConnection
};
