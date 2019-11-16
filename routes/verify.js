var jwt = require('jsonwebtoken');
var config = require('../config.js');


exports.getToken = (user) => {
	return jwt.sign(user, config.secretKey, {
		expiresIn:3600
	});
};

exports.verifyOrdinaryUser = (req, res, next) => {
	var token = req.body.token || req.query.token || req.headers['x-access-token'];

	if(token){
		 jwt.verify(token, config.secretKey, (err, decoded) => {
		 	if(err){
		 		var err = new Error('You are not authenticated!');
		 		err.status = 401;
		 		return next(err);
		 	}else{
		 		req.decoded = decoded;
		 		next();
		 	}
		 });
	}else{
		var err = new Error('No token provided!');
	 		err.status = 403;
	 		return next(err);
	}
};