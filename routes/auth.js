var jwt = require('jsonwebtoken')

module.exports.http_auth = function (req, res, next) {
    var token = req.header('Authorization')
    if (token == null)
        return res.status(401).send({ code: 1, description: 'token required' })
    if (typeof token != 'string')
        return res.status(401).send({ code: 1, description: 'token must be string' })
    if (token.split(' ')[0] !== 'Bearer' || token.split(' ')[1] == null)
        return res.status(401).send({ code: 1, description: 'token required' })
    var token = token.split(' ')[1]
    try {
        const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        req.user_id = payload.user_id
        next()
    } catch (err) {
        if (err.name == "TokenExpiredError")
            return res.send({ code: 3, description: "token expired" })
        if (err.name == "JsonWebTokenError")
            return res.send({ code: 3, description: err.message })
        console.error(err)
        return res.send({ code: 3, description: "not authenticated" })
    }
}

module.exports.socket_auth = function (socket, next) {
    var token = socket.handshake.query.token;
    if (token == null)
        return res.status(401).send({ code: 1, description: 'token required' })
    if (token.split(' ')[0] !== 'Bearer' || token.split(' ')[1] == null)
        return next(new Error('token required'))
    var token = token.split(' ')[1]
    try {
        const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        socket.user_id = payload.user_id;
        next();
    } catch (err) {
        if (err.name == "TokenExpiredError")
            return next(new Error('token expired'))
        if (err.name == "JsonWebTokenError")
            return next(new Error(err.message))
        console.error(err)
            return next(new Error('not authenticated'))
    }
}