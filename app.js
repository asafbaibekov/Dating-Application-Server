var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var usersRouter = require('./routes/users');
var messagingRouter = require('./routes/messaging');

var app = express();

var server = require('http').Server(app); // intantiating the server
var io = require('socket.io')(server);

var authenticate = require('./routes/auth')

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/users', usersRouter);
app.use('/messaging', authenticate, (req, res, next) => {
    res.io = io;
    next();
}, messagingRouter);

module.exports = { app: app, server: server };