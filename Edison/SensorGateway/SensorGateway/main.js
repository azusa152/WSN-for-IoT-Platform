////////////////////////////////modules

var util = require('util');
var SerialPort = require('serialport');
var xbee_api = require('xbee-api');
const nodeFunction=require('./nodeFunction');
const frameProcess=require('./frameProcess');
const openSerialPPort=require('./openSerial');
const transDataProcess=require('./transDataProcess');

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

var dataToSend='';
var connectedNode='';
var sensorWorkTime=5; //sensor 醒來使work 5秒



/////////////////////////////////emergency setting
var emergencyFlag=Boolean(false);
var recoverFlag=Boolean(false);


//time 

/////////////////////////////////coap setting





/////////////////////////////////coap server
/*
const coap  = require('coap')
  , server = coap.createServer({
    host: '192.168.1.128',
  }), port = 5683

var payload;
var body;


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
                body=JSON.stringify(connectedNode);
                res.end(body);
                
                }, 1100);
            
            
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
    
  
})
server.listen(5683, function() {

  console.log('Server is listening')
})
*/
var server,
    ip   = "192.168.1.128",//gateway自己的IP
    port = 5683,
    http = require('http'),
    url = require('url'),
    path;





server = http.createServer(function (req, res) {
      path = url.parse(req.url);
     /*var ip='';
      var ip2 = req.connection.remoteAddress;//讀取ponte的IP
      for(var i=7;i<ip2.length;i++){
      ip=ip+ip2[i];
      }*/
    res.writeHead(200, {'Content-Type': 'text/plain'});

    switch (path.pathname) {
    case '/sevice_discovery':
        frame_obj.data='{\"Command\":1}';
            frame_obj.destination64='000000000000ffff'; //broadcast
            serialport.write(xbeeAPI.buildFrame(frame_obj));
            nodeFunction.doDiscoverNode(sensorNode,actuator);

            setTimeout(function() {
                connectedNode=nodeFunction.getConnectedNode();
                console.log('>>'+connectedNode);
                body=JSON.stringify(connectedNode);
                res.end(body);
                
                }, 1100);
            
            
            break;
            
     case '/ON':
           
            if(actuator.length>0){
                frame_obj.data="{\"Command\":1}";
                frame_obj.destination64=actuator[0].UUID;
                serialport.write(xbeeAPI.buildFrame(frame_obj));
                res.end('ON');
            }
             res.end('NO ACTUATOR');
            console.log(path.pathname);
            break;
            
     case '/OFF':
           
            if(actuator.length>0){
                 frame_obj.data="{\"Command\":3}";
                frame_obj.destination64=actuator[0].UUID;
                serialport.write(xbeeAPI.buildFrame(frame_obj));
                res.end('OFF');
            }
            
            res.end('NO ACTUATOR');
            console.log(path.pathname);
            
            break;
       
    default:
        res.end('default page.\n');
        break;
    }
   // res.end()
});
server.listen(port, function() {
console.log("Server running at http://" + ip + ":" + port);

});


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
                        console.log('>> fail ,not registered (normal)');
                        
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
                        recoverFlag=false;
                        // put data to payload
                        if(dataToSend===''){
                            dataToSend=transDataProcess.payloadPreProcess(receiveData);
                        }
                        else{
                            dataToSend=dataToSend+','+transDataProcess.payloadPreProcess(receiveData);
                        }
                        
                        
                        console.log('>>>'+dataToSend);
                    }
                    
                    break;
                 
                //receive emergency
                case 2:
                    delete receiveData.E; 
                    var sensorNodeNumber=nodeFunction.findNode(sensorNode,receiveData);
                    
                    if(sensorNodeNumber===-1){     //not found
                        console.log('>> fail ,not registered(emergence) ');
                        
                    }
                    else{
                        console.log('>> receive emergence');
                        
                       
                        if(recoverFlag===true){
                            frame_obj.data='{\"Command\":200}';
                            frame_obj.destination64=frame.remote64; //broadcast
                            serialport.write(xbeeAPI.buildFrame(frame_obj));
                            emergencyFlag=true;
                            //dataToSend.push(receiveData);
                            return;
                        }
                         //若沒廣播過，先廣播一次警急模式
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
                    
                    dataToSend='';
                    break;

            }
        
           
            
        }
});


