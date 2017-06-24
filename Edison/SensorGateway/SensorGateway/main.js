////////////////////////////////modules
var util = require('util');
var SerialPort = require('serialport');
var xbee_api = require('xbee-api');
const nodeFunction=require('./module/nodeFunction');
const frameProcess=require('./module/frameProcess');
//const openSerialPPort=require('./openSerial');
const transDataProcess=require('./module/transDataProcess');
var dateFormat = require('dateformat');
const http = require('http');
const url = require('url');
var Base64 = require('js-base64').Base64;
var mqtt   = require('mqtt'); 
/////////////////////////////////serial port bug fix
//openSerialPPort.openMySerialPort();

/////////////////////////////////xbee setting
var xbeeAPI = new xbee_api.XBeeAPI({
    api_mode: 2
});

var serialport = new SerialPort("/dev/ttyMFD1", {
    baudrate: 9600,
    parser: xbeeAPI.rawParser()
});

var frame_obj = { 
        type: 0x10, 
        id: 0x01, 
        destination64: '000000000000ffff',
        broadcastRadius: 0x00,
        options: 0x00, 
        data: '0'
    };  


/////////////////////////////////sensor setting
var sensorNode=[];
var actuator=[];
var sensorData=[];
var connectedNode='';
var sensorWorkTime=4; //sensor

/////////////////////////////////emergency setting
var emergencyFlag=Boolean(false);
var recoverFlag=Boolean(false);

////////////////////////////////ip setting
var ponte_ip='134.208.3.206';
var gateway_ip="192.168.1.142";
var gateway_uuid=Base64.encodeURI(gateway_ip);


