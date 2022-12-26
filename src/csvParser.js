require("dotenv").config();

const csv = require('csv-parser')
const fs = require('fs')
const db = require('./database');
const results = [];

const parseCsv = async function (filepath) {
fs.createReadStream(filepath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
        // console.log(results);
        // write into JSON file
        fs.writeFile(process.env.PROCESSED_CSV, JSON.stringify(results, null, ' '), function (err) {
            if (err) return console.log(err);
        });

        // write into sqlite database
        var i = 0;
        db.serialize(function() {
            db.run("DELETE FROM data");
            var stmt = db.prepare("INSERT INTO data (x, y, z) VALUES (?, ?, ?)");
            for (; i < results.length; i++) {
                stmt.run(results[i].x, results[i].y, results[i].z);
            }
            stmt.finalize((err) => {
              if (err) {
                console.error(err);
              }
            });
        });
        console.log("Inserted " + i + " rows into database");
    });
}

module.exports = parseCsv;