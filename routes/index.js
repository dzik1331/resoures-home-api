var express = require('express');
var router = express.Router();
var _ = require('lodash');
var fs = require("fs");
var pgp = require('pg-promise')(/*options*/)
var db = pgp('postgres://postgres:Qwert!2345@localhost:5432/books-list')
// var db = pgp('postgres://p1069_words:Qwert!2345@pgsql15.mydevil.net:5432/p1069_words')


router.get('/list', function (req, res, next) {
    var sql = "SELECT b.title, b.author, b.img, t.name AS type, b.date FROM book AS b LEFT JOIN types AS t ON t.id = b.type;";
    db.query(sql)
        .then(function (data) {
            console.log('DATA:', data)
            res.json(data);
        })
        .catch(function (error) {
            console.log('ERROR:', error)
        })
});

router.get('/types', function (req, res, next) {
    var sql = "SELECT id, name from types";
    db.query(sql)
        .then(function (data) {
            console.log('DATA:', data)
            res.json(data);
        })
        .catch(function (error) {
            console.log('ERROR:', error)
        })
});

router.post('/add', function (req, res, next) {
    console.log(req.body)
    var data = req.body;
    var sql = "INSERT INTO public.book(title, author, date, type, img) VALUES ($1, $2, $3, $4, $5)";
    db.query(sql,[data.title, data.author, new Date(), data.type, data.image.filename])
        .then(function (data) {
            res.json('OK');
        })
        .catch(function (error) {
            console.log('ERROR:', error)
        })

    fs.writeFile("public/images/" + req.body.image.filename, req.body.image.value, 'base64', function (err) {
        console.log(err);
    });
});

router.post('/upload', function (req, res, next) {
    // console.log(req)
    console.log(req.files)
    console.log(res.files)
    res.json({test: 123});
});

module.exports = router;
