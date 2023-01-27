require("dotenv").config();

const csv = require('csv-parser')
const fs = require('fs')
const db = require('../controllers/database');
const results = [];

var lowMax = 1;
var modMax = 2;

const LOWINDEX = 0;
const MODINDEX = 1;
const HIGHINDEX = 2;

const parseCsv = async function (filepath) {
fs.createReadStream(filepath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
        
      // convert it from list of dictionarirs to list of lists
        let listResults = [];
        for (let i = 0; i < results.length; i++) {
            listResults.push(Object.values(results[i]));
        }

        // write into sqlite database
        var i = 0;
        db.serialize(function() {
            db.run("DELETE FROM data");
            var stmt = db.prepare("INSERT INTO data (x, y, z) VALUES (?, ?, ?)");
            for (; i < listResults.length; i++) {
              // can do some server side filtering here


              // convert the z value to a number
              listResults[i][2] = Number(listResults[i][2]);

              /////////////////////////////////////////////
              let z = HIGHINDEX;
              // assign z according to the range
              if (listResults[i][2] <= lowMax) {
                z = LOWINDEX;
              } else if (listResults[i][2] <= modMax) {
                z = MODINDEX;
              }

              let x = Number(listResults[i][0]);
              let y = Number(listResults[i][1]);
              stmt.run(x, y, z);
            }
            stmt.finalize((err) => {
              if (err) {
                console.error(err);
              }
            });
        });
        console.log("Inserted " + i + " rows into database");
        // console.log(listResults);
    });
}

module.exports = parseCsv;