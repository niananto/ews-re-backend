require("dotenv").config();

const csv = require('csv-parser')
const fs = require('fs')
const results = [];

const parseCsv = function (filepath) {
fs.createReadStream(filepath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
        // console.log(results);
        // write into file
        fs.writeFile(process.env.PROCESSED_CSV, JSON.stringify(results, null, ' '), function (err) {
            if (err) return console.log(err);
        });
    });
}

module.exports = parseCsv;