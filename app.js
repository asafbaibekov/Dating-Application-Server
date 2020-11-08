var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var usersRouter = require('./routes/users');
var preferenceRouter = require('./routes/preference');
var profileRouter = require('./routes/profile');
var searchRouter = require('./routes/search');
var messagingRouter = require('./routes/messaging');
var storyRouter = require('./routes/story');
var coinRouter = require('./routes/coin');
var leaderRouter = require('./routes/leader'); 

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
app.use('/preference', authenticate.http_auth, preferenceRouter);
app.use('/profile', authenticate.http_auth, profileRouter);
app.use('/search', authenticate.http_auth, searchRouter);
app.use('/messaging', authenticate.http_auth, messagingRouter);
app.use('/story', authenticate.http_auth, storyRouter);
app.use('/coin', authenticate.http_auth, coinRouter);
app.use('/leader', authenticate.http_auth, leaderRouter);

io.use(authenticate.socket_auth);
io.of('/chatroom').use(authenticate.socket_auth);
require('./socket/chatroom')(io)
io.of('/location').use(authenticate.socket_auth);
require('./socket/location')(io)

module.exports = { app: app, server: server };