// handler for auth routes.
const loginRequired = function(req, res, next) {
    // req.user is added by jwtMiddleware.
    if (req.user) {
        next();
    }
    else {
        return res.status(401).json({ message: 'Unauthorized user!!' });
    }
}

module.exports = loginRequired;