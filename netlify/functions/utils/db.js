/**
 * GoddoY RK — utils/db.js
 * Helper de conexão com Neon PostgreSQL via DATABASE_URL do Netlify
 * O Netlify injeta DATABASE_URL automaticamente ao adicionar a integração Neon
 */
const { neon } = require('@neondatabase/serverless');

let _sql = null;

function getDb() {
    if (!_sql) {
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL não configurada. Adicione a integração Neon no painel Netlify.');
        }
        _sql = neon(process.env.DATABASE_URL);
    }
    return _sql;
}

module.exports = { getDb };
