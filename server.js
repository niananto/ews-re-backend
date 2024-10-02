require("dotenv").config();

const express = require("express");
const res = require("express/lib/response");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const fileupload = require("express-fileupload");
const bodyparser = require("body-parser");
const session = require("express-session");
const { v4: uuidv4 } = require("uuid");

const methodOverride = require("method-override");
const cookieParser = require("cookie-parser");
const pgSession = require("connect-pg-simple")(session);

const swaggerUI = require("swagger-ui-express");

const router = require("./router");
const db = require("./controllers/database").db;

// firebase
const storage = require("./controllers/firebase").storage;
const getStorage = require("firebase/storage").getStorage;
const ref = require("firebase/storage").ref;
const getDownloadURL = require("firebase/storage").getDownloadURL;
const uploadBytesResumable = require("firebase/storage").uploadBytesResumable;
const uploadBytes = require("firebase/storage").uploadBytes;

const app = express();
app.use(express.json());
app.use(cors());
app.use(fileupload());
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));

app.use(methodOverride());
app.use(cookieParser());

// postgres session store
const Client = require("./controllers/database").Client;
app.use(session({
	store: new pgSession({
		// pool : process.env.DB_URI,     // Connection pool
		conString: process.env.DB_URI,   // Connect using something else than default DATABASE_URL env variable
		tableName: 'session',            // Use another table-name than the default "session" one
		createTableIfMissing: true,
	}),
	secret: uuidv4(),
	resave: true,
	saveUninitialized: true,
	cookie: { maxAge: 1 * 24 * 60 * 60 * 1000 } // 1 day
	// Insert express-session options here
}));


const swaggerDocument = require("./api/openapi.json");
const { createTracing } = require("trace_events");
// const swaggerCSS = fs.readFileSync((process.cwd()+"/api/openapi.css"), 'utf8');
// app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerDocument, {customCss: swaggerCSS}));
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerDocument));

app.use("/route", router);

// app.set('views', __dirname + '/views');
app.set("view engine", "ejs");

// load static assets
app.use("/styles", express.static(path.join(__dirname, "styles")));

////////////////////////////////////////////////

app.get("/", function (req, res, next) {
	res.render("index", { title: "Water Level Marked" });
});

app.get("/link", async function (req, res, next) {
	const { waterLevel, year } = req.query;

	// get the low, moderate, and high risk level links for the latest year
	if (!waterLevel && !year) {

		// get a list of the years
		const q1 = "SELECT DISTINCT year FROM annual_links ORDER BY year DESC";
		db.query(q1, [], (err1, result1) => {

			if (err1) {
				console.error("error running query", q1, err1);
				return res.status(500).send("Couldn't read file");
			}
			if (result1.rows.length === 0) {
				return res.status(404).send("No entry found");
			}
			
			// return the low, moderate, and high risk level links for the latest year
			const q2 = "SELECT * FROM annual_links WHERE year = (SELECT MAX(year) FROM annual_links) ORDER BY risk_level ASC";
			db.query(q2, [], (err2, result2) => {
				if (err2) {
					console.error("error running query", q2, err2);
					return res.status(500).send("Couldn't read file");
				}
				if (result2.rows.length === 0) {
					return res.status(404).send("No entry found");
				}
				
				r = {
					years: result1.rows.map((row) => row.year),
					year: result2.rows[0].year,
					low: result2.rows[0].url,
					mod: result2.rows[1].url,
					high: result2.rows[2].url
				}

				return res.status(200).json(r);
				
			});

		});
	}

	// get the low, moderate, and high risk level links for the specified year
	else if (year) {
		const q = "SELECT * FROM annual_links WHERE year = $1 ORDER BY risk_level ASC";
		const params = [year];
		db.query(q, params, (err, result) => {
			if (err) {
				console.error("error running query", q, err);
				return res.status(500).send("Couldn't read file");
			}
			if (result.rows.length === 0) {
				return res.status(404).send("No entry found");
			}
			
			r = {
				year: result.rows[0].year,
				low: result.rows[0].url,
				mod: result.rows[1].url,
				high: result.rows[2].url
			}

			return res.status(200).json(r);
		});
	}

	// get the link for the specified water level irrespective of the year
	else {
		const q = "SELECT * FROM waterlevel_links ORDER BY abs(water_level - $1) ASC LIMIT 1";
		const params = [waterLevel];
		db.query(q, params, (err, result) => {
			if (err) {
				console.error("error running query", q, err);
				return res.status(500).send("Couldn't read file");
			}
			if (result.rows.length === 0) {
				return res.status(404).send("No entry found");
			}
			return res.status(200).json(result.rows[0]);
		});
	}
});

