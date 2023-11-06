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
	const { waterLevel } = req.query;
	if (!waterLevel) {

		// return the default link, closest to the current date
		const q = "SELECT * FROM default_links ORDER BY abs(extract(epoch from updated_on) - extract(epoch from now())) ASC LIMIT 1";
		db.query(q, [], (err, result) => {
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
	else {

		const q = "SELECT * FROM links ORDER BY abs(water_level - $1) ASC LIMIT 1";
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
	let files = req.files.batch_json;

	// if one file is uploaded, make it an array
	if (!Array.isArray(files)) {
		files = [files];
	}

	if (!files || files.length === 0) {
		return res.status(400).send("No files were uploaded.");
	}

	for (const file of files) {
		if (file.name.split(".").pop() !== "json") {
			return res.status(400).send("Only JSON files are allowed.");
		}
	}

	// get the files with name "Annual_Erosion_Risk.json"
	const annualErosionRiskFiles = files.filter(file => file.name === "Annual_Erosion_Risk.json");
	if (annualErosionRiskFiles.length > 0) {
		for (const file of annualErosionRiskFiles) {
			
			// upload file to firebase
			const filename = (new Date()).toISOString() + ".json";
			const storageRef = ref(storage, `default_links/${filename}`);
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

					const q = "INSERT INTO default_links (url) VALUES ($1)";
					const values = [downloadURL];
					db.query(q, values, (err, result) => {
						if (err) {
							console.error("error running query", q, err);
							return res.status(500).send("Couldn't read file");
						}
					});
				});
			});
		}
	}

	// check if there are other files than "Annual_Erosion_Risk.json"
	const otherFiles = files.filter(file => file.name !== "Annual_Erosion_Risk.json");
	if (otherFiles.length > 0) {
		db.query("DELETE FROM links", [], async (err, result) => {
			if (err) {
				console.error("error deleting from links table", err);
			}
		});
	}

	for (const file of otherFiles) {

		// get water level from file name
		const waterLevel = file.name.replace(".json", "");

		// upload file to firebase
		const filename = waterLevel + "_" + (new Date()).toISOString() + ".json";
		const storageRef = ref(storage, `water-level-marked/${filename}`);
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

				const q = "INSERT INTO links (water_level, url) VALUES ($1, $2)";
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

const PORT = process.env.PORT || 8080;

app.listen(PORT, function () {
	console.log(`server started at http://localhost:${PORT}`);
});