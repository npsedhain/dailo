const crypto = require('crypto');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const config = require('../config.js');
const qs = require('qs');

const authy = require('authy')(config.API_KEY);

const lookup = require('../lookup')(config.TWILIO_ACCT_SID,config.TWILIO_AUTH_TOKEN);

function hashPW (pwd) {
    return crypto.createHash('sha256').update(pwd).digest('base64').toString();
}


exports.main = function(req,res) {
  res.send('This is a backend for our dailo app');
}



/**
 * Login a user
 * @param req
 * @param res
 */
exports.login = function (req, res) {
    User.findOne({username: req.body.username})
        .exec(function (err, user) {
            if (!user) {
                err = 'Username Not Found';
            } else if (('password' in req.body) && (user.hashed_password !==
                hashPW(req.body.password.toString()))) {
                err = 'Wrong Password';
            } else {
                // authy.request_sms(user.authyId, true, function (err, smsRes) {
                //     let error = false ;
                //     if (err) {
                //         console.log('ERROR requestSms', err);
                //         res.status(500).json(err);
                //         error = true ;
                //         return error;
                //     } else {
                //       // res.status(200).json('');
                //       console.log("requestSMS response: ", smsRes);
                      createSession(req, res, user);
                //     }
                // });
              }

            if (err) {
                res.status(500).json(err);
            }
        });
};

/**
 * Logout a user
 *
 * @param req
 * @param res
 */
exports.logout = function (req, res) {
    req.session.destroy(function (err) {
        if (err) {
            console.log("Error Logging Out: ", err);
            return next(err);
        }
        res.status(200).send();
    });
};


/**
 * Check user login status.  Redirect appropriately.
 *
 * @param req
 * @param res
 */
exports.loggedIn = function (req, res) {

    if (req.session.loggedIn && req.session.authy) {
        res.status(200).json({url: "/protected"});
    } else if (req.session.loggedIn && !req.session.authy) {
      console.log(req.session.loggedIn);
        res.status(200).json({url: "/2fa"});
    } else {
        res.status(200).json({url: "/login"});
    }
};


/**
 * Sign up a new user.
 *
 * @param req
 * @param res
 */
exports.register = function (req, res) {

    let username = req.body.username;

    User.findOne({username: username}).exec(function (err, user) {
        if (err) {
            console.log('Rregistration Error', err);
            res.status(500).json(err);
            return;
        }
        if (user) {
            res.status(409).json({err: "Username Already Registered"});
            return;
        }

        user = new User({username: req.body.username});

        user.set('hashed_password', hashPW(req.body.password));
        user.set('email', req.body.email);
        user.set('phone_number',req.body.phone_number);
        user.set('authyId', null);
        user.save(function (err) {
            if (err) {
                console.log('Error Creating User', err);
                res.status(500).json(err);
            } else {
                authy.register_user(req.body.email, req.body.phone_number, user.country_code,function (err, regRes) {
                        if (err) {
                            console.log('Error Registering User with Authy');
                            res.status(500).json(err);
                            return;
                        }

                        user.set('authyId', regRes.user.id);

                        // Save the AuthyID into the database then request an SMS
                        user.save(function (err) {
                            if (err) {
                                console.log('error saving user in authyId registration ', err);
                                res.session.error = err;
                                res.status(500).json(err);
                            } else {
                              authy.request_sms(user.authyId, true, function (err, smsRes) {
                                  let error = false ;
                                  if (err) {
                                      console.log('ERROR requestSms', err);
                                      res.status(500).json(err);
                                      error = true ;
                                      return error;
                                  } else {
                                    // res.status(200).json('');
                                    console.log("requestSMS response: ", smsRes);
                                    createSession(req, res, user);
                                  }
                              });
                            }
                        });
                    });
            }
        });
    });
};

/**
 * Verify an Authy Code
 *
 * @param req
 * @param res
 */
exports.verify = function (req, res) {
    let username = req.session.username;
    User.findOne({username: username})
    .exec(function (err, user) {
        console.log({user});
        if (err) {
            console.error('Verify Token User Error: ', err);
            res.status(500).json(err);
        }
        else {

        authy.verify(user.authyId, req.body.token, function (err, tokenRes) {
            if (err) {
                console.log("Verify Token Error: ", err);
                res.status(500).json(err);
                return;
            }
            console.log("Verify Token Response: ", tokenRes);
            if (tokenRes.success) {
                req.session.authy = true;
            }
            res.status(200).json(tokenRes);
        });
      }
    });
};

/**
 * Lookup a phone number
 * @param req
 * @param res
 */
exports.lookupNumber = function (req, res) {
    let country_code = req.body.country_code;
    let phone_number = req.body.phone_number;

    if(country_code && phone_number){
        lookup.get(phone_number,country_code, function(resp){
            console.log("response", resp);
            if(resp === false){
                res.status(500).send({"success": false});
            } else {
                console.log("successful response", resp);
                res.json({info: resp})
            }
        });

    } else {
        console.log('Failed in Register Phone API Call', req.body);
        res.status(500).json({error: "Missing fields"});
    }
};


/**
 * Create the initial user session.
 *
 * @param req
 * @param res
 * @param user
 */
function createSession (req, res, user) {
    req.session.regenerate(function () {
        req.session.loggedIn = true;
        req.session.user = user.id;
        req.session.username = user.username;
        req.session.msg = 'Authenticated as: ' + user.username;
        req.session.authy = false;
        res.status(200).json("Session has been created");
    });
}
