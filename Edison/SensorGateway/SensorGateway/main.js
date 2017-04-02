/////////////////////////////////serial port bug fix
"use strict" ;
var cfg = require("./utl/cfg-app-platform.js")() ;   
//cfg.identify() ;     
if( !cfg.test() ) {
    process.exit(1) ;
}

if( !cfg.init() ) {
    process.exit(2) ;
}

cfg.io = new cfg.mraa.Uart(cfg.ioPin) ;         // construct our I/O object
cfg.ioPath = cfg.io.getDevicePath() ;   
cfg.io.setBaudRate(9600) ;
cfg.io.setMode(8, cfg.mraa.UART_PARITY_NONE, 1) ;
cfg.io.setFlowcontrol(false, false) ;
cfg.io.setTimeout(0, 0, 0) ;    

/////////////////////////////////xbee setting
var util = require('util');
var SerialPort = require('serialport');
var xbee_api = require('xbee-api');

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
var sensorWorkTime=5; //sensor 醒來使work 5秒

// sensor 及 actuator 處存格式
function NodeStruct(address,type) {
  this.UUID = address;
  this.TYPE=type;
  this.wakeup=false; 
}

// check node is exsist
function checkNode(address,type){
    
    //type <100:sensor ; >100 actuator
     if(type<100){
         for(var i=0;i<sensorNode.length;i++){
         if(sensorNode[i].UUID===address){
             return;
            }
         }
         console.log('>> sensor register ');
         sensorNode.push(new NodeStruct(address,type));
     }
    
     else{
         for(var i=0;i<actuator.length;i++){
         if(actuator[i].UUID===address){
             return;
            }
         }
         console.log('>> actuator register ');
         actuator.push(new NodeStruct(address,type));
         
     }

}


//find which node send data，return node number ,if not found return -1 
function findNode(address){
    for(var i=0;i<sensorNode.length;i++){
         if(sensorNode[i].UUID===address){
             return i;
         }
     }
    return -1;
    
}

// data to send
var dataToSend=[];
var discoverNode="";
//discover
function toDiscoverNode(){
    discoverNode="";

    for(var i=0;i<sensorNode.length;i++){
        if(discoverNode===""){
            discoverNode=JSON.stringify(sensorNode[i]);
        }
        else{
            discoverNode=discoverNode+","+JSON.stringify(sensorNode[i]);
        }
        
    }
    for(var i=0;i<actuator.length;i++){
        if(discoverNode===""){
            discoverNode=JSON.stringify(actuator[i]);
        }
        else{
            discoverNode=discoverNode+","+JSON.stringify(actuator[i]);
        }
    }
    
    console.log('>>'+discoverNode);
}

/////////////////////////////////emergency setting
var emergencyFlag=Boolean(false);


/////////////////////////////////coap setting
const coap  = require('coap')
  , server = coap.createServer({
    host: '192.168.1.128',
  }), port = 5683



/////////////////////////////////coap server
server.on('request', function(msg, res) {
    var path =msg.url;       //將收到的位置(path)拿出來比對 
    
    
    switch (path) {       //根據不同的path做不同的事情
            
        case'/Discover':
            frame_obj.data='{\"Command\":0}';
            frame_obj.destination64='000000000000ffff'; //broadcast
            serialport.write(xbeeAPI.buildFrame(frame_obj));
            
            setTimeout(toDiscoverNode,1000);
            
            
            break;
            
        case '/TV_ON':
            frame_obj.data="{\"Command\":1}";
            serialport.write(xbeeAPI.buildFrame(frame_obj));
            console.log(path);
            break;
            
        case '/light_ON':
            frame_obj.data="{\"Command\":2}";
            serialport.write(xbeeAPI.buildFrame(frame_obj));
            console.log(path);
            break;
            
        case '/TV_OFF':
           
            frame_obj.data="{\"Command\":3}";
            serialport.write(xbeeAPI.buildFrame(frame_obj));
            console.log(path);
            
            break;
        case '/light_OFF':
            frame_obj.data="{\"Command\":4}";
            serialport.write(xbeeAPI.buildFrame(frame_obj));
            console.log(path);
            break;
          
            }
    
    res.end(path) //回傳給client端
})
server.listen(5683, function() {

  console.log('Server is listening')
})


/////////////////////////////////xbee action
// All frames parsed by the XBee will be emitted here
xbeeAPI.on('frame_object', function (frame) {
    

    if(frame.type===139) {  // transmit

        }
    
    
    else if(frame.type===144){ //receive
            /*  frame format
            type: 144,
            remote64: '0013a20040c8d185',
            remote16: '11d1',
            receiveOptions: 1,
            data:
            
            receiveData format
            { SM: 1, H: 17, T: 24, E: 1, UUID: '0013a20040c8d185' }*/
     
            
            console.log('>'+frame.data.toString('ascii'));
        
            //delete the end null data of xbee receive data
            var deleteNull = /\0/g;
            var receiveRawData = frame.data.toString().replace(deleteNull, "");   
        
            //把資料處理成json
            var receiveData = JSON.parse(receiveRawData);
        
            //把MAC位置加入json
            receiveData.UUID=frame.remote64;
            
    
            //event 0:confirm gate way ; 1:normal data send ; 2:emergency send
            switch (receiveData.E) { 
                    
                //receive confirm gateway
                case 0:
                    checkNode(frame.remote64,receiveData.Type);
                    break;
                
                //receive sensor data
                case 1:
                    var sensorNodeNumber=findNode(frame.remote64);
                    
                    if(sensorNodeNumber===-1){     //not found
                        console.log('>> fail ,not registered ');
                        
                    }
                    else{
                        // node 醒來 ，X秒後睡覺
                        sensorNode[sensorNodeNumber].wakeup=true;
                        setTimeout(function(){sensorNode[sensorNodeNumber].wakeup=false},sensorWorkTime*1000);
                        
                        console.log('>> receive sensor data');
                        
                        
                        // put data to payload
                        dataToSend.push(receiveData);
                        console.log(dataToSend);
                    }
                    
                    break;
                 
                //receive emergency
                case 2:
                    var sensorNodeNumber=findNode(frame.remote64);
                    
                    if(sensorNodeNumber===-1){     //not found
                        console.log('>> fail ,not registered ');
                        
                    }
                    else{
                        console.log('>> receive emergence');
                        
                        emergencyFlag=true;
                        dataToSend.push(receiveData);
                    }
                    
                   
                    
                    break;
                    

            }
        
           
            
        }
});


