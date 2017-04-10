var moment = require('moment');
//receiveData.TIMESTAMP  = moment.utc().toDate().toUTCString();

// data preprocess
exports.preProcess= function  (frame){
    console.log('>'+frame.data.toString('ascii')+'debug UUID:'+frame.remote64);
   
        
    //delete the end null data of xbee receive data
    var deleteNull = /\0/g;
    var receiveRawData = frame.data.toString().replace(deleteNull, "");   
        
     //把資料處理成json
    var receiveData = JSON.parse(receiveRawData);
     
    //把MAC位置加入json
    receiveData.UUID=frame.remote64;
    
    return receiveData;
   
}