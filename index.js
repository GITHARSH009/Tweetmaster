const express=require('express');
const cors=require('cors');
const app=express()
const dotenv=require('dotenv')
dotenv.config();
const port=process.env.Port || 8002
app.use(cors());
app.use(express.json());
require("./conn");


const router=require("./route");

app.use(router);

app.get("/",(req,res)=>{
    res.send(`Hello World`);
});


app.listen(port,()=>{
    console.log(`Server is running`)
})