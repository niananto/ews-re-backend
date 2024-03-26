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

const q1 = `CREATE TABLE waterlevel_links (
  water_level NUMERIC PRIMARY KEY,
  url VARCHAR(255) NOT NULL
)`
db.query(q1, [], (err, result) => {
  if (err) {
    return console.error("waterlevel_links table already exists");
  }
  console.log("waterlevel_links table created");
});

// const q2 = `CREATE TABLE default_links (
//   updated_on TIMESTAMP PRIMARY KEY DEFAULT NOW(),
//   url VARCHAR(255) NOT NULL
// )`
// db.query(q2, [], (err, result) => {
//   if (err) {
//     return console.error("default_links table already exists");
//   }
//   console.log("default_links table created");
// });

const q3 = `CREATE TABLE annual_links (
  year INTEGER,
  risk_level INTEGER,
  url VARCHAR(255) NOT NULL,
  PRIMARY KEY (year, risk_level)
)`
db.query(q3, [], (err, result) => {
  if (err) {
    return console.error("annual_links table already exists");
  }
  console.log("annual_links table created");
});

module.exports.db = db;
module.exports.Client = Client;