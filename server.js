// See LICENSE.MD for license information.

'use strict';

/********************************
Dependencies
********************************/
var express = require('express'),// server middleware
    mongoose = require('mongoose'),// MongoDB connection library
    bodyParser = require('body-parser'),// parse HTTP requests
    passport = require('passport'),// Authentication framework
    LocalStrategy = require('passport-local').Strategy,
    expressValidator = require('express-validator'), // validation tool for processing user input
    cookieParser = require('cookie-parser'),
    session = require('express-session'),
    MongoStore = require('connect-mongo')(session), // store sessions in MongoDB for persistence
    bcrypt = require('bcryptjs'), // middleware to encrypt/decrypt passwords
    sessionDB,

    cfenv = require('cfenv'),// Cloud Foundry Environment Variables
    appEnv = cfenv.getAppEnv(),// Grab environment variables

    User = require('./server/models/user.model'),
    Need = require('./server/models/need.model');


/********************************
Local Environment Variables
 ********************************/
if(appEnv.isLocal){
    require('dotenv').load();// Loads .env file into environment
}

/********************************
 MongoDB Connection
 ********************************/

//Detects environment and connects to appropriate DB
if(appEnv.isLocal){
    var ca = Buffer.from(process.env.CERTIFICATE_BASE64, 'base64');
    mongoDbOptions = {
        useNewUrlParser: true,
        ssl: true,
        sslValidate: true,
        sslCA: ca
  };
    mongoose.connect(process.env.MONGODB_URL, mongoDbOptions)
        .then(res => console.log(res))
        .catch(function (reason) {
            console.log('Unable to connect to the mongodb instance. Error: ', reason);
        });
    sessionDB = process.env.MONGODB_URL;
    console.log('Your MongoDB is running at ' + process.env.MONGODB_URL);
}
// Connect to MongoDB Service on IBM Cloud
else if(!appEnv.isLocal) {
    var mongoDbUrl, mongoDbOptions = {};
    var mongoDbCredentials = appEnv.services["databases-for-mongodb"][0].credentials.connection.mongodb;
    var ca = Buffer.from(mongoDbCredentials.certificate.certificate_base64, 'base64');
    mongoDbUrl = mongoDbCredentials.composed[0];
    mongoDbOptions = {
        useNewUrlParser: true,
        ssl: true,
        sslValidate: true,
        sslCA: ca,
        poolSize: 1,
        reconnectTries: 1
    };

    console.log("Your MongoDB is running at ", mongoDbUrl);
    // connect to our database
    mongoose.Promise = global.Promise;
    mongoose.connect(mongoDbUrl, mongoDbOptions)
        .then(res => console.log(res))
        .catch(function (reason) {
            console.log('Unable to connect to the mongodb instance. Error: ', reason);
        });
    //mongoose.connect(mongoDbUrl, mongoDbOptions); // connect to our database
    sessionDB = mongoDbUrl;
}
else{
    console.log('Unable to connect to MongoDB.');
}




/********************************
Express Settings
********************************/
var app = express();
app.enable('trust proxy');
// Use SSL connection provided by IBM Cloud. No setup required besides redirecting all HTTP requests to HTTPS
if (!appEnv.isLocal) {
    app.use(function (req, res, next) {
        if (req.secure) // returns true is protocol = https
            next();
        else
            res.redirect('https://' + req.headers.host + req.url);
    });
}
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(expressValidator()); // must go directly after bodyParser
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'this_is_a_default_session_secret_in_case_one_is_not_defined',
    resave: true,
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
    saveUninitialized : false,
    cookie: { secure: true }
}));
app.use(passport.initialize());
app.use(passport.session());



/********************************
 Passport Middleware Configuration
 ********************************/
passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

passport.use(new LocalStrategy(
    function(username, password, done) {
        User.findOne({ username: username }, function (err, user) {
            if (err) {
                return done(err);
            }
            if (!user) {
                return done(null, false, { message: 'Incorrect username.' });
            }
            // validatePassword method defined in user.model.js
            if (!user.validatePassword(password, user.password)) {
                return done(null, false, { message: 'Incorrect password.' });
            }
            return done(null, user);
        });
    }
));

/********************************
 Routing
 ********************************/

// Home
app.get('/', function (req, res){
    res.sendfile('index.html');
});

// Account login
app.post('/account/login', function(req,res){

    // Validation prior to checking DB. Front end validation exists, but this functions as a fail-safe
    req.checkBody('username', 'Username is required').notEmpty();
    req.checkBody('password', 'Password is required').notEmpty();

    var errors = req.validationErrors(); // returns an object with results of validation check
    if (errors) {
        res.status(401).send('Username or password was left empty. Please complete both fields and re-submit.');
        return;
    }

    // Create session if username exists and password is correct
    passport.authenticate('local', function(err, user) {
        if (err) { return next(err); }
        if (!user) { return res.status(401).send('User not found. Please check your entry and try again.'); }
        req.logIn(user, function(err) { // creates session
            if (err) { return res.status(500).send('Error saving session.'); }
            var userInfo = {
                username: user.username,
                name : user.name,
                email : user.email
            };
            return res.json(userInfo);
        });
    })(req, res);

});

