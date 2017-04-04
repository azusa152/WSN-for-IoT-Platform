////////////////////////////////modules
const openSerialPPort=require('./openSerial');
var util = require('util');
var SerialPort = require('serialport');
var xbee_api = require('xbee-api');
const nodeFunction=require('./nodeFunction');
const frameProcess=require('./frameProcess');

/////////////////////////////////serial port bug fix
openSerialPPort.openMySerialPort();

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

var dataToSend=[];
var connectedNode='';
var sensorWorkTime=5; //sensor 醒來使work 5秒



/////////////////////////////////emergency setting
var emergencyFlag=Boolean(false);
var recoverFlag=Boolean(false);



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
            nodeFunction.doDiscoverNode(sensorNode,actuator);

            setTimeout(function() {
                connectedNode=nodeFunction.getConnectedNode();
                console.log('>>'+connectedNode);
                }, 1000);
            
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
            receiveData=frameProcess.preProcess(frame);
        
            //event 0:confirm gate way ; 1:normal data send ; 2:emergency send
            switch (receiveData.E) { 
                    
                //receive confirm gateway
                case 0:
                    nodeFunction.checkNode(sensorNode,actuator,frame.remote64,receiveData.Type);
                    break;
                
                //receive sensor data
                case 1:
                    var sensorNodeNumber=nodeFunction.findNode(sensorNode,frame.remote64);
                    
                    if(sensorNodeNumber===-1){     //not found
                        console.log('>> fail ,not registered ');
                        
                    }
                    else{
                        console.log('>> receive sensor data');
                        // node 醒來 ，X秒後睡覺
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
                        // put data to payload
                        dataToSend.push(receiveData);
                        console.log(dataToSend);
                    }
                    
                    break;
                 
                //receive emergency
                case 2:
                    var sensorNodeNumber=nodeFunction.findNode(sensorNode,frame.remote64);
                    
                    if(sensorNodeNumber===-1){     //not found
                        console.log('>> fail ,not registered ');
                        
                    }
                    else{
                        console.log('>> receive emergence');
                        
                       
                        if(recoverFlag===true){
                            frame_obj.data='{\"Command\":200}';
                            frame_obj.destination64=frame.remote64; //broadcast
                            serialport.write(xbeeAPI.buildFrame(frame_obj));
                            emergencyFlag=true;
                            dataToSend.push(receiveData);
                            return;
                        }
                         //若沒廣播過，先廣播一次警急模式
                        if(emergencyFlag===false){
                            frame_obj.data='{\"Command\":100}';
                            frame_obj.destination64='000000000000ffff'; //broadcast
                            serialport.write(xbeeAPI.buildFrame(frame_obj));
                            emergencyFlag=true;
                            dataToSend.push(receiveData);
                            return;
                        }
                        
                        
                        
                        dataToSend.push(receiveData);
                    }
                    
                   
                    
                    break;
                    
                case 3:
                    var sensorNodeNumber=nodeFunction.findNode(sensorNode,frame.remote64);
                    
                    if(sensorNodeNumber===-1){     //not found
                        console.log('>> fail ,not registered ');
                        
                    }
                    else{
                        console.log('>> receive recover');
                        if(emergencyFlag===true){
                            
                            emergencyFlag=false;
                            recoverFlag=true;
                        
                            setTimeout(function(){
                                frame_obj.data='{\"Command\":200}';
                                frame_obj.destination64='000000000000ffff'; //broadcast
                                serialport.write(xbeeAPI.buildFrame(frame_obj));
                                console.log('>> send recover');
                                },500);
                        }
                        
                        frame_obj.data='{\"Command\":200}';
                        frame_obj.destination64=frame.remote64; //broadcast
                        serialport.write(xbeeAPI.buildFrame(frame_obj));
                        
                        
                        dataToSend.push(receiveData);
                    }
                    
                   
                    
                    break;
                    

            }
        
           
            
        }
});


