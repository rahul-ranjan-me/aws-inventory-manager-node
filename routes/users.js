const express = require('express')
,   fileUpload = require('express-fileupload')
,   formidable = require('formidable')
,   util = require('util')
,   router = express.Router()
,   fs = require('fs')
,   Verify = require('./verify')
,   config = require('../config')
,   bcrypt = require('bcryptjs')
,   AWS = require('aws-sdk')
,   tableName = "USER_TABLE"

AWS.config.update({region: 'us-east-1'})
const ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'})
const s3 = new AWS.S3();
const s3Stream = require('s3-upload-stream')(s3)
var docClient = new AWS.DynamoDB.DocumentClient()

router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.post('/register', (req, res) => {
    var form = new formidable.IncomingForm()
    , buffer=null, ext, fields;

    form.on('file', (field, file) => {
        fileName = file.name;
        buffer = fs.readFileSync(file.path);
        ext = fileName.substring(fileName.lastIndexOf('.'), fileName.length)
    });

    form.parse(req, function(err, fields, files) {
        if (err) {
            console.error(err.message);
            return;
        }
        
        const S3Params = {
            Bucket: "aws-inventory-manager-node",
            Key: (Math.floor(Math.random() * 1000000000)).toString()+ext,
            Body: buffer
        };
    
        s3.upload(S3Params, function(err, uploadFile) {
            if (err) { throw err; }
            fields.admin = fields.admin == 'true' ? true : false;
            var params = {
                TableName: tableName,
                ExpressionAttributeValues: {
                    ':username': {S: fields.username}
                },
                FilterExpression: 'contains (username, :username)',
            };
        
            // Call DynamoDB to read the item from the table
            ddb.scan(params, function(err, data) {
                if(data.items && data.items.length > 0){
                    res.send({"status": "error", "message": "Username already taken"})
                    return;
                }
        
                var salt = bcrypt.genSaltSync(10)
                ,   hash = bcrypt.hashSync("B4c0/\/", salt);
                
                var params = {
                    TableName: tableName,
                    Item: {
                        'USER_ID' : {S: (Math.floor(Math.random() * 1000000000)).toString()},
                        'username' : {S: fields.username},
                        'admin': {BOOL: fields.admin},
                        'firstName' : {S: fields.firstName},
                        'lastName' : {S: fields.lastName},
                        'birthMonth' : {S: fields.birthMonth},
                        'birthDay' : {N: fields.birthDay},
                        'birthYear' : {N: fields.birthYear},
                        'gender' : {S: fields.gender},
                        'mobile' : {S: fields.mobile},
                        'email' : {S: fields.email},
                        'location' : {S: fields.location},
                        'password' : {S: hash},
                        'profilePic': {S: uploadFile.Location}
                    }
                };
                // Call DynamoDB to add the item to the table
                ddb.putItem(params, function(err, data) {
                    if (err) {
                        res.send({"status": "Error", "error": err});
                    } else {
                        res.send({"status": "Registration Successful!", "error": err});
                    }
                });
            })
        });
        
    });

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
        if (err) {
            res.status(401).json({"success": false, status:"Error", error: err})
            return;
        } else if (!user){
            res.status(401).json({"success": false, status:"User not found", error: err})
            return;
        }
        let user;
        if(data && data.Items && data.Items[0]) {
            user = data.Items[0] 
        } else {
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