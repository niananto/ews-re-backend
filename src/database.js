const sqlite3 = require("sqlite3").verbose();
const md5 = require("md5");
const DBSOURCE = "db.sqlite";
// const DBSOURCE = ":memory:"

const db = new sqlite3.Database(DBSOURCE, (err) => {
	if (err) {
		// Cannot open database
		return console.error(err.message);
	} else {
		console.log("Connected to the SQLite database.");
		db.run(
			`CREATE TABLE data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            x number,
            y number, 
            z number, 
            CONSTRAINT x_y_unique UNIQUE (x, y)
            )`,
			(err) => {
				if (err) {
					// Table already created
					console.log(err);
				} else {
					// Table just created, creating some rows
					// var insert = 'INSERT INTO user (name, email, password) VALUES (?,?,?)';
					// db.run(insert, ["admin","admin@example.com",md5("admin123456")]);
					// db.run(insert, ["user","user@example.com",md5("user123456")]);
				}
			}
		);
	}
});

module.exports = db;
