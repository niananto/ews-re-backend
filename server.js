require("dotenv").config();

const express = require("express");
const res = require("express/lib/response");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const fileupload = require("express-fileupload");
const bodyparser = require("body-parser");
const session = require("express-session");
const { v4:uuidv4 } = require("uuid");

const swaggerUI = require("swagger-ui-express");

const router = require('./router');

const app = express();
app.use(express.json());
app.use(cors());
app.use(fileupload());
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended : true}));
app.use(session({
    secret: uuidv4(),
    resave: false,
    saveUninitialized: true
}));

const swaggerDocument = require('./swagger.json');
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocument));

app.use('/route', router);

app.set('view engine', 'ejs');

// load static assets
app.use('/styles', express.static(path.join(__dirname, 'styles')));

////////////////////////////////////////////////

app.get("/dummy-data", async function (req, res, next) {
    fs.readFile(process.env.DUMMY_DATA, 'utf-8', (err, data) => {
        if (err) {
          console.error(err);
          return res.status(500).send("Couldn't read file");
        }
        return res.status(200).json(JSON.parse(data));
    });
});

app.get("/data", async function (req, res, next) {
    fs.readFile(process.env.PROCESSED_CSV, 'utf-8', (err, data) => {
        if (err) {
          console.error(err);
          return res.status(500).send("Couldn't read file");
        }
        return res.status(200).json(JSON.parse(data));
    });
});

app.get("/admin", function (req, res, next) {
    // res.sendFile(__dirname + "/views/adminLogin.html");
    res.render('login', {title: "Admin Login"});
});

app.get("/admin/upload", function (req, res, next) {
    if (req.session.user) {
        res.render('upload', {title: "CSV Upload"});        
    } else {
        res.status(400).send("Unauthorized");
    }
});

app.post("/admin/upload", function (req, res, next) {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    const file = req.files.csv;
    console.log(file.name);

    if (path.extname(file.name) != ".csv") {
        return res.status(400).send('Please upload csv files only');
    }

    const filepath = path.join(__dirname,'/uploads/',file.name);

    file.mv(filepath, function (err, result) {
        if (err) {
            console.log(err);
            return res.status(500).send("Couldn't handle file upload");
        }

        require('./src/csvParser')(filepath);

        return res.status(200).send(file.name + " File Upload Successful");
    });
});

/////////////////////////////////////////////////

const PORT = process.env.PORT || 8080;

app.listen(PORT, function () {
	console.log(`server started at http://localhost:${PORT}`);
});