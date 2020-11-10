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
var friendRouter = require('./routes/friend');
var coinsRouter = require('./routes/coin');

var app = express();

var server = require('http').Server(app); // intantiating the server
var io = require('socket.io')(server);

var authenticate = require('./routes/auth')
const coin = require('./middlewares/coin')

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/users', usersRouter);
app.use('/preference', authenticate.http_auth, coin.check_and_update, preferenceRouter);
app.use('/profile', authenticate.http_auth, coin.check_and_update, profileRouter);
app.use('/search', authenticate.http_auth, coin.check_and_update, searchRouter);
app.use('/messaging', authenticate.http_auth, coin.check_and_update, messagingRouter);
app.use('/story', authenticate.http_auth, coin.check_and_update, storyRouter);
app.use('/friend', authenticate.http_auth, coin.check_and_update, friendRouter);
app.use('/coin', authenticate.http_auth, coin.check_and_update, coinsRouter);

io.use(authenticate.socket_auth);
io.of('/chatroom').use(authenticate.socket_auth);
require('./socket/chatroom')(io)
io.of('/location').use(authenticate.socket_auth);
require('./socket/location')(io)

module.exports = { app: app, server: server };