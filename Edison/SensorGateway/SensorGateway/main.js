////////////////////////////////modules
var util = require('util');
var SerialPort = require('serialport');
var xbee_api = require('xbee-api');
const nodeFunction=require('./nodeFunction');
const frameProcess=require('./frameProcess');
//const openSerialPPort=require('./openSerial');
const transDataProcess=require('./transDataProcess');
var dateFormat = require('dateformat');
const http = require('http');
const url = require('url');

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
var sensorWorkTime=4; //sensor ¿ô¨Ó¨Ïwork 5¬í
var trans_start;
//clearInterval(trans_start);
/////////////////////////////////emergency setting
var emergencyFlag=Boolean(false);
var recoverFlag=Boolean(false);

////////////////////////////////ip setting
var ponte_ip='134.208.3.210';
var gateway_ip="192.168.1.128";
var dataCounter=1;
var protocal_flag=0; //http=0;coap=1;mqtt=2
var trans_frequency=30000;

///////////////////////////////////////////////////////////////////////////////COAP
/*
const coap  = require('coap')
  , coap_server = coap.createServer({
    host: '192.168.1.128',
  })

coap_server.on('request', function(msg, res) {
    var path =msg.url;       //±N¦¬¨ìªº¦ì¸m(path)®³¥X¨Ó¤ñ¹ï 
    var ip2=JSON.stringify(msg.rsinfo);//Åª¨úponte IP
    var ip = JSON.parse(ip2.toString());//Âà¦¨json®æ¦¡Åª¥XIP
    var discovery='/'+gateway_ip+'/sevice_discovery';

    switch (path) {       //®Ú¾Ú¤£¦Pªºpath°µ¤£¦Pªº¨Æ±¡
        case discovery:
            ponte_ip=ip.address;

            frame_obj.data='{\"Command\":1}';
            frame_obj.destination64='000000000000ffff'; //broadcast
            serialport.write(xbeeAPI.buildFrame(frame_obj));
            nodeFunction.doDiscoverNode(sensorNode,actuator);
            
            setTimeout(function() {
                connectedNode=nodeFunction.getConnectedNode();
                console.log('>>'+connectedNode);
                var body=JSON.stringify(connectedNode);
                res.end(body);
                }, 2000);
            break;
            
        
       default:
            console.log('error');
            break;      
       
          
            }
    
  
})
coap_server.listen(5683, function() {
  console.log('COAP is running')
})
*/
//////////////////////////////////////////////////////////////////////////////////////////////HTTP

server = http.createServer(function (req, res) {
      path = url.parse(req.url);
      var ip='';
      var ip2 = req.connection.remoteAddress;//Åª¨úponteªºIP
      for(var i=7;i<ip2.length;i++){
      ip=ip+ip2[i];
      }
    res.writeHead(200, {'Content-Type': 'text/plain'});
    
    var discovery='/'+gateway_ip+'/sevice_discovery';
   
    switch (path.pathname) {
    case discovery:
        ponte_ip=ip;
            
        frame_obj.data='{\"Command\":1}';
        frame_obj.destination64='000000000000ffff'; //broadcast
        serialport.write(xbeeAPI.buildFrame(frame_obj));
        nodeFunction.doDiscoverNode(sensorNode,actuator);

        setTimeout(function() {
            connectedNode=nodeFunction.getConnectedNode();
            console.log('>>'+connectedNode);
            body=JSON.stringify(connectedNode);
            res.end(body);
            }, 2000);
        break;
            
     case 'gateway_ip/ON':
           
            if(actuator.length>0){
                frame_obj.data="{\"Command\":1}";
                frame_obj.destination64=actuator[0].UUID;
                serialport.write(xbeeAPI.buildFrame(frame_obj));
                res.end('ON');
            }
             res.end('NO ACTUATOR');
            console.log(path.pathname);
            break;
            
        default:
            console.log('error');
            break;
            
    }
});
server.listen(3001, function() {
console.log('HTTP is running');
});

///////////////////////////////////////////////////////////////////// MQTT
/*
var mqtt   = require('mqtt'); 

var client = mqtt.connect('mqtt://'+ponte_ip +':1883');

var sevice_discovery_topic = gateway_ip+'/sevice_discovery';

client.on('connect', function () {
   client.subscribe(sevice_discovery_topic);
   console.log('MQTT is running')
});
/*
client.on('message', function (topic, message) {
  // message is Buffer
  console.log(message.toString());
    //sendURL(discovery_data);//©I¥s¤èªk°e¥XURL
    frame_obj.data='{\"Command\":1}';
    frame_obj.destination64='000000000000ffff'; //broadcast
    serialport.write(xbeeAPI.buildFrame(frame_obj));
    nodeFunction.doDiscoverNode(sensorNode,actuator);

    setTimeout(function() {
        connectedNode=nodeFunction.getConnectedNode();
        console.log('>>'+connectedNode);
            
        var ip=gateway_ip;//gateway IP
        var topic=ip+'/discovery_url';
        var payload=connectedNode;
        var client =mqtt.connect('mqtt://'+ponte_ip);//ponte ip
        client.publish(topic,JSON.stringify(connectedNode),{retain:true});
       
          
            }, 2000);
});
//°e¥XURL
function sendURL(payloads){
var ip=gateway_ip;//gateway IP
var topic=ip+'/discovery_url';
var payload=payloads;
var client =mqtt.connect('mqtt://'+ponte_ip);//ponte ip
client.publish(topic,JSON.stringify(payloads),{
  retain:true
})
console.log(payloads);
}
*/


