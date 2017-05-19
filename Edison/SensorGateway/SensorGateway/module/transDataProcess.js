var dateFormat = require('dateformat');
var sensorData=[];
var gatewayUUID;

function NodeStruct(uuid,data,time) {
  this.UUID =gatewayUUID+'/'+uuid;
  this.DATA=data;
  this.TIME=time;
}
function addHumidity(receiveData){
  
    if(receiveData.H!=undefined){
        var utcTime=dateFormat(new Date(),"isoUtcDateTime");
        var uuid=receiveData.UUID+'/'+'1001'
        sensorData.push(new NodeStruct(uuid,receiveData.H,utcTime));
    }   
}
function addTemperature (receiveData){
    if(receiveData.T!=undefined){
        var utcTime=dateFormat(new Date(),"isoUtcDateTime");
        var uuid=receiveData.UUID+'/'+'1002'
        sensorData.push(new NodeStruct(uuid,receiveData.T,utcTime));
    }   
}
exports.payloadPreProcess= function  (receiveData,gateway_uuid){
    sensorData.length=0;
    gatewayUUID=gateway_uuid;
    addHumidity(receiveData);
    addTemperature(receiveData);
  
    return sensorData;
   
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