/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var passport = require('passport');
var OpenIDConnectStrategy = require('passport-idaas-openidconnect').IDaaSOIDCStrategy;

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

// create a new express server
var app = express();

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

app.use(cookieParser());
app.use(session({resave: 'true', saveUninitialized: 'true', secret: 'keyboard cat'}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done){
  done(null,user);
});

passport.deserializeUser(function(obj, done){
	done(null,obj);
});




// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();



var services = JSON.parse(process.env.VCAP_SERVICES || "{}");
console.log(services);
if(services == '{}')
	console.log(" i am here");
services = {
   "SingleSignOn": [
      {
         "name": "Single Sign On-ol",
         "label": "SingleSignOn",
         "plan": "standard",
         "credentials": {
            "secret": "YOUR SECRET KEY",
            "tokenEndpointUrl": "YOUR ENDPOINT",
            "authorizationEndpointUrl": "YOUR AUTHORIZATION",
            "issuerIdentifier": "YOUR Issuer ID",
            "clientId": "YOUR CLIENT ID",
            "serverSupportedScope": [
               "openid"
            ]
         }
      }
   ]
};
var ssoConfig = services.SingleSignOn[0];
var client_id = ssoConfig.credentials.clientId;
var client_secret = ssoConfig.credentials.secret;
var authorization_url = ssoConfig.credentials.authorizationEndpointUrl;
var token_url = ssoConfig.credentials.tokenEndpointUrl;
var issuer_id = ssoConfig.credentials.issuerIdentifier;
var callback_url = 'https://ssolab06072016.mybluemix.net/auth/sso/callback';



var Strategy = new OpenIDConnectStrategy({
	authorizationURL : authorization_url,
	tokenURL : token_url,
	clientID : client_id,
	scope : 'openid',
	response_type : 'code',
	clientSecret : client_secret,
	callbackURL : callback_url,
	skipUserProfile : true,
	issuer : issuer_id
}, function(accessToken, refreshToken, profile, done){
	process.nextTick(function(){
		profile.accessToken = accessToken;
		profile.refreshToken = refreshToken;
		done(null, profile);
	})
});

passport.use(Strategy);

app.get('/login', passport.authenticate('openidconnect',{}));

function ensureAuthenticated(req, res, next){
  if(!req.isAuthenticated()){
         
         req.session.originalUrl = req.originalUrl;
         res.redirect('/login');
  }else{
  	return next();
  }

}



app.get('/auth/sso/callback', function(req,res,next){
	var redirect_url = req.session.originalUrl;
	passport.authenticate('openidconnect',{
		successRedirect : redirect_url,
		failureRedirect : '/failure',
	})(req,res,next);

});


app.get('/hello', ensureAuthenticated, function(req,res){
	res.send('Hello, '+req.user['id']+ '!');
});


app.get('/failure', function(req,res){
	res.send('login failed');
});




// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});