///////////////////////////////////////////////////////////////////////////////COAP
/*
const coap  = require('coap')
  , coap_server = coap.createServer({
    host: '192.168.1.128',
  })
coap_server.on('request', function(msg, res) {
    var path =msg.url;       //將收到的位置(path)拿出來比對
    var ip2=JSON.stringify(msg.rsinfo);//讀取ponte IP
    var ip = JSON.parse(ip2.toString());//轉成json格式讀出IP
      switch (path) {       //根據不同的path做不同的事情
        case '/'+gateway_uuid+'/discovery_request':
            ponte_ip=ip.address;//ip.address為ponte IP
            frame_obj.data='{\"Command\":1}';
            frame_obj.destination64='000000000000ffff'; //broadcast
            serialport.write(xbeeAPI.buildFrame(frame_obj));
            nodeFunction.doDiscoverNode(sensorNode,actuator);
              
                    
            setTimeout(function() {
                connectedNode=nodeFunction.getConnectedNode();
                connectedNode='{'+connectedNode+'}';
                console.log('>>'+connectedNode);
                res.end(connectedNode);
            }, 2000);
            break;
              
        case '/'+gateway_uuid+'/Actuator':
            var bodydata=""+msg.payload;
            //format:MTkyLjE2OC4xLjEyOA/0013a20040c8d185/1001/1
            var bodySplit = bodydata.toString().split("/"); 
            var ReceiveUUID=bodySplit[1];
            var ReceiveTYPE=bodySplit[2];
            var ReceiveACTION=bodySplit[3];
            
              
           
                if(ReceiveTYPE<=100){
                    var ActuatorNUMBER=nodeFunction.findNode(actuator,ReceiveUUID);
                    if(ActuatorNUMBER!=-1){
                        switch(ReceiveTYPE){
                            case '1': //relay
                                if(ReceiveACTION==='1"'){
                                    frame_obj.data="{\"Command\":2}";
                                    frame_obj.destination64=ReceiveUUID;
                                    serialport.write(xbeeAPI.buildFrame(frame_obj));
                                    console.log(">>relay on");

                                }
                                else if(ReceiveACTION==='0"'){
                                    frame_obj.data="{\"Command\":3}";
                                    frame_obj.destination64=ReceiveUUID;
                                    serialport.write(xbeeAPI.buildFrame(frame_obj));
                                    console.log(">>relay off");

                                }
                                break;
                        }
                    }
                }
              else{
               
                    var SensorNUMBER=nodeFunction.findNode(sensorNode,ReceiveUUID);
                    if(SensorNUMBER!=-1){
                   
                        switch(ReceiveACTION){
                            case '101"': //short
                               
                                if(sensorNode[SensorNUMBER].wakeup===true){
                                    frame_obj.data="{\"Command\":101}";
                                    frame_obj.destination64=ReceiveUUID;
                                    serialport.write(xbeeAPI.buildFrame(frame_obj));
                                    console.log(">>short sleep"); 
                                }
                                else{
                                    var wakeupCheck=setInterval(function() {
                                        if(sensorNode[SensorNUMBER].wakeup===true){
                                            frame_obj.data="{\"Command\":101}";
                                            frame_obj.destination64=ReceiveUUID;
                                            serialport.write(xbeeAPI.buildFrame(frame_obj));
                                            console.log(">>short sleep"); 
                                            clearInterval(wakeupCheck);
                                        }
                                     }, 1000);
                                }
                                
                                break;
                                
                            case '102"': //short
                                if(sensorNode[SensorNUMBER].wakeup===true){
                                    frame_obj.data="{\"Command\":102}";
                                    frame_obj.destination64=ReceiveUUID;
                                    serialport.write(xbeeAPI.buildFrame(frame_obj));
                                    console.log(">>normal sleep"); 
                                }
                                else{
                                    var wakeupCheck=setInterval(function() {
                                        if(sensorNode[SensorNUMBER].wakeup===true){
                                            frame_obj.data="{\"Command\":102}";
                                            frame_obj.destination64=ReceiveUUID;
                                            serialport.write(xbeeAPI.buildFrame(frame_obj));
                                            console.log(">>normal sleep"); 
                                            clearInterval(wakeupCheck);
                                        }
                                     }, 1000);
                                }
                                
                                break;
                                
                            case '103"': //short
                                if(sensorNode[SensorNUMBER].wakeup===true){
                                    frame_obj.data="{\"Command\":103}";
                                    frame_obj.destination64=ReceiveUUID;
                                    serialport.write(xbeeAPI.buildFrame(frame_obj));
                                    console.log(">>smart sleep"); 
                                }
                                else{
                                    var wakeupCheck=setInterval(function() {
                                        if(sensorNode[SensorNUMBER].wakeup===true){
                                            frame_obj.data="{\"Command\":103}";
                                            frame_obj.destination64=ReceiveUUID;
                                            serialport.write(xbeeAPI.buildFrame(frame_obj));
                                            console.log(">>smart sleep"); 
                                            clearInterval(wakeupCheck);
                                        }
                                     }, 1000);
                                }
                                
                                break;
                               
                        }
                    }

                }
              
            break;
    }
  
})
coap_server.listen(5683, function() {
  console.log('coap is running')
})

function put_sensor_data_to_ponte(payload){

    var sensor_data_topic=payload.UUID;
    delete payload.UUID; 
    
    var req = coap.request({
     host:ponte_ip,//ponte_ip
     port:5683,
     method:'put',
     pathname:'/r/'+sensor_data_topic
    });
    //console.log(payload.DATA);
    req.write(JSON.stringify(payload));
    
    req.on('response', function(res) {
        res.pipe(process.stdout)
        req.on('end', function() {
            res.pipe('end')
        });
    });
    req.end()
    console.log('>>>'+sensor_data_topic);
    console.log('>>>'+JSON.stringify(payload));
}
*/
//////////////////////////////////////////////////////////////////////////////////////////////HTTP
/*
server = http.createServer(function (req, res) {
    path = url.parse(req.url);
    var ponte_address='';
    var ip2 = req.connection.remoteAddress;//讀取ponte的IP
    for(var i=7;i<ip2.length;i++){
      ponte_address=ponte_address+ip2[i];
    }
    res.writeHead(200, {'Content-Type': 'text/plain'});
    
    var discovery='/'+gateway_ip+'/sevice_discovery';
    switch (path.pathname) {
    case '/'+gateway_uuid+'/discovery_request':
        ponte_ip=ponte_address;
        
        frame_obj.data='{\"Command\":1}';
        frame_obj.destination64='000000000000ffff'; //broadcast
        serialport.write(xbeeAPI.buildFrame(frame_obj));
        nodeFunction.doDiscoverNode(sensorNode,actuator);
        
        setTimeout(function() {
            connectedNode=nodeFunction.getConnectedNode();
            connectedNode='{'+connectedNode+'}';
            console.log('>>'+connectedNode);
           
            res.end(connectedNode);
            }, 2000);
        break;
            
            
     case '/'+gateway_uuid+"/Actuator":
           
            if(actuator.length>0){
                
                res.end('ON');
            }
            var bodydata = '';
            req.on('data', function (data) {
                bodydata += data;
            });
            req.on('end', function () {
                //format:MTkyLjE2OC4xLjEyOA/0013a20040c8d185/1001/1
                
                var bodySplit = bodydata.toString().split("/"); 
                var ReceiveUUID=bodySplit[1];
                var ReceiveTYPE=bodySplit[2];
                var ReceiveACTION=bodySplit[3];
        
                if(ReceiveTYPE<=100){
                    var ActuatorNUMBER=nodeFunction.findNode(actuator,ReceiveUUID);
                    if(ActuatorNUMBER!=-1){
                        switch(ReceiveTYPE){
                            case '1': //relay
                                if(ReceiveACTION==='1"'){
                                    frame_obj.data="{\"Command\":2}";
                                    frame_obj.destination64=ReceiveUUID;
                                    serialport.write(xbeeAPI.buildFrame(frame_obj));
                                    console.log(">>relay on");

                                }
                                else if(ReceiveACTION==='0"'){
                                    frame_obj.data="{\"Command\":3}";
                                    frame_obj.destination64=ReceiveUUID;
                                    serialport.write(xbeeAPI.buildFrame(frame_obj));
                                    console.log(">>relay off");

                                }
                                break;
                        }
                    }
                }
                else{
                    
                    var SensorNUMBER=nodeFunction.findNode(sensorNode,ReceiveUUID);
                    if(SensorNUMBER!=-1){
                   
                        switch(ReceiveACTION){
                            case '101"': //short
               
                                if(sensorNode[SensorNUMBER].wakeup===true){
                                    frame_obj.data="{\"Command\":101}";
                                    frame_obj.destination64=ReceiveUUID;
                                    serialport.write(xbeeAPI.buildFrame(frame_obj));
                                    console.log(">>short sleep"); 
                                }
                                else{
                                    var wakeupCheck=setInterval(function() {
                                        if(sensorNode[SensorNUMBER].wakeup===true){
                                            frame_obj.data="{\"Command\":101}";
                                            frame_obj.destination64=ReceiveUUID;
                                            serialport.write(xbeeAPI.buildFrame(frame_obj));
                                            console.log(">>short sleep"); 
                                            clearInterval(wakeupCheck);
                                        }
                                     }, 1000);
                                }
                                
                                break;
                                
                            case '102"': //short
                                if(sensorNode[SensorNUMBER].wakeup===true){
                                    frame_obj.data="{\"Command\":102}";
                                    frame_obj.destination64=ReceiveUUID;
                                    serialport.write(xbeeAPI.buildFrame(frame_obj));
                                    console.log(">>normal sleep"); 
                                }
                                else{
                                    var wakeupCheck=setInterval(function() {
                                        if(sensorNode[SensorNUMBER].wakeup===true){
                                            frame_obj.data="{\"Command\":102}";
                                            frame_obj.destination64=ReceiveUUID;
                                            serialport.write(xbeeAPI.buildFrame(frame_obj));
                                            console.log(">>normal sleep"); 
                                            clearInterval(wakeupCheck);
                                        }
                                     }, 1000);
                                }
                                
                                break;
                                
                            case '103"': //short
                                if(sensorNode[SensorNUMBER].wakeup===true){
                                    frame_obj.data="{\"Command\":103}";
                                    frame_obj.destination64=ReceiveUUID;
                                    serialport.write(xbeeAPI.buildFrame(frame_obj));
                                    console.log(">>smart sleep"); 
                                }
                                else{
                                    var wakeupCheck=setInterval(function() {
                                        if(sensorNode[SensorNUMBER].wakeup===true){
                                            frame_obj.data="{\"Command\":103}";
                                            frame_obj.destination64=ReceiveUUID;
                                            serialport.write(xbeeAPI.buildFrame(frame_obj));
                                            console.log(">>smart sleep"); 
                                            clearInterval(wakeupCheck);
                                        }
                                     }, 1000);
                                }
                                
                                break;
                               
                        }
                    }

                }
                
                
                
            });
        break;
            
        default:
            //console.log('error');
            break;
            
    }
});
server.listen(3001, function() {
console.log('HTTP is running');
    console.log(gateway_uuid);

});

function put_sensor_data_to_ponte(payload){
    var sensor_data_topic=payload.UUID;
    delete payload.UUID; 
    
    var options = {
        "host":ponte_ip, //ponte_ip
        "port":3001,
        "path":"/resources/"+sensor_data_topic,// oxoxoxo/54
        "method":"put"
    };
    callback =function(response){
        var str=''
        response.on('data',function(chunk){
        str += chunk
        })
        response.on('end',function(){
       
        })
    }    
    var body=JSON.stringify(payload);
    http.request(options, callback).end(body);
    console.log('>>>'+sensor_data_topic);
    console.log('>>>'+body);
}
*/
///////////////////////////////////////////////////////////////////// MQTT


