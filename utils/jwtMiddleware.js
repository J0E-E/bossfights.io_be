const jsonwebtoken = require('jsonwebtoken')

// JWT middleware to pull authentication headers and validate authentication.
const jwtMiddleware = function(req, res, next) {
    if (
        req.headers
        && req.headers.authorization
        && req.headers.authorization.split(' ')[0] === 'JWT'
    ) {
        jsonwebtoken.verify(req.headers.authorization.split(' ')[1], 'RESTFULAPIs', function(err, decode) {
            if (err) req.user = undefined;
            req.user = decode;
            next();
        });
    } else {
        req.user = undefined;
        next();
    }
};

module.exports = jwtMiddleware;