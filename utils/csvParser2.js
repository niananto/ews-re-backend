const csv = require("csv-parser");
const fs = require("fs");
const db = require("../controllers/database").db;
const results = [];

const LOWINDEX = 0;
const MEDINDEX = 1;
const HIGHINDEX = 2;

// open a csv file in write mode
const writeStream = fs.createWriteStream("data/filtered.csv");
let dataLength = 0;
let ignoreCount = 0;

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

			writeStream.write(x + ',' + y + ',' + z + '\n');
		})
		.on("end", () => {

			console.log("Data Length: " + dataLength);
			console.log("Ignored: ", ignoreCount);
		});
};

// delete the entries of 'data' table if exists
db.query('DELETE FROM data');

// COPY the data from 
q = `COPY data from 'data/filtered.csv' DELIMITER ','`;
db.query(q)
// gives this error -
// must be superuser or a member of the pg_read_server_files role to COPY from a file

module.exports = parseCsv;
