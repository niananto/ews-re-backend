require("dotenv").config();

const express = require("express");
const res = require("express/lib/response");
const router = require("express-promise-router")();
const cors = require("cors");
const fs = require("fs");

const fileupload = require("express-fileupload");

// for when I do auth
// const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
app.use(cors());
app.use(fileupload());

////////////////////////////////////////////////

router.get("/data", async function (req, res, next) {
    fs.readFile(process.env.PROCESSED_CSV, 'utf-8', (err, data) => {
        if (err) {
          console.error(err);
          return res.status(500).send("Couldn't read file");
        }
        return res.status(200).json(JSON.parse(data));
    });
});

router.post("/upload", function (req, res, next) {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    const file = req.files.csv;
    console.log(file.name);

    file.mv(__dirname+'/uploads/'+file.name, function (err, result) {
        if (err) {
            console.log(err);
            return res.status(500).send("Couldn't handle file upload");
        }
        return res.status(200).send(file.name + " File Upload Successful");
    });
});

/////////////////////////////////////////////////

app.use(router);

const PORT = process.env.PORT || 8080;

app.listen(PORT, function () {
	console.log(`server started at port ${PORT}`);
});