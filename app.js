require('./server/model/user_model.js');
require('./tasks/model/task_model.js');

const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const expressSession = require('express-session');
const mongoStore = require('connect-mongo')({session: expressSession});
const mongoose = require('mongoose');
const config = require('./server/config.js');
const database = require('./server/database.js');

const app = express();
const server = require('http').Server(app);

/**
 * Setup MongoDB connection.
 */
mongoose.connect(database.mongoURI,{useNewUrlParser:true})
  .then(function(){
  console.log("Connected to send sms...");
}).catch(err => console.error(err));


const db = mongoose.connection;

app.use(cookieParser());

app.use(expressSession({
  secret: config.SECRET,
  resave: true,
  saveUninitialized: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));

/**
 * Open the DB connection.xys
 */
db.once('open', function (err) {
    if(err){
        console.log("Error Opening the DB Connection: ", err);
        return;
    }
    app.use(expressSession({
        secret: config.SECRET,
        // resave: true,
        saveUninitialized: true,
        cookie: {maxAge: 60 * 60 * 1000},
        store: new mongoStore({
            db: mongoose.connection.db,
            collection: 'sessions'
        })
    }));
    const port = process.env.PORT || 3000;
    server.listen(port);
    console.log("Magic happening on port : " + port);
});

db.on('error', console.error.bind(console, 'Connection Error:'));

const router = express.Router();

const users = require('./server/controllers/users.js');
const tasks = require('./tasks/controllers/tasks.js');


//ROUTER
//routes for tasks
router.get('/tasks', tasks.alltasks);
router.post('/tasks/add', tasks.addtasks);
router.get('/tasks/delete/:id', tasks.deletetask);
router.post('/tasks/edit/:id', tasks.edittask);


//routes for users and authentication
router.post('/user/register', users.register);
router.route('/logout').get(users.logout);
router.route('/login').post(users.login);
router.get('/', users.main);

//Authy Authentication API
router.route('/verify').post(users.verify);
router.route('/loggedIn').post(users.loggedIn);

//Lookups
router.route('/lookup').post(users.lookupNumber);


//Require user to be logged in and authenticated with 2FA
 /*
 * @param req
 * @param res
 * @param next
 */
function requirePhoneVerification(req, res, next) {
    if (req.session.ph_verified) {
        console.log("Phone Verified");
        next();
    } else {
        console.log("Phone Not Verified");
        res.redirect("/verification");
    }
}
/**
 * Require user to be logged in and authenticated with 2FA
 *
 * @param req
 * @param res
 * @param next
 */
function requireLoginAnd2FA(req, res, next) {
    if (req.session.loggedIn && req.session.authy) {
        console.log("User logged and 2FA authenticated");
        next();
    } else if (req.session.loggedIn && !req.session.authy) {
        console.log("User logged in but NO 2FA");
        res.status(400).json('You are logged in but not authorized by sms');
    } else {
        console.log("User not logged in.  Redirecting.");
        res.status(400).json('You are not logged in');
    }
}

/**
 * Require user to be logged in.
 *
 * @param req
 * @param res
 * @param next
 */
function requireLogin(req, res, next) {
    if (req.session.loggedIn) {
        console.log("RL:  User logged in");
        next();
    } else {
        console.log("RL: User not logged in.  Redirecting.");
        res.redirect("/login");
    }
}

/**
 * Test for 200 response.  Useful when setting up Authy callback.
 */
router.route('/test').post(function(req, res){
    return res.status(200).send({"connected": true});
});

/**
 * Prefix all router calls with '/'
 */
app.use('/', router);
