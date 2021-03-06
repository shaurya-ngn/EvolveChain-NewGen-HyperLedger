const config = require("config");
const path = require('path');
const express = require("express");
// var bodyParser = require('body-parser');
const mongoose = require('mongoose');
// mongoose.set('debug', true);
var Grid = require('gridfs-stream');
const expressValidator = require("express-validator");
const routes = require('./routes');
const status = config.get('status');
var mongo = require('mongodb');
const PORT = config.get('port');
const base_url = config.get('base_url');
const app = express();

// Cors Headers
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );   
    next();
});

// SET View Engine and View folder Path 
app.set('views', path.join(__dirname, '/views'));
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(expressValidator());
app.use(express.static(__dirname + '/public'));
app.use('/public', express.static(__dirname + '/public'));

// app.use(bodyParser.json()); // to support JSON-encoded bodies
// app.use(bodyParser.urlencoded({ extended: true }));

// API & Web Routes
app.use("/app/", routes.app);
app.use("/kyc/", routes.kyc);
app.use("", routes.web);

// Retorn 404 Response in Json for APIs
app.use("/api/*", (req, res) => {
    res.status(status.NotFound).json({message: "Page not Found."});
});



// 404 Page for Web 
app.use("*", (req, res) => {
    let data = {
        SITE_NAME: config.get('app_name'),
        BASE_URL: config.get('base_url')
    };
    return res.render("shared/404.html",data);
});

// connect to mongo database
mongoose.connection.openUri(config.get('MONGODB_URL'), function(err, db) {
    if(err){
        console.log("Database Error....." + err);  
    }
    else{
        gfs = Grid(db, mongo);
    }
});

mongoose.Promise = global.Promise;

const server = app.listen(PORT, () => {
    console.log(`Server Started @ ${base_url}`);
});

server.timeout = 300000; //5 minutes time out
