const {Worker}=require('bullmq');
require('dotenv').config();
const {sendEmailNotification}=require("../emailService");
// const redisClient=require('../../config/redis');
const {logger}=require("../../middleware/logger");

const emailWorker=new Worker("emailQueue",async(job)=>{
    const {userEmail,userName,amount,transactionId}=job.data;
    await sendEmailNotification({userEmail,userName,amount,transactionId});
},{
    connection:{
        url:process.env.REDIS_URL
    }
});

emailWorker.on('completed',(job,result)=>{
    logger.info(`✅ Email job ${job.id} completed successfully.`);
});
emailWorker.on('failed',(job,err)=>{
    logger.error(`❌ Email job ${job.id} failed with error:`,err);
});

module.exports={emailWorker};