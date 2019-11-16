// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');
// Set the region 
AWS.config.update({region: 'us-east-1'});

// Create the DynamoDB service object
var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

var params = {
  TableName: 'INVENTORY_LIST',
  Item: {
    'CUSTOMER_ID' : {N: '001'},
    'location' : {S: 'Gurgaon'},
    'type' : {S: 'Desk'},
    'isAvailable' : {B: '1'},
    'seat' : {S: '087'},
    'isWebCamAvailable' : {B: 'Yes'},
    'isHeadPhoneAvailable' : {B: 'Yes'},
    'bookedBy' : {S: 'Ram'},
    'bookedByUserId' : {S: 'ranjrul'},
    'location' : {S: 'Gurgaon'},
    'bookedFrom' : {N: '23423424'},
    'bookedOn' : {N: '242423'},
    'bookedTill' : {N: '234242'}
  }
};

// Call DynamoDB to add the item to the table
ddb.putItem(params, function(err, data) {
  if (err) {
    console.log("Error", err);
  } else {
    console.log("Success", data);
  }
});