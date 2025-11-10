const {Queue} = require('bullmq');
require('dotenv').config();

const emailQueue = new Queue('emailQueue', {
    connection: {
        url: process.env.REDIS_URL
    }
});

const addToQueue = async(emailData) => {
    try {
        await emailQueue.add('sendSuccessEmail', emailData);
        console.log("Job added to email queue");   
    } catch (error) {
        console.error("Error adding job to email queue:", error);
    }
}

module.exports = {addToQueue,emailQueue};