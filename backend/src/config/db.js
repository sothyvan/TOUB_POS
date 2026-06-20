import { Sequelize } from 'sequelize';
import mysql from 'mysql2/promise';

const host = process.env.DB_HOST || 'localhost';
const port = Number(process.env.DB_PORT) || 3306;
const user = process.env.DB_USER || 'root';
const password = process.env.DB_PASSWORD || '';
const database = process.env.DB_NAME || 'toub_pos';

/**
 * Ensures that the target database exists by creating it if necessary.
 */
export async function ensureDatabaseExists() {
  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
  });
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
  await connection.end();
}

const sequelize = new Sequelize(database, user, password, {
  host,
  port,
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? (msg) => console.log(`[sequelize] ${msg}`) : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    // Add timestamps automatically (createdAt, updatedAt)
    timestamps: true,
    // Use snake_case for field names in database
    underscored: true,
  },
});

//-----------Temporary create pool and will be get rid of when repos pseng pseng bos yg done migration to Sequelize all sen-------------------------------------------

// Create a mysql2 pool for backward compatibility with raw query execute() calls
const mysqlPool = mysql.createPool({
  host,
  port,
  user,
  password,
  database,
  waitForConnections: true,
  connectionLimit: 10,
});

// Bind execute to sequelize so it can be imported as pool and call pool.execute()
sequelize.execute = mysqlPool.execute.bind(mysqlPool);

//----------------------------------------------------------------

export default sequelize;