var client = mqtt.connect('mqtt://'+ponte_ip +':1883');

var sevice_discovery_topic = gateway_uuid+'/discovery_request';
var Actuator_topic = gateway_uuid+'/Actuator';

client.on('connect', function () {
   client.subscribe(sevice_discovery_topic);
   client.subscribe(Actuator_topic);
   console.log('MQTT is running');

});



client.on('message', function (topic, message) {
  // message is Buffer
  if(topic===Actuator_topic){
    var parse =JSON.parse(message.toString());
    var bodydata=parse.data;
    
     var bodySplit = bodydata.toString().split("/"); 
     var ReceiveUUID=bodySplit[1];
     var ReceiveTYPE=bodySplit[2];
     var ReceiveACTION=bodySplit[3];
                

    if(ReceiveTYPE<=100){
                    var ActuatorNUMBER=nodeFunction.findNode(actuator,ReceiveUUID);
                    if(ActuatorNUMBER!=-1){
                        switch(ReceiveTYPE){
                            case '1': //relay
                                if(ReceiveACTION==='1'){
                                    frame_obj.data="{\"Command\":2}";
                                    frame_obj.destination64=ReceiveUUID;
                                    serialport.write(xbeeAPI.buildFrame(frame_obj));
                                    console.log(">>relay on");

                                }
                                else if(ReceiveACTION==='0'){
                                    frame_obj.data="{\"Command\":3}";
                                    frame_obj.destination64=ReceiveUUID;
                                    serialport.write(xbeeAPI.buildFrame(frame_obj));
                                    console.log(">>relay off");

                                }
                                break;
                        }
                    }
                }
                else{
                    
                    var SensorNUMBER=nodeFunction.findNode(sensorNode,ReceiveUUID);
                    if(SensorNUMBER!=-1){
                   
                        switch(ReceiveACTION){
                            case '101': //short
               
                                if(sensorNode[SensorNUMBER].wakeup===true){
                                    frame_obj.data="{\"Command\":101}";
                                    frame_obj.destination64=ReceiveUUID;
                                    serialport.write(xbeeAPI.buildFrame(frame_obj));
                                    console.log(">>short sleep"); 
                                }
                                else{
                                    var wakeupCheck=setInterval(function() {
                                        if(sensorNode[SensorNUMBER].wakeup===true){
                                            frame_obj.data="{\"Command\":101}";
                                            frame_obj.destination64=ReceiveUUID;
                                            serialport.write(xbeeAPI.buildFrame(frame_obj));
                                            console.log(">>short sleep"); 
                                            clearInterval(wakeupCheck);
                                        }
                                     }, 1000);
                                }
                                
                                break;
                                
                            case '102': //short
                                if(sensorNode[SensorNUMBER].wakeup===true){
                                    frame_obj.data="{\"Command\":102}";
                                    frame_obj.destination64=ReceiveUUID;
                                    serialport.write(xbeeAPI.buildFrame(frame_obj));
                                    console.log(">>normal sleep"); 
                                }
                                else{
                                    var wakeupCheck=setInterval(function() {
                                        if(sensorNode[SensorNUMBER].wakeup===true){
                                            frame_obj.data="{\"Command\":102}";
                                            frame_obj.destination64=ReceiveUUID;
                                            serialport.write(xbeeAPI.buildFrame(frame_obj));
                                            console.log(">>normal sleep"); 
                                            clearInterval(wakeupCheck);
                                        }
                                     }, 1000);
                                }
                                
                                break;
                                
                            case '103': //short
                                if(sensorNode[SensorNUMBER].wakeup===true){
                                    frame_obj.data="{\"Command\":103}";
                                    frame_obj.destination64=ReceiveUUID;
                                    serialport.write(xbeeAPI.buildFrame(frame_obj));
                                    console.log(">>smart sleep"); 
                                }
                                else{
                                    var wakeupCheck=setInterval(function() {
                                        if(sensorNode[SensorNUMBER].wakeup===true){
                                            frame_obj.data="{\"Command\":103}";
                                            frame_obj.destination64=ReceiveUUID;
                                            serialport.write(xbeeAPI.buildFrame(frame_obj));
                                            console.log(">>smart sleep"); 
                                            clearInterval(wakeupCheck);
                                        }
                                     }, 1000);
                                }
                                
                                break;
                               
                        }
                    }

                }
    
  }
    
  else{
    var payloadJSON=JSON.parse(message.toString());
    if(payloadJSON.will_message==="null"){
        // bug avoid
    }
    else{
        var ip=gateway_uuid;//gateway IP
        var topic=ip+'/discovery_response';
        
        
        frame_obj.data='{\"Command\":1}';
        frame_obj.destination64='000000000000ffff'; //broadcast
        serialport.write(xbeeAPI.buildFrame(frame_obj));
        nodeFunction.doDiscoverNode(sensorNode,actuator);
        
        setTimeout(function() {
            connectedNode=nodeFunction.getConnectedNode();
            console.log('>>'+connectedNode);

            var payload={
                "discovery_data":'{'+connectedNode+'}',
                "user_data":payloadJSON
            }
            client.publish(topic,JSON.stringify(payload),{
              retain:true
            })
            
            }, 2000); 

    }

  }

});
function put_sensor_data_to_ponte(payload){
    var sensor_data_topic=payload.UUID;
    delete payload.UUID; 

    client.publish(sensor_data_topic,JSON.stringify(payload),{
      retain:true
    })
    console.log('>>>'+sensor_data_topic);
    console.log('>>>'+JSON.stringify(payload));
}



