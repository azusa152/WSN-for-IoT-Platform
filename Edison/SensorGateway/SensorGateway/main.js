/////////////////////////////////xbee setting
var util = require('util');
var SerialPort = require('serialport');
var xbee_api = require('xbee-api');
var C = xbee_api.constants;
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
        destination64: "000000000000ffff",
        broadcastRadius: 0x00,
        options: 0x00, 
        data: "0" 
    };  
var azusa=[];
function NodeStruct(address) {
  this.address = address;
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
xbeeAPI.on("frame_object", function (frame) {
    

    if(frame.type==139) // transmit
        {

        }
    else if(frame.type==144)//receive
        {
            console.log(">>");

            console.log(frame.data.toString('ascii'));
            azusa[0]=new NodeStruct(frame.remote64.toString());
            console.log(azusa[0].address);
            
        
           
            
        }
});


