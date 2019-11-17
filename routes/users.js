const express = require('express')
,   fileUpload = require('express-fileupload')
,   router = express.Router()
,   Verify = require('./verify')
,   config = require('../config')
,   bcrypt = require('bcryptjs')
,   AWS = require('aws-sdk')
,   tableName = "USER_TABLE"

AWS.config.update({region: 'us-east-1'})
const ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'})
var docClient = new AWS.DynamoDB.DocumentClient()

router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.post('/register', (req, res) => {
    req.body.admin = req.body.admin == 'true' ? true : false;
    var params = {
        TableName: tableName,
        ExpressionAttributeValues: {
            ':username': {S: req.body.username}
        },
        FilterExpression: 'contains (username, :username)',
    };

    // Call DynamoDB to read the item from the table
    ddb.scan(params, function(err, data) {
        if(data.Items.length > 0){
            res.send({"status": "error", "message": "Username already taken"})
        }

        var salt = bcrypt.genSaltSync(10)
        ,   hash = bcrypt.hashSync("B4c0/\/", salt);
        
        var params = {
            TableName: tableName,
            Item: {
                'USER_ID' : {S: req.body.userId},
                'username' : {S: req.body.username},
                'admin': {BOOL: req.body.admin},
                'firstName' : {S: req.body.firstName},
                'lastName' : {S: req.body.lastName},
                'birthMonth' : {S: req.body.birthMonth},
                'birthDay' : {N: req.body.birthDay},
                'birthYear' : {N: req.body.birthYear},
                'gender' : {S: req.body.gender},
                'mobile' : {S: req.body.mobile},
                'email' : {S: req.body.email},
                'location' : {S: req.body.location},
                'password' : {S: hash}
            }
        };
        // Call DynamoDB to add the item to the table
        ddb.putItem(params, function(err, data) {
            if (err) {
                res.send({"status": "Error", "error": err});
            } else {
                res.send({"status": "Success", "error": err});
            }
        });
    })
});

router.post('/login', (req, res, next) => {
    var params = {
        TableName: tableName,
        ExpressionAttributeValues: {
            ':username': {S: req.body.username}
        },
        FilterExpression: 'contains (username, :username)',
    };

    // Call DynamoDB to read the item from the table
    ddb.scan(params, function(err, data) {
        const user = data.Items[0]
        if (err) {
            res.status(401).json({"success": false, status:"Error", error: err})
            return;
        } else if (!user){
            res.status(401).json({"success": false, status:"User not found", error: err})
            return;
        }
        
        var isUserValid = bcrypt.compare(req.body.password, user.password.S)
            
        if(!isUserValid) {
            res.status(401).json({"success": false, status:"Incorrect password", error: err})
            return;
        }
        var token = Verify.getToken(user);
        res.status(200).json({
            status: 'Login Successful!',
            success: true,
            token: token,
            id: user.USER_ID.S,
            userDetails: {
                id: user.USER_ID.S,
                admin: user.admin && user.admin.BOOL ? user.admin.BOOL : false,
                birthDay: user.birthDay.N,
                birthMonth: user.birthMonth.S,
                birthYear: user.birthYear.N,
                email: user.email.S,
                firstName: user.firstName.S,
                lastName: user.lastName.S,
                gender: user.gender.S,
                location: user.location.S,
                mobile: user.mobile.N,
                username: user.username.S
            }
        });
    });
});

router.get('/logout', (req, res) => {
	res.status(200).json({
		status: 'Bye!'
	});
});

function getUserDatabyUsername(req, res){
    var params = {
        TableName: tableName,
        ExpressionAttributeValues: {
            ':username': {S: req.params.username}
        },
        FilterExpression: 'contains (username, :username)',
    };

    ddb.scan(params, function(err, data) {
        const user = data.Items[0]
        if(err || !user){
            res.send({"status": "Error", "message": "User not found"})
            return;
        }
        res.send({
            id: user.USER_ID.S,
            admin: user.admin && user.admin.BOOL ? user.admin.BOOL : false,
            birthDay: user.birthDay.N,
            birthMonth: user.birthMonth.S,
            birthYear: user.birthYear.N,
            email: user.email.S,
            firstName: user.firstName.S,
            lastName: user.lastName.S,
            gender: user.gender.S,
            location: user.location.S,
            mobile: user.mobile.N,
            username: user.username.S
        })
    })
}

router.route('/:username')
	.get(Verify.verifyOrdinaryUser, (req, res, next) => {
        getUserDatabyUsername(req, res)
    })
	.put(Verify.verifyOrdinaryUser, (req, res, next) => {
		var params = {
            TableName: tableName,
            ExpressionAttributeValues: {
                ':username': {S: req.params.username}
            },
            FilterExpression: 'contains (username, :username)',
        };
    
        ddb.scan(params, function(err, data) {
            const { USER_ID, username } = data.Items[0]
            let expression = 'set '
            ,   values = {}
            ,   notAllowedUpdates = ["password", "USER_ID", "username"]
            for(x in req.body){
                if(notAllowedUpdates.indexOf(x) === -1){
                    expression += `${x} = :${x}`
                    values[':'+x] = req.body[x]
                }
            }
            var params = {
                TableName: tableName,
                Key: {
                    "USER_ID": USER_ID.S,
                    "username": username.S
                },
                UpdateExpression: expression,
                ExpressionAttributeValues: values,
                ReturnValues:"UPDATED_NEW"
            };

            docClient.update(params, function(err, data) {
                if (err) {
                    res.send({"status" : "Error", "message": "Unable to update user data."})
                } else {
                    getUserDatabyUsername(req, res)
                }
            });
        })
    });

module.exports = router;