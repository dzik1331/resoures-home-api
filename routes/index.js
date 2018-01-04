var express = require('express');
var router = express.Router();
var _ = require('lodash');
var fs = require("fs");
var pgp = require('pg-promise')(/*options*/)
var db = pgp('postgres://postgres:Qwert!2345@localhost:5432/resources-list')
// var db = pgp('postgres://p1069_words:Qwert!2345@pgsql15.mydevil.net:5432/p1069_words')


router.get('/list', function (req, res, next) {
    var sql = "SELECT r.id, r.title, r.author, r.img, t.name AS type, r.date, CASE WHEN COUNT(b.id) = 0 THEN false ELSE true END as \"isBorrow\" \n" +
        "FROM resources AS r \n" +
        "LEFT JOIN types AS t ON t.id = r.type\n" +
        "LEFT JOIN borrows as b on b.\"resourceId\" = r.id AND b.active\n" +
        "GROUP BY r.id, t.name, b.person"
    db.query(sql)
        .then(function (data) {
            console.log('DATA:', data)
            res.json(data);
        })
        .catch(function (error) {
            console.log('ERROR:', error)
        })
});

router.get('/get/:id', function (req, res, next) {
    console.log(req.params);
    var sendData = {details: null, borrows: []}
    var sql = "SELECT r.id, r.title, r.author, r.img, t.name AS type, r.date\n" +
        "FROM resources AS r\n" +
        "LEFT JOIN types AS t ON t.id = r.type\n" +
        "WHERE r.id = $1";

    var sql2 = "SELECT b.id, b.active, b.person, b.\"borrowDate\", b.\"returnDate\"\n" +
        "FROM borrows AS b\n" +
        "WHERE b.\"resourceId\" = $1";
    db.query(sql, [req.params.id])
        .then(function (data) {
            console.log('DATA:', data)
            sendData.details = data;
            db.query(sql2, [req.params.id])
                .then(function (data) {
                    console.log('DATA:', data)
                    sendData.borrows = data;
                    res.json(sendData);
                })
                .catch(function (error) {
                    console.log('ERROR:', error)
                })
        })
        .catch(function (error) {
            console.log('ERROR:', error)
            res.json(sendData);
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
    var sql = "INSERT INTO public.resources(title, author, date, type, img) VALUES ($1, $2, $3, $4, $5)";
    db.query(sql, [data.title, data.author, new Date(), data.type, data.image.filename])
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

router.post('/addBorrow', function (req, res, next) {
    console.log(req.body)
    var data = req.body;
    var sql = "INSERT INTO public.borrows(active, \"resourceId\", person, \"borrowDate\") VALUES ($1, $2, $3, $4)";
    db.query(sql, [true, data.resourceId, data.person, new Date()])
        .then(function (data) {
            res.json('OK');
        })
        .catch(function (error) {
            console.log('ERROR:', error)
        })
});

router.get('/isReturn/:id', function (req, res, next) {
    console.log(req.body)
    var data = req.body;
    var sql = "UPDATE public.borrows\n" +
        "SET \"active\"= false, \"returnDate\"=$1\n" +
        "WHERE id = $2;";
    db.query(sql, [new Date(), req.params.id])
        .then(function (data) {
            res.json('OK');
        })
        .catch(function (error) {
            console.log('ERROR:', error)
        })
});

module.exports = router;
