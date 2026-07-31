import { Sequelize } from 'sequelize'; // used for orm and sync model to db
import mysql from 'mysql2/promise'; // used for raw query
import { getDatabaseTlsOptions } from './database-tls.js';

const host = process.env.DB_HOST;
const port = Number(process.env.DB_PORT);
const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const database = process.env.DB_NAME;
const databaseTlsOptions = getDatabaseTlsOptions();

/**
 * Ensures that the target database exists by creating it if necessary.
 */
export async function ensureDatabaseExists() {
  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    ...(databaseTlsOptions ? { ssl: databaseTlsOptions } : {}),
  });
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
  await connection.end();
}

const sequelize = new Sequelize(database, user, password, {
  host,
  port,
  dialect: 'mysql',
  logging: false,
  dialectOptions: databaseTlsOptions ? { ssl: databaseTlsOptions } : {},
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



export default sequelize;
