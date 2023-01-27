require('dotenv').config({ path: '../.env' });
const { Client, Pool } = require('pg');

const conString = process.env.DB_URI || 'postgres://postgres:postgres@localhost:5432/postgres';
const db = new Client(conString);
db.connect(function(err) {
  if(err) {
    return console.error('could not connect to postgres', err);
  }
  return console.log('connected to postgres');
});

const q = `CREATE TABLE data (
          id SERIAL PRIMARY KEY ,
          x FLOAT8,
          y FLOAT8, 
          z SMALLINT, 
          CONSTRAINT x_y_unique UNIQUE (x, y)
          )`
const params = [];

db.query(q, params, (err, result) => {
	if (err) {
		return console.error("Table already exists");
	}

  console.log("Table created");
});

module.exports = db;