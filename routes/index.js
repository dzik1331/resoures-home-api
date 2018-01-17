var express = require('express');
var router = express.Router();
var _ = require('lodash');
var fs = require("fs");
var pgp = require('pg-promise')(/*options*/)
var dataBaseConfig = require('../databaseConfig')
var db = pgp(`postgres://${dataBaseConfig.user}:${dataBaseConfig.password}@${dataBaseConfig.host}/${dataBaseConfig.database}`)


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
    let imageName = data.image ? data.image.filename : '';
    db.query(sql, [data.title, data.author, new Date(), data.type, imageName])
        .then(function (data) {
            res.json('OK');
        })
        .catch(function (error) {
            console.log('ERROR:', error)
        })

    if (!req.body.image) {
        fs.writeFile("public/images/" + req.body.image.filename, req.body.image.value, 'base64', function (err) {
            console.log(err);
        });
    }
});

/* EDYCJA*/
router.put('/update/:id', function (req, res, next) {
    var id = req.params.id;
    var data = req.body;
    console.log('update', data);
    var sqlParams = [];
    var imageName = data.image ? (new Date().getTime()) + data.image.filename : '';
    if (data.image) {
        console.log('Jest img')
        var sql = "UPDATE public.resources SET title = $1, author = $2, date = $3, type = $4, img = $5 WHERE id = $6;";
        sqlParams = [data.title, data.author, new Date(), data.type, imageName, id]
    } else {
        var sql = "UPDATE public.resources SET title = $1, author = $2, date = $3, type = $4 WHERE id = $5;";
        sqlParams = [data.title, data.author, new Date(), data.type, id]
    }
    db.query(sql, sqlParams)
        .then(function (dataRes) {
            if (data.image) {
                fs.writeFile("public/images/" + imageName, data.image.value, 'base64', function (err) {
                    console.log(err);
                    console.log('ok123');
                    clearImageFolder();
                });
            }
            res.json('OK');
        })
        .catch(function (error) {
            console.log('ERROR:', error)
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

router.delete('/deleteBorrow/:id', function (req, res, next) {
    console.log(req.body)
    var data = req.body;
    var sql = "DELETE FROM public.borrows\n" +
        "WHERE id = $1;";
    db.query(sql, [req.params.id])
        .then(function (data) {
            res.json('OK');
        })
        .catch(function (error) {
            console.log('ERROR:', error)
        })
});

router.delete('/deleteResource/:id', function (req, res, next) {
    console.log(req.body)
    var data = req.body;
    var sql = "DELETE FROM public.resources\n" +
        "WHERE id = $1;";
    db.query(sql, [req.params.id])
        .then(function (data) {
            res.json('OK');
        })
        .catch(function (error) {
            console.log('ERROR:', error)
        })
});

router.get('/clearNoUsedImage', function (req, res, next) {
    clearImageFolder();
    res.json('OK');
});

var clearImageFolder = function () {
    fs.readdir("public/images/", function (err, files) {
        var imgDataBase = [];
        var sql = "SELECT img FROM resources WHERE img IS NOT NULL AND img != '';"
        db.query(sql)
            .then(function (data) {
                imgDataBase = data.map((item) => {
                    return item.img;
                })
                var diff = files.diff(imgDataBase);
                diff.forEach((file) => {
                    fs.unlink('public/images/' + file);
                })
            })
            .catch(function (error) {
                console.log('ERROR:', error)
            })
    })
}

module.exports = router;