// Account creation
app.post('/account/create', function(req,res){

    // 1. Input validation. Front end validation exists, but this functions as a fail-safe
    req.checkBody('username', 'Username is required').notEmpty();
    req.checkBody('password', 'Password is required').notEmpty();
    req.checkBody('name', 'Name is required').notEmpty();
    req.checkBody('email', 'Email is required and must be in a valid form').notEmpty().isEmail();

    var errors = req.validationErrors(); // returns an array with results of validation check
    if (errors) {
        res.status(400).send(errors);
        return;
    }

    // 2. Hash user's password for safe-keeping in DB
    var salt = bcrypt.genSaltSync(10),
        hash = bcrypt.hashSync(req.body.password, salt);

    // 3. Create new object that store's new user data
    var user = new User({
        username: req.body.username,
        password: hash,
        email: req.body.email,
        name: req.body.name
    });

    // 4. Store the data in MongoDB
    User.findOne({ username: req.body.username }, function(err, existingUser) {
        if (existingUser) {
            return res.status(400).send('That username already exists. Please try a different username.');
        }
        user.save(function(err) {
            if (err) {
                console.log(err);
                res.status(500).send('Error saving new account (database error). Please try again.');
                return;
            }
            res.status(200).send('Account created! Please login with your new account.');
        });
    });

});

//Account deletion
app.post('/account/delete', authorizeRequest, function(req, res){

    User.remove({ username: req.body.username }, function(err) {
        if (err) {
            console.log(err);
            res.status(500).send('Error deleting account.');
            return;
        }
        req.session.destroy(function(err) {
            if(err){
                res.status(500).send('Error deleting account.');
                console.log("Error deleting session: " + err);
                return;
            }
            res.status(200).send('Account successfully deleted.');
        });
    });

});

// Account update
app.post('/account/update', authorizeRequest, function(req,res){

    // 1. Input validation. Front end validation exists, but this functions as a fail-safe
    req.checkBody('username', 'Username is required').notEmpty();
    req.checkBody('password', 'Password is required').notEmpty();
    req.checkBody('name', 'Name is required').notEmpty();
    req.checkBody('email', 'Email is required and must be in a valid form').notEmpty().isEmail();

    var errors = req.validationErrors(); // returns an object with results of validation check
    if (errors) {
        res.status(400).send(errors);
        return;
    }

    // 2. Hash user's password for safe-keeping in DB
    var salt = bcrypt.genSaltSync(10),
        hash = bcrypt.hashSync(req.body.password, salt);

    // 3. Store updated data in MongoDB
    User.findOne({ username: req.body.username }, function(err, user) {
        if (err) {
            console.log(err);
            return res.status(400).send('Error updating account.');
        }
        user.username = req.body.username;
        user.password = hash;
        user.email = req.body.email;
        user.name = req.body.name;
        user.save(function(err) {
            if (err) {
                console.log(err);
                res.status(500).send('Error updating account.');
                return;
            }
            res.status(200).send('Account updated.');
        });
    });

});

// Account logout
//app.get('/account/logout', function(req,res){
app.post('/account/logout', function(req,res){

    // Destroys user's session
    //console.log('body: ', req.body);
    //if (!req.user)
    if (!req.body||!req.body.user) // HACK
        res.status(400).send('User not logged in.');
    else {
        req.session.destroy(function(err) {
            if(err){
                res.status(500).send('Sorry. Server error in logout process.');
                console.log("Error destroying session: " + err);
                return;
            }
            res.status(200).send('Success logging user out!');
        });
        // TEST
        //var need = new Need({
            //phone: '415-555-1212',
            //receivedAt: (new Date()),
            //need: 'Hot Meals',
            //category: 'Food'
        //});
        //need.save(function(err) {
            //if (err) {
                //console.log('Error saving need:', err);
                //return;
            //}
            //console.log('need saved');
        //});
    }
});

// Custom middleware to check if user is logged-in
function authorizeRequest(req, res, next) {
    //console.log('body: ', req.body);
    //if (req.user) {
    if (req.body&&req.body.user) { // HACK
        next();
    } else {
        res.status(401).send('Unauthorized. Please login.');
    }
}

// Protected route requiring authorization to access.
//app.get('/protected', authorizeRequest, function(req, res){
app.post('/protected', authorizeRequest, function(req, res){
    /*
    var rowData = [
      {make: "Toyota", model: "Celica", price: 25000},
      {make: "Toyota", model: "Supra", price: 55000},
      {make: "Toyota", model: "Camry", price: 30000},
      {make: "Ford", model: "Mondeo", price: 32000},
      {make: "Ford", model: "Cortina", price: 42000},
      {make: "Ford", model: "Granada", price: 92000},
      {make: "Ford", model: "Escort", price: 22000},
      {make: "Ford", model: "Mondeo", price: 32000},
      {make: "Porsche", model: "Boxter", price: 72000}
    ];
    var rowData = [
      {phone: "415-555-1212", receivedAt: "1-2-2020", need: 'Food Banks', category: 'Food'},
      {phone: "415-555-1212", receivedAt: "1-5-2020", need: 'Brown Bag', category:'Food'},
      {phone: "415-555-1212", receivedAt: "2-1-2020", need: 'Homeless Shelter', category:'Food'},
      {phone: "408-555-1212", receivedAt: "1-20-2020", need: 'Rent Payments', category: 'Financial Assistance'},
      {phone: "408-555-1212", receivedAt: "1-4-2020", need: 'Electric Bill Payments', category: 'Financial Assistance'},
    ];
    */
    //res.send("This is a protected route only visible to authenticated users.");
    //res.json(rowData);
    Need.find({ }, null, {sort: {receivedAt: -1}}, function(err, needs) {
        if (err) {
            console.log(err);
            return res.status(400).send('Error retrieving data.');
        }
        // if we fine only one, make it an array
        if (needs && needs.phone && !Array.isArray(needs))
            needs = [needs];
        res.json(needs);
    });
});

/********************************
Ports
********************************/
app.listen(process.env.PORT || appEnv.port, process.env.BIND || appEnv.bind, function() {
  console.log("Node server running on " + appEnv.url);
});
