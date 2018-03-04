var fs = require("fs");
var thumb = require('node-thumbnail').thumb;
fs.readdir("public/images/", function (err, files) {
    console.log(files);
    console.log(err);
    files.forEach((file) => {
        thumb({
            prefix: 'thumb_',
            suffix: '',
            source: 'public/images/' + file,
            destination: 'public/images',
            width: 200
        }, function (files, err, stdout, stderr) {
            console.log(err)
        });
    })
});
