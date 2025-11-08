const supertest=require('supertest');
const {app}=require("../index");
const redisClient=require("../config/redis");
const {mongoose}=require("mongoose");
const {emailWorker}=require("../service/queueService/worker");
const {emailQueue}=require("../service/queueService/queue");

describe("Testing the entry backend endpoint",()=>{
    it('entry backend endpoint should work fine',async()=>{
       const response=await supertest(app).get('/');
       expect(response.statusCode).toBe(200);
    })
});
describe("Testing the healthcheck endpoint",()=>{
    it('Healthcheck endpoint should work fine',async()=>{
       const response=await supertest(app).get('/health');
       expect(response.statusCode).toBe(200);
    })
});
describe("Testing the Authenticated endpoint",()=>{
    it('Get Key endpoint should be Authenticated',async()=>{
       const response=await supertest(app).get('/api/getkey');
       expect(response.statusCode).toBe(401);
    })
});

afterAll(async()=>{
    await emailWorker.close();
    await emailQueue.close();
    await redisClient.quit();
    await mongoose.disconnect();
});
