require("dotenv").config();

const csv = require("csv-parser");
const fs = require("fs");
const db = require("../controllers/database");
let sheerStressData = db.collection("sheer-stress-data");
const results = [];

var lowMax = 1;
var modMax = 2;

const LOWINDEX = 0;
const MODINDEX = 1;
const HIGHINDEX = 2;

const parseCsv = async function (filepath) {
	fs.createReadStream(filepath)
		.pipe(csv())
		.on("data", (data) => results.push(data))
		.on("end", () => {
			// convert it from list of dictionarirs to list of lists
			let rows = [];
			for (let i = 0; i < results.length; i++) {
				rows.push(Object.values(results[i]));
			}

			// write into firestore
			// should be done in batches
			for (var i = 0; i < rows.length; i++) {
				// can do some server side filtering here

				// convert the z value to a number
				rows[i][2] = Number(rows[i][2]);

				/////////////////////////////////////////////
				let z = HIGHINDEX;
				// assign z according to the range
				if (rows[i][2] <= lowMax) {
					z = LOWINDEX;
				} else if (rows[i][2] <= modMax) {
					z = MODINDEX;
				}
				
        // convert the x and y values to numbers
        rows[i][0] = Number(rows[i][0]);
        rows[i][1] = Number(rows[i][1]);

        // write to firestore
        // db.batch().set(sheerStressData.doc(), {
        //   x: rows[i][0],
        //   y: rows[i][1],
        //   z: z,
        // });

        // single insert
        sheerStressData.doc().set({
          x: rows[i][0],
          y: rows[i][1],
          z: z,
        });
			}
      // db.batch().commit().then((res, err) => {
      //   if (err) {
      //     console.error(err);
      //   }
      
      //   console.log("Inserted " + i + " rows into database");
      //   console.log(rows);
      // });
		});
};

module.exports = parseCsv;
