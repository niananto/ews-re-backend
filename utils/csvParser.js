require("dotenv").config();

const csv = require("csv-parser");
const fs = require("fs");
const db = require("../controllers/database").db;
const results = [];

const LOWINDEX = 0;
const MEDINDEX = 1;
const HIGHINDEX = 2;

const parseCsv = async function (filepath, thresholds) {
	fs.createReadStream(filepath)
		.pipe(csv())
		.on("data", (data) => results.push(data))
		.on("end", () => {

			console.log("Data Length: " + results.length);

			// convert it from list of dictionarirs to list of lists
			let listResults = [];
			for (let i = 0; i < results.length; i++) {
				listResults.push(Object.values(results[i]));
			}

			// write into postrges database
			db.query("DELETE FROM data");
			var q =	"INSERT INTO data (x, y, z) VALUES ($1, $2, $3)";

      var i = 0;
			var ignoreCount = 0;
      var errorCount = 0;
			for (; i < listResults.length; i++) {
				// can do some server side filtering here

				// convert the z value to a number
				listResults[i][2] = Number(listResults[i][2]);

				// assign z according to the range
				let z;
				if (listResults[i][2] > thresholds.low_min && listResults[i][2] <= thresholds.low_max) {
					z = LOWINDEX;
				} else if (listResults[i][2] > thresholds.med_min && listResults[i][2] <= thresholds.med_max) {
					z = MEDINDEX;
				} else if (listResults[i][2] > thresholds.high_min && listResults[i][2] <= thresholds.high_max) {
					z = HIGHINDEX;
				} else {
					ignoreCount++;
					continue;
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

			console.log("Inserted " + (i-ignoreCount-errorCount) + " rows into database");
		});
};

module.exports = parseCsv;
