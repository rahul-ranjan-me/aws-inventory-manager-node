// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
AWS.config.getCredentials(function(err) {
    if (err) console.log(err.stack);
    // credentials not loaded
    else {
        console.log("Access key:", AWS.config.credentials.accessKeyId);
        console.log("Secret access key:", AWS.config.credentials.secretAccessKey);
    }
});

// Create the DynamoDB service object
var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

var params = {
  AttributeDefinitions: [
    {
        AttributeName: 'USER_ID',
        AttributeType: 'S'
    },
    {
        AttributeName: 'username',
        AttributeType: 'S'
    }
  ],
  KeySchema: [
    {
        AttributeName: 'USER_ID',
        KeyType: 'HASH'
    },
    {
        AttributeName: 'username',
        KeyType: 'RANGE'
    }
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 1,
    WriteCapacityUnits: 1
  },
  TableName: 'USER_TABLE',
  StreamSpecification: {
    StreamEnabled: false
  }
};

// Call DynamoDB to create the table
ddb.createTable(params, function(err, data) {
  if (err) {
    console.log("Error", err);
  } else {
    console.log("Table Created", data);
  }
});