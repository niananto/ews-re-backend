require('dotenv').config({ path: '../.env' });
const { Client, Pool } = require('pg');

const conString = process.env.DB_URI;
const db = new Client({
  connectionString: conString,
  ssl: {
    rejectUnauthorized: false
  }
});
db.connect(function (err) {
  if (err) {
    return console.error('could not connect to postgres', err);
  }
  return console.log('connected to postgres');
});

const q1 = `CREATE TABLE links (
  water_level NUMERIC PRIMARY KEY,
  url VARCHAR(255) NOT NULL
)`
db.query(q1, [], (err, result) => {
  if (err) {
    return console.error("links table already exists");
  }
  console.log("links table created");
});

const q2 = `CREATE TABLE default_links (
  updated_on TIMESTAMP PRIMARY KEY DEFAULT NOW(),
  url VARCHAR(255) NOT NULL
)`
db.query(q2, [], (err, result) => {
  if (err) {
    return console.error("default_links table already exists");
  }
  console.log("default_links table created");
});

module.exports.db = db;
module.exports.Client = Client;