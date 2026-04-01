import { Pool } from 'pg'

const pool = new Pool({
    host    : 'localhost',
    port    : 5432,
    database: 'nebaraska_db',       // your db name
    user    : 'postgres',           // your pgAdmin username
    password: 'alina_neb_098_123098', // your pgAdmin password
})

export default pool