const {Queue} = require('bullmq');
require('dotenv').config();
const {logger}=require("../../middleware/logger");

const emailQueue = new Queue('emailQueue', {
    connection: {
        url: process.env.REDIS_URL
    }
});

const addToQueue = async(emailData) => {
    try {
        await emailQueue.add('sendSuccessEmail', emailData);
        logger.info("Job added to email queue");   
    } catch (error) {
        logger.error("Error adding job to email queue:", error);
    }
}

module.exports = {addToQueue,emailQueue};