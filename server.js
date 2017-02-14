#!/usr/bin/env node

// module dependencies
var express = require('express');

// get port from environment and store in Express
var app = express();

// set the view engine to ejs
app.set('view engine', 'ejs');

// use res.render to load up an ejs view file
// index page
app.get('/', function(req, res) {
	res.render('pages/index');
});

// about page
app.get('/about', function(req, res) {
	res.render('pages/about');
});

// Get port from environment and store in Express
var port = process.env.PORT || 3000;
app.listen(port)
console.log('Server is listening on port', port)
