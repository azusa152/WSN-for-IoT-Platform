/////////////////////////////////serial port bug fix
"use strict" ;
var cfg = require("./utl/cfg-app-platform.js")() ;   
cfg.identify() ;     
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

function NodeStruct(address,type) {
  this.address = address;
  this.type=type;
}


function checkSensorNode(address,type){
     for(var i=0;i<sensorNode.length;i++){
         if(sensorNode[i].address===address){
             return;
         }
     }
     sensorNode.push(new NodeStruct(address,type));
    
}
function checkActuator(address,type){
     for(var i=0;i<sensorNode.length;i++){
         if(actuator[i].address===address){
             return;
         }
     }
     actuator.push(new NodeStruct(address,type));
    
}

/////////////////////////////////coap setting
const coap  = require('coap')
  , server = coap.createServer({
    host: '192.168.1.128',
  }), port = 5683



/////////////////////////////////coap server
server.on('request', function(msg, res) {
    var path =msg.url;       //將收到的位置(path)拿出來比對 
    frame_obj.data="0";
    serialport.write(xbeeAPI.buildFrame(frame_obj));
    
    switch (path) {       //根據不同的path做不同的事情
        case '/TV_ON':
            frame_obj.data="1";
            serialport.write(xbeeAPI.buildFrame(frame_obj));
            console.log(path);
            break;
            
        case '/light_ON':
            frame_obj.data="2";
            serialport.write(xbeeAPI.buildFrame(frame_obj));
            console.log(path);
            break;
            
        case '/TV_OFF':
           
            frame_obj.data="3";
            serialport.write(xbeeAPI.buildFrame(frame_obj));
            console.log(path);
            
            break;
        case '/light_OFF':
            frame_obj.data="4";
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
        /*  type: 144,
            remote64: '0013a20040c8d185',
            remote16: '11d1',
            receiveOptions: 1,
            data:*/

            console.log('>>');
            console.log(frame.data.toString('ascii'));
            //delete the end null data of xbee receive data
        
            var deleteNull = /\0/g;
            var receiveRawData = frame.data.toString().replace(deleteNull, "");   
            //把資料處理成json
            var receiveData = JSON.parse(receiveRawData);
            //把MAC位置加入json
            receiveData.NewField='address';
            receiveData.address=frame.remote64;
        
    
            //event 0:confirm gate way ; 1:normal data send ; 2:emergency send
            switch (receiveData.E) { 
                case 0:
                    console.log('receive confirm gateway');
                    
                    //type <100:sensor ; >100 actuator
                    if(receiveData.Type<100){
                        console.log('sensor node');
                        checkSensorNode(frame.remote64,receiveData.Type);
                       
                    }
                    else if (receiveData.Type>100){
                        console.log('actuator');
                        checkActuator(frame.remote64,receiveData.Type);
                    }
                        
                    break;
                
                    
                case 1:
                    break;
                    
                case 2:
                    break;
                    

            }
        
           
            
        }
});


