require("dotenv").config();

const csv = require("csv-parser");
const fs = require("fs");
const db = require("../controllers/database").db;
const results = [];

var lowMax = -3.837142698;
var modMax = 5.816343068;

const LOWINDEX = 0;
const MODINDEX = 1;
const HIGHINDEX = 2;

const parseCsv = async function (filepath) {
	fs.createReadStream(filepath)
		.pipe(csv())
		.on("data", (data) => results.push(data))
		.on("end", () => {
			// convert it from list of dictionarirs to list of lists
			let listResults = [];
			for (let i = 0; i < results.length; i++) {
				listResults.push(Object.values(results[i]));
			}

			// write into postrges database
			db.query("DELETE FROM data");
			var q =	"INSERT INTO data (x, y, z) VALUES ($1, $2, $3)";

      var i = 0;
      var errorCount = 0;
			for (; i < listResults.length; i++) {
				// can do some server side filtering here

				// convert the z value to a number
				listResults[i][2] = Number(listResults[i][2]);

				let z = HIGHINDEX;
				// assign z according to the range
				if (listResults[i][2] <= lowMax) {
					z = LOWINDEX;
				} else if (listResults[i][2] <= modMax) {
					z = MODINDEX;
				}

				let x = Number(listResults[i][0]);
				let y = Number(listResults[i][1]);
				db.query(q, [x, y, z], async (err, result) => {
          if (err) {
            console.error(err);
            errorCount++;
          }
        });
			}

			console.log("Inserted " + (i-errorCount) + " rows into database");
		});
};

module.exports = parseCsv;