////////////////////////////////////////////////////////////////////
if(ponte_ip!=''){
    setTimeout(function() {
        frame_obj.data='{\"Command\":1}';
        frame_obj.destination64='000000000000ffff'; //broadcast
        serialport.write(xbeeAPI.buildFrame(frame_obj));
                }, 2000);
   
       
put_sensor_data(sensorData);//¤Á¦nsensor data³£­n°õ¦æ³o­Ó¤èªk,°e¥Xsensor data
}

function put_sensor_data(sensor_data){
    
        switch(protocal_flag){
        case 0:
            trans_start=setInterval(http_put_sensor_data_to_ponte,trans_frequency,sensor_data);
            break;

         case 1:
            trans_start=setInterval(coap_put_sensor_data_to_ponte,trans_frequency,sensor_data);
            break;

         case 2:
            trans_start=setInterval(mqtt_put_sensor_data_to_ponte,trans_frequency,sensor_data);
            break;

    }
   
}

function coap_put_sensor_data_to_ponte(payload){
    var now = new Date();
    dataCounter++;
    payload.push(dateFormat(now, "isoDateTime"));

    var sensor_data_topic=gateway_ip;
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
  
console.log(dateFormat(now, "h:MM:ss.l"));
sensorData.length=0;
req.end()
}

function http_put_sensor_data_to_ponte(payload){
    var now = new Date();
    dataCounter++;
    payload.push(dateFormat(now, "isoDateTime"));

    var sensor_data_topic=gateway_ip;   
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
    console.log(dateFormat(now, "h:MM:ss.l"));
    sensorData.length=0;

}

function mqtt_put_sensor_data_to_ponte(payloads){
var ip=gateway_ip;//gateway ip
var topic=ip;//sensordata topic
var now = new Date();
dataCounter++;
payloads.push(dateFormat(now, "isoDateTime"));
var client =mqtt.connect('mqtt://'+ponte_ip+':1883');
client.publish(topic,JSON.stringify(payloads),{
  retain:true
})

    console.log(dateFormat(now, "h:MM:ss.l"));
    
    sensorData.length=0;

}



/////////////////////////////////xbee action
// All frames parsed by the XBee will be emitted here
xbeeAPI.on('frame_object', function (frame) {
    

    if(frame.type===139) {  // transmit
        }
    
    
    else if(frame.type===144){ //receive
            receiveData=frameProcess.preProcess(frame);
        
            //event 0:confirm gate way ; 1:normal data send ; 2:emergency send
            switch (receiveData.E) { 
                    
                //receive confirm gateway
                case 0:
                    nodeFunction.checkNode(sensorNode,actuator,receiveData);
                    break;
                
                //receive sensor data
                case 1:
                    delete receiveData.E; 
                    var sensorNodeNumber=nodeFunction.findNode(sensorNode,receiveData);
                    
                    if(sensorNodeNumber===-1){     //not found
                       // console.log('>> fail ,not registered (normal)');
                        
                    }
                    else{
                        //console.log('>> receive sensor data');
                        // node ¿ô¨Ó ¡AX¬í«áºÎÄ±
                        sensorNode[sensorNodeNumber].wakeup=true;
                        setTimeout(function(){sensorNode[sensorNodeNumber].wakeup=false},sensorWorkTime*1000);
                        
                        //record sleep mode;
                        sensorNode[sensorNodeNumber].SM=receiveData.SM;
                        
                        //emergence mode
                        if(emergencyFlag===true){
                            setTimeout(function(){
                            frame_obj.data='{\"Command\":100}';
                            frame_obj.destination64=frame.remote64; //broadcast
                            serialport.write(xbeeAPI.buildFrame(frame_obj));
                            },500);
                        
                        }
                        recoverFlag=false;
                        
                        // put data to ponte
                       sensorData.push(transDataProcess.payloadPreProcess(receiveData));
                       
                       
                    }
                    
                    break;
                 
                //receive emergency
                case 2:
                    delete receiveData.E; 
                    var sensorNodeNumber=nodeFunction.findNode(sensorNode,receiveData);
                    
                    if(sensorNodeNumber===-1){     //not found
                        //console.log('>> fail ,not registered(emergence) ');
                        
                    }
                    else{
                       // console.log('>> receive emergence');
                        if(recoverFlag===true){
                            frame_obj.data='{\"Command\":200}';
                            frame_obj.destination64=frame.remote64; //broadcast
                            serialport.write(xbeeAPI.buildFrame(frame_obj));
                            emergencyFlag=true;
                            return;
                        }
                        frame_obj.data='{\"Command\":100}';
                        frame_obj.destination64='000000000000ffff'; //broadcast
                        serialport.write(xbeeAPI.buildFrame(frame_obj));
                        emergencyFlag=true;
                    }
                    break;
                    
                case 3:
                    delete receiveData.E; 
                    var sensorNodeNumber=nodeFunction.findNode(sensorNode,receiveData);
                    
                    if(sensorNodeNumber===-1){     //not found
                        console.log('>> fail ,not registered ');
                        
                    }
                    else{
                        console.log('>> receive recover');
                        emergencyFlag=false;
                        recoverFlag=true;
                            
                        //send recover command
                        frame_obj.data='{\"Command\":200}';
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

            }
        
           
            
        }
});