app.get("/admin", function (req, res, next) {
	// res.sendFile(__dirname + "/views/adminLogin.html");
	res.render("login", { title: "Admin Login" });
});

app.get("/admin/upload", function (req, res, next) {
	if (req.session.user) {
		res.render("upload", { title: "CSV Upload" });
	} else {
		res.status(400).send("Unauthorized");
	}
});

app.post("/admin/upload", async function (req, res, next) {
	let annualYear = req.body.year;
	let annualLow = req.files.low_json;
	let annualMedium = req.files.mod_json;
	let annualHigh = req.files.high_json;

	// handle annual erosion risk files
	if (annualYear && annualLow && annualMedium && annualHigh) {
		files = { low: annualLow, mod: annualMedium, high: annualHigh };
		for (const riskLevel of Object.keys(files)) {
			file = files[riskLevel];

			// upload file to firebase
			const filename = annualYear + "_" + riskLevel + ".json";
			const storageRef = ref(storage, `annual_risks/${filename}`);
			const uploadTask = uploadBytesResumable(storageRef, file.data, { contentType: "application/json" });
			uploadTask.on("state_changed",
				(snapshot) => {
					const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
					console.log(`Upload ${filename} is ${progress}% done`);
				},
				(error) => {
					console.error(error);
				}
			);

			// get the url and save into the database
			uploadTask.then((snapshot) => {
				getDownloadURL(snapshot.ref).then((downloadURL) => {
					console.log("File available at", downloadURL);

					const q = "INSERT INTO annual_links (year, risk_level, url) VALUES ($1, $2, $3) ON CONFLICT (year, risk_level) DO UPDATE SET url = $3";
					const values = [annualYear, 
									riskLevel === "low" ? 0 : riskLevel === "mod" ? 1 : 2,
									downloadURL];
					db.query(q, values, (err, result) => {
						if (err) {
							console.error("error running query", q, err);
							return res.status(500).send("Couldn't read file");
						}
					});
				});
			});
		}
		return res.status(200).send("Files uploaded");
	}

	let waterLevelFiles = req.files.batch_json;

	if (!waterLevelFiles || waterLevelFiles.length === 0) {
		return res.status(400).send("No files were uploaded.");
	}
	
	// if one file is uploaded, make it an array
	if (!Array.isArray(waterLevelFiles)) {
		waterLevelFiles = [waterLevelFiles];
	}

	for (const file of waterLevelFiles) {
		if (file.name.split(".").pop() !== "json") {
			return res.status(400).send("Only JSON files are allowed.");
		}
	}

	// handle water level files
	if (waterLevelFiles.length > 0) {
		db.query("DELETE FROM waterlevel_links", [], async (err, result) => {
			if (err) {
				console.error("error deleting from waterlevel_links table", err);
			}
		});
	}

	for (const file of waterLevelFiles) {

		// get water level from file name
		const waterLevel = file.name.replace(".json", "");

		// upload file to firebase
		const filename = waterLevel + ".json";
		const storageRef = ref(storage, `waterlevel_risks/${filename}`);
		const uploadTask = uploadBytesResumable(storageRef, file.data, { contentType: "application/json" });
		uploadTask.on("state_changed",
			(snapshot) => {
				const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
				console.log(`Upload ${filename} is ${progress}% done`);
			},
			(error) => {
				console.error(error);
			}
		);

		// get the url and save into the database
		uploadTask.then((snapshot) => {
			getDownloadURL(snapshot.ref).then((downloadURL) => {
				console.log("File available at", downloadURL);

				const q = "INSERT INTO waterlevel_links (water_level, url) VALUES ($1, $2)";
				const values = [waterLevel, downloadURL];
				db.query(q, values, (err, result) => {
					if (err) {
						console.error("error running query", q, err);
						return res.status(500).send("Couldn't read file");
					}
				});
			});
		});
	}

	res.status(200).send("Files uploaded");
});

// Default response for any other request
app.use(function (req, res) {
	res.status(404);
});

/////////////////////////////////////////////////

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', function () {
	console.log(`server started at http://localhost:${PORT}`);
});