require("dotenv").config();

var router = require("express-promise-router")();

router.post("/login", function (req, res, next) {
    // console.log(req.body);
    if (req.body.username == process.env.ADMIN_USERNAME && req.body.password == process.env.ADMIN_PASSWORD) {
        req.session.user = req.body.username;
        res.redirect("/admin/upload");
    } else {
        res.status(400).send("Invalid username or password");
    }
});

router.get("/logout", function (req, res, next) {
    req.session.destroy( function (err) {
        if (err) {
            console.log(err);
            res.status(500).send("Error occurred");
        } else {
            res.redirect("/admin");
        }
    })
});

module.exports = router;
