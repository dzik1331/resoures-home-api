var express = require('express');
var router = express.Router();
var _ = require('lodash');
var fs = require("fs");
var pgp = require('pg-promise')(/*options*/)
var dataBaseConfig = require('../databaseConfig')
var db = pgp(`postgres://${dataBaseConfig.user}:${dataBaseConfig.password}@${dataBaseConfig.host}/${dataBaseConfig.database}`)
var thumb = require('node-thumbnail').thumb;

router.get('/list/:id', function (req, res, next) {
    var sql = "SELECT r.id, r.title, r.author, r.img, r.publishing, t.name AS type, r.date, CASE WHEN COUNT(b.id) = 0 THEN false ELSE true END as \"isBorrow\" \n" +
        "FROM resources AS r \n" +
        "LEFT JOIN types AS t ON t.id = r.type\n" +
        "LEFT JOIN borrows as b on b.\"resourceId\" = r.id AND b.active\n" +
        `WHERE r.type = ${req.params.id}\n` +
        "GROUP BY r.id, t.name, b.person"
    db.query(sql)
        .then(function (data) {
            res.json(data);
        })
        .catch(function (error) {
            console.error('ERROR:', error)
        })
});

router.post('/list/:id', function (req, res, next) {
    var where = '';
    if (req.body.filter) {
        where += `WHERE r.type = ${req.params.id} AND 
        LOWER(title) ~ '${req.body.filter.toLowerCase()}' OR 
        LOWER(publishing) ~ '${req.body.filter.toLowerCase()}' OR
        LOWER(author) ~ '${req.body.filter.toLowerCase()}'`;
    } else {
        where += `WHERE r.type = ${req.params.id}`
    }
    var sql = "SELECT r.id, r.title, r.author, r.img, r.publishing, t.name AS type, r.date, CASE WHEN COUNT(b.id) = 0 THEN false ELSE true END as \"isBorrow\" \n" +
        "FROM resources AS r \n" +
        "LEFT JOIN types AS t ON t.id = r.type\n" +
        "LEFT JOIN borrows as b on b.\"resourceId\" = r.id AND b.active\n" +
        where + "\n" +
        "GROUP BY r.id, t.name, b.person\n";
    db.query(sql)
        .then(function (data) {
            res.json(data);
        })
        .catch(function (error) {
            console.error('ERROR:', error)
        })
});

router.get('/get/:id', function (req, res, next) {
    var sendData = {details: null, borrows: []}
    var sql = "SELECT r.id, r.title, r.author, r.img, r.publishing, t.name AS type, r.date\n" +
        "FROM resources AS r\n" +
        "LEFT JOIN types AS t ON t.id = r.type\n" +
        "WHERE r.id = $1";

    var sql2 = "SELECT b.id, b.active, b.person, b.\"borrowDate\", b.\"returnDate\"\n" +
        "FROM borrows AS b\n" +
        "WHERE b.\"resourceId\" = $1";
    db.query(sql, [req.params.id])
        .then(function (data) {
            sendData.details = data;
            db.query(sql2, [req.params.id])
                .then(function (data) {
                    sendData.borrows = data;
                    res.json(sendData);
                })
                .catch(function (error) {
                    console.error('ERROR:', error)
                })
        })
        .catch(function (error) {
            console.error('ERROR:', error)
            res.json(sendData);
        })
});

router.get('/types', function (req, res, next) {
    var sql = "SELECT id, name from types";
    db.query(sql)
        .then(function (data) {
            res.json(data);
        })
        .catch(function (error) {
            console.error('ERROR:', error)
        })
});

router.post('/add', function (req, res, next) {
    var data = req.body;
    var sql = "INSERT INTO public.resources(title, author, date, type, img, publishing) VALUES ($1, $2, $3, $4, $5, $6)";
    console.log('test')
    var imageName = data.image ? (new Date().getTime()) + data.image.filename : '';
    db.query(sql, [data.title, data.author, new Date(), data.type, imageName, data.publishing])
        .then(function (data) {
            console.log('test2')
            if (req.body.image) {
                fs.writeFile("public/images/" + imageName, req.body.image.value, 'base64', function (err) {
                    if (err) {
                        console.log(err);
                    } else {
                        thumb({
                            prefix: 'thumb_',
                            suffix: '',
                            source: 'public/images/' + imageName,
                            destination: 'public/images',
                            width: 200
                        }, function (files, err, stdout, stderr) {
                            if (!err) {
                                res.json('OK');
                            } else {
                                console.log(err)
                            }
                        });
                    }
                });
            } else {
                res.json('OK');
            }
        })
        .catch(function (error) {
            console.log('ERROR:', error)
        })
});

