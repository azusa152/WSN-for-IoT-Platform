var dateFormat = require('dateformat');
var utcTime=dateFormat(new Date(),"isoUtcDateTime");

function addHumidity(transData,receiveData){
    if(receiveData.H!=undefined){
        var uuid=receiveData.UUID+'/'+'1001'
        if(transData===''){
           transData='{\"UUID\":'+uuid+'\"DATA\":'+receiveData.H+',\"utcTime\":'+utcTime+'}';
            return transData;
        }
        transData=transData+','+'{\"UUID\":'+uuid+'\"DATA\":'+receiveData.H+',\"utcTime\":'+utcTime+'}';
        return transData;
    }
    
}
function addTemperature (transData,receiveData){
    if(receiveData.T!=undefined){
        var uuid=receiveData.UUID+'/'+'1002'
        if(transData===''){
           transData='{\"UUID\":'+uuid+'\"DATA\":'+receiveData.T+',\"utcTime\":'+utcTime+'}';
            return transData;
        }
        transData=transData+','+'{\"UUID\":'+uuid+'\"DATA\":'+receiveData.T+',\"utcTime\":'+utcTime+'}';
        return transData;
    }
    
}
exports.payloadPreProcess= function  (receiveData){
    var transProcessData='';
    
    transProcessData=addHumidity(transProcessData,receiveData);
    transProcessData=addTemperature(transProcessData,receiveData);
    return transProcessData;
   
}
/*
    payload
    [ { H: 61,
    T: 24,
    UUID: '0013a20040694fa0' } ]
    
    ->
    
    [ {UUID:'0013a20040694fa0/50',DATA:61},
      {UUID:'0013a20040694fa0/51',DATA:24},
    ]
    
    
    discover
    "{\"UUID\":\"0013a20040c8d185\",\"TYPE\":0,\"SLEEP_MODE\":1,\"wakeup\":false}"
    
    ->
    
    {\"UUID\":\"0013a20040c8d185\TYPE",DATA:0},
    {\"UUID\":\"0013a20040c8d185\SLEEP_MODE",DATA:1}
  
  */