const csv = require("csv-parser");
const res = require("express/lib/response");
const fs = require("fs");
const db = require("../controllers/database").db;

const LOWINDEX = 0;
const MEDINDEX = 1;
const HIGHINDEX = 2;

// open a csv file in write mode
let dataLength = 0;
let ignoreCount = 0;
let results = ''

const parseCsv = async function (filepath, thresholds) {
	fs.createReadStream(filepath)
		.pipe(csv())
		.on("data", (data) => {
			dataLength++;
			
			// get the keys names
			const values = Object.values(data)
			const x = values[0]
			const y = values[1]
			const old_z = Number(values[2])

			// assign z according to the range
			let z;
			if (old_z > thresholds.low_min && old_z <= thresholds.low_max) {
				z = LOWINDEX;
			} else if (old_z > thresholds.med_min && old_z <= thresholds.med_max) {
				z = MEDINDEX;
			} else if (old_z > thresholds.high_min && old_z <= thresholds.high_max) {
				z = HIGHINDEX;
			} else {
				ignoreCount++;
				return;
			}

			if (dataLength != 1)
				results += ','
			
			results += '(' + x + ',' + y + ',' + z + ')'
		})
		.on("end", () => {

			results = results
			db.query('DELETE FROM data');
			q = "INSERT INTO data (x, y, z) VALUES " + results;
			db.query(q);

			console.log("Data Length: " + dataLength);
			console.log("Ignored: ", ignoreCount);
		});
};

module.exports = parseCsv;
