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

const app = express();
app.use(express.json());
app.use(cors());
app.use(fileupload());
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));
// app.use(
// 	session({
// 		secret: uuidv4(),
// 		resave: false,
// 		saveUninitialized: true,
// 	})
// );

app.use(methodOverride());
app.use(cookieParser());

// postgres session store
const Client = require("./controllers/database").Client;
app.use(session({
  store: new pgSession({
    // pool : process.env.DB_URI,     // Connection pool
    conString : process.env.DB_URI,   // Connect using something else than default DATABASE_URL env variable
    tableName : 'session',            // Use another table-name than the default "session" one
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

app.get("/data/dummy", async function (req, res, next) {
	fs.readFile(process.env.DUMMY_DATA, "utf-8", (err, data) => {
		if (err) {
			console.error(err);
			return res.status(500).send("Couldn't read file");
		}
		return res.status(200).json(JSON.parse(data));
	});
});

app.get("/data/all", async function (req, res, next) {
  // from postrges database
  db.query("SELECT * FROM data", [], async (err, result) => {
    if (err) {
      console.error("error running query", q, err);
      return res.status(500).send("Couldn't read file");
    }
    return res.status(200).json(result.rows);
  });
});

app.post("/data", async function (req, res, next) {
	const { topLeft, bottomRight } = req.body;
	// console.table({ topLeft, bottomRight });
	if (!topLeft || !bottomRight) {
		return res.status(400).send("Bad Request");
	}

  // from postrges database
  // filter on x and y in the range of topLeft and bottomRight
  const q = "SELECT * FROM data WHERE x BETWEEN $1 AND $2 AND y BETWEEN $3 AND $4";
  const values = [topLeft.x, bottomRight.x, topLeft.y, bottomRight.y];
  db.query(q, values, (err, result) => {
    if (err) {
      console.error("error running query", q, err);
      return res.status(500).send("Couldn't read file");
    }
    return res.status(200).json(result.rows);
  });
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
	if (!req.files || Object.keys(req.files).length === 0) {
		return res.status(400).send("No files were uploaded.");
	}

	const file = req.files.csv;
	console.log(file.name + " received");

	if (path.extname(file.name) != ".csv") {
		return res.status(400).send("Please upload csv files only");
	}

	const thresholds = { low_min, low_max, med_min, med_max, high_min, high_max } = req.body;
	console.log(thresholds);

	const filepath = path.join(__dirname, "/uploads/", file.name);

	file.mv(filepath, function (err, result) {
		if (err) {
			console.log(err);
			console.log("Couldn't save the file");
			return res.status(500).send("Couldn't save the file");
		}

		require("./utils/csvParser")(filepath, thresholds);

		return res.status(200).send(file.name + " File Upload Successful");
	});
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