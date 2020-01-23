var lmdb = require('node-lmdb');
var fs = require('fs');
const express = require('express');
const fileUpload = require('express-fileupload');
const app = express();
var env = new lmdb.Env();
var port = 3000;
var path = require('path');
var stream = require('stream');
var mime = require('mime-types');
var mustache = require('mustache');
var mustacheExpress = require('mustache-express');

app.use(fileUpload());
app.use(express.static('public'));
app.engine('html', mustacheExpress());
app.set('view engine', 'html');
app.set('views', __dirname + '/public/mustache/')

env.open({
    path: __dirname + "/lmdb_storage",
    mapSize: 8 * 1024 * 1024 * 1024, // maximum database size - currently 8GB
    maxDbs: 3
});

var dbi = env.openDbi({
    name: "lightnings3",
    create: true // will create if database did not exist
});

app.post('/put', function(req, res) {
    var txn = env.beginTxn();
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }
    var d = new Date();
    var n = d.getTime();
    var sampleFile = req.files.sampleFile.data;
    var sampleFileName = req.files.sampleFile.name;
    var md5sum = req.files.sampleFile.md5;
    var mimefile = req.files.sampleFile.mimetype;
    var key = n + "-" + sampleFileName;

    txn.putBinary(dbi, key, sampleFile);
    txn.commit();

    res.render('confirm', {
        "file_name": key
    });
});

app.get('/get/:name', function(req, res) {
    var fileRequested = req.params.name;
    var txn = env.beginTxn();
    var data2 = txn.getBinary(dbi, fileRequested);
    var extensionRequested = path.extname(fileRequested);

    var readStream = new stream.PassThrough();
    readStream.end(data2);
    res.set('Content-disposition', 'attachment; filename=' + fileRequested);
    var mimeLookup = mime.lookup(fileRequested);

    if (mimeLookup != false) {
        res.set('Content-Type', mimeLookup);
        readStream.pipe(res);
    } else {
        res.send("File doesn't exist!");
    }
});

app.listen(port, () => console.log(`Lightning S3 listening on port ${port}!`));