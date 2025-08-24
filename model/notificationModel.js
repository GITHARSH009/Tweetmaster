const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
    message: { type: String, required: true },
    notifyTo: { type: String, default: "everyone" }, // New field to notify specific users
    timestamp: { type: Date, default: Date.now },
});

const Notification=new mongoose.model("Notification", NotificationSchema);

module.exports = Notification;
