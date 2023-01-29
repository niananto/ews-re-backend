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

const swaggerUI = require("swagger-ui-express");

const router = require("./router");
const db = require("./controllers/database");

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

// express session with sqlite
const SQLiteStore = require('connect-sqlite3')(session);
// app.set('views', __dirname + '/views');
// app.set('view engine', 'ejs');
// app.use(express.bodyParser());
// app.use(express.methodOverride());
// app.use(express.cookieParser());
app.use(session({
  store: new SQLiteStore,
  secret: uuidv4(),
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 1 week
}));


const swaggerDocument = require("./api/openapi.json");
// const swaggerCSS = fs.readFileSync((process.cwd()+"/api/openapi.css"), 'utf8');
// app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerDocument, {customCss: swaggerCSS}));
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerDocument));

app.use("/route", router);

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
  // from sqlite database
  db.all("SELECT * FROM data", function (err, rows) {
    if (err) {
      console.error(err);
      return res.status(500).send("Couldn't read file");
    }
    return res.status(200).json(rows);
  });
});

app.post("/data", async function (req, res, next) {
	const { topLeft, bottomRight } = req.body;
	// console.table({ topLeft, bottomRight });
	if (!topLeft || !bottomRight) {
		return res.status(400).send("Bad Request");
	}

  // from sqlite database
  // filter on x and y in the range of topLeft and bottomRight
  db.all("SELECT * FROM data WHERE x BETWEEN ? AND ? AND y BETWEEN ? AND ?",
              [topLeft.x, bottomRight.x, topLeft.y, bottomRight.y], function (err, rows) {
    if (err) {
      console.error(err);
      return res.status(500).send("Couldn't read file");
    }
    return res.status(200).json(rows);
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
	console.log(file.name);

	if (path.extname(file.name) != ".csv") {
		return res.status(400).send("Please upload csv files only");
	}

	const filepath = path.join(__dirname, "/uploads/", file.name);

	file.mv(filepath, function (err, result) {
		if (err) {
			console.log(err);
			return res.status(500).send("Couldn't handle file upload");
		}

		require("./utils/csvParser")(filepath);

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