/* EDYCJA*/
router.put('/update/:id', function (req, res, next) {
    var id = req.params.id;
    var data = req.body;
    var sqlParams = [];
    var imageName = data.image ? (new Date().getTime()) + data.image.filename : '';
    if (data.image) {
        var sql = "UPDATE public.resources SET title = $1, author = $2, date = $3, type = $4, img = $5, publishing = $6 WHERE id = $7;";
        sqlParams = [data.title, data.author, new Date(), data.type, imageName, data.publishing, id]
    } else {
        var sql = "UPDATE public.resources SET title = $1, author = $2, date = $3, type = $4, publishing = $5 WHERE id = $6;";
        sqlParams = [data.title, data.author, new Date(), data.type, data.publishing, id]
    }
    db.query(sql, sqlParams)
        .then(function () {
            if (data.image) {
                fs.writeFile("public/images/" + imageName, data.image.value, 'base64', function (err) {
                    if (err) {
                        console.error(err);
                    } else {
                        thumb({
                            prefix: 'thumb_',
                            suffix: '',
                            source: 'public/images/' + imageName,
                            destination: 'public/images',
                            width: 200
                        }, function (files, err, stdout, stderr) {
                            if (!err) {
                                res.json('OK');
                                clearImageFolder();
                            }
                        });
                    }

                });
            } else {
                res.json('OK');
            }
        })
        .catch(function (error) {
            console.error('ERROR:', error)
        });


});

router.post('/addBorrow', function (req, res, next) {
    var data = req.body;
    var sql = "INSERT INTO public.borrows(active, \"resourceId\", person, \"borrowDate\") VALUES ($1, $2, $3, $4)";
    db.query(sql, [true, data.resourceId, data.person, new Date()])
        .then(function () {
            res.json('OK');
        })
        .catch(function (error) {
            console.error('ERROR:', error)
        })
});

router.get('/isReturn/:id', function (req, res, next) {
    var sql = "UPDATE public.borrows\n" +
        "SET \"active\"= false, \"returnDate\"=$1\n" +
        "WHERE id = $2;";
    db.query(sql, [new Date(), req.params.id])
        .then(function () {
            res.json('OK');
        })
        .catch(function (error) {
            console.error('ERROR:', error)
        })
});

router.delete('/deleteBorrow/:id', function (req, res, next) {
    var data = req.body;
    var sql = "DELETE FROM public.borrows\n" +
        "WHERE id = $1;";
    db.query(sql, [req.params.id])
        .then(function (data) {
            res.json('OK');
        })
        .catch(function (error) {
            console.error('ERROR:', error)
        })
});

router.delete('/deleteResource/:id', function (req, res, next) {
    var data = req.body;
    var sql = "DELETE FROM public.resources\n" +
        "WHERE id = $1;";
    db.query(sql, [req.params.id])
        .then(function (data) {
            res.json('OK');
        })
        .catch(function (error) {
            console.error('ERROR:', error)
        })
});

router.get('/clearNoUsedImage', function (req, res, next) {
    clearImageFolder();
    res.json('OK');
});

var clearImageFolder = function () {
    fs.readdir("public/images/", function (err, files) {
        files = files.map((file) => {
            return file.replace('thumb_', '');
        })
        var imgDataBase = [];
        var sql = "SELECT img FROM resources WHERE img IS NOT NULL AND img != '';"
        db.query(sql)
            .then(function (data) {
                imgDataBase = data.map((item) => {
                    return item.img;
                })
                var diff = files.diff(imgDataBase);
                var thumb_diff = diff.map((item) => {
                    return 'thumb_' + item;
                })
                diff = diff.concat(thumb_diff);
                diff.forEach((file) => {
                    fs.stat('public/images/' + file, (err) => {
                        if (err) {
                            console.log('No exist')
                        } else {
                            console.log('Exist')
                            fs.unlink('public/images/' + file, (err) => {
                                if (!err) {
                                    console.log('Done');
                                }
                            });
                        }
                    });
                })
            })
            .catch(function (error) {
                console.error('ERROR:', error)
            })
    })
}

module.exports = router;
