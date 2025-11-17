const winston=require('winston');
const responseTime=require('response-time');
require('dotenv').config();

const transports= [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
        winston.format.printf(({timestamp,level,message})=> `${timestamp} [${level}]: ${message}`)
      )
    })
];
if(process.env.NODE_ENV === 'development'){
  transports.push(
  new winston.transports.File({ filename: 'error.log', level: 'error' }),
  new winston.transports.File({ filename: 'combined.log' })
)
}

const logger=winston.createLogger({
    level:'info',
    format: winston.format.combine(
        winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
         winston.format.errors({stack:true}),
        winston.format.printf(({timestamp,level,message})=> `${timestamp} [${level.toUpperCase()}]: ${message}`)
    ),
     transports
});

const httpLogger=responseTime((req,res,time)=>{
   const method=req.method || 'No_Method';
   const route=req.url || 'No_Route';
   const statusCode=res.statusCode || 'No_Status';
   const latency=`${time.toFixed(2)}ms`;

   let level='info'
   if(statusCode>=500){
    level='error'
   }
   else if(statusCode>=400){
    level='warn'
   }

   const logMessage=`${statusCode}: (${method.toUpperCase()}) ${route} (${latency})`;

   logger.log(level,logMessage);

});

module.exports={logger,httpLogger}