/////////////////////////////////xbee action
// All frames parsed by the XBee will be emitted here
xbeeAPI.on('frame_object', function (frame) {
    

    if(frame.type===139) {  // transmit
        }
    
    
    else if(frame.type===144){ //receive
            receiveData=frameProcess.preProcess(frame);
        
            //event 0:confirm gate way ; 1:normal data send ; 2:emergency send
            switch (receiveData.EVENT) { 
                    
                //receive confirm gateway
                case 0:
                    nodeFunction.checkNode(sensorNode,actuator,receiveData);
                    break;
                
                //receive sensor data
                
                 
                //receive emergency
                case 2:
                    delete receiveData.EVENT; 
                    var sensorNodeNumber=nodeFunction.findNode(sensorNode,receiveData.UUID);
                    
                    if(sensorNodeNumber===-1){     //not found
                        //console.log('>> fail ,not registered(emergence) ');
                        
                    }
                    else{
                       // console.log('>> receive emergence');
                        if(recoverFlag===true){
                            frame_obj.data='{\"Command\":202}';
                            frame_obj.destination64=frame.remote64; //broadcast
                            serialport.write(xbeeAPI.buildFrame(frame_obj));
                            emergencyFlag=true;
                            return;
                        }
                        frame_obj.data='{\"Command\":201}';
                        frame_obj.destination64='000000000000ffff'; //broadcast
                        serialport.write(xbeeAPI.buildFrame(frame_obj));
                        emergencyFlag=true;
                    }
                    break;
                    
                case 3:
                    delete receiveData.EVENT; 
                    var sensorNodeNumber=nodeFunction.findNode(sensorNode,receiveData.UUID);
                    
                    if(sensorNodeNumber===-1){     //not found
                        console.log('>> fail ,not registered ');
                        
                    }
                    else{
                        console.log('>> receive recover');
                        emergencyFlag=false;
                        recoverFlag=true;
                            
                        //send recover command
                        frame_obj.data='{\"Command\":202}';
                        frame_obj.destination64='000000000000ffff'; //broadcast
                        serialport.write(xbeeAPI.buildFrame(frame_obj));
                        console.log('>> send recover');
                            
                        setTimeout(function(){
                            frame_obj.destination64=receiveData.UUID; //broadcast
                            serialport.write(xbeeAPI.buildFrame(frame_obj));
                            console.log('>> send node recover');
                            },500);
                    }
                    

                    break;
                    
                case 4:
                    break;
                    
                default:
                    
                    delete receiveData.EVENT; 
                    var sensorNodeNumber=nodeFunction.findNode(sensorNode,receiveData.UUID);
                    
                    if(sensorNodeNumber===-1){     //not found
                        console.log('>> fail ,not registered (normal)');      
                    }
                    else{
                        console.log('>> receive sensor data');
                        sensorNode[sensorNodeNumber].wakeup=true;
                        setTimeout(function(){sensorNode[sensorNodeNumber].wakeup=false},sensorWorkTime*1000);
                        //emergence mode
                        if(emergencyFlag===true){
                            setTimeout(function(){
                            frame_obj.data='{\"Command\":201}';
                            frame_obj.destination64=frame.remote64; //broadcast
                            serialport.write(xbeeAPI.buildFrame(frame_obj));
                            },500);
                        
                        }
                        recoverFlag=false;
                        
                        // put data to ponte
                       sensorData=transDataProcess.payloadPreProcess(receiveData,gateway_uuid);
                       for(var i=0;i<sensorData.length;i++){
                           if(ponte_ip!=''){
                                put_sensor_data_to_ponte(sensorData[i]);
                            }
                       }
                       sensorData.length=0; //clear sensor data
                    }
                    
                    break;
                    

            }
        
           
            
        }
});
