// middleware for normalizing request keys to lower case for case-insensitivity.
const normalizeKeysMiddleware = (req, res, next) => {
    const normalizedBody = {};
    for (let key in req.body) {
        if (req.body.hasOwnProperty(key)) {
            normalizedBody[key.toLowerCase()] = req.body[key];
        }
    }
    req.body = normalizedBody;
    next();
};

module.exports = normalizeKeysMiddleware;