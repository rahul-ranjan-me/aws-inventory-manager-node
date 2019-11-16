var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var inventorySchema = new Schema(
	{
		location: {
			type: String,
			required: true
		},
		type: {
			type: String,
			required: true
		},
		isAvailable: {
			type: Boolean,
			default: true
		},
		details : {
			desktopDetails: {
				seat : {
					type: String
				},
				isWebCamAvailable : {
					type: Boolean,
					default: false
				},
				isHeadPhoneAvailable : {
					type: Boolean,
					default: false
				}
			}
		},
		bookedBy: String,
		bookedByUserId: String,
		bookedFrom: Number,
		bookedOn: Number,
		bookedTill: Number
	},
	{
		timestamps: true,
	}
);

var Inventories = mongoose.model('Inventory', inventorySchema);

module.exports = Inventories;