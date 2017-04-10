//record all nodes that connect to gateway
var connectedNode='';

// sensor 及 actuator 處存格式
function NodeStruct(receiveData,sensor_flag) {
   
  this.UUID = receiveData.UUID;
  this.TYPE=receiveData.TYPE;
    
  // sensor node record sleepmode and wakeup     
  if(sensor_flag===true){
      this.SLEEP_MODE=receiveData.SM;
      this.wakeup=false; 
  }
   
  
}



// check node is recored or not
exports.checkNode =function checkNode(sensorNode,actuator,receiveData){
    //type <100:sensor ; >100 actuator
    var sensor_flag=Boolean(false);
    for(var i=0;i<receiveData.TYPE.length;i++){
        if(receiveData.TYPE[i]>1000){
            sensor_flag=true;
        }
    }
        
     if(sensor_flag===true){
         for(var i=0;i<sensorNode.length;i++){
         if(sensorNode[i].UUID===receiveData.UUID){
             return;
            }
         }
         console.log('>> sensor register');
         
         
         sensorNode.push(new NodeStruct(receiveData,sensor_flag));
        
         return;
     }
    
     else{
         for(var i=0;i<actuator.length;i++){
         if(actuator[i].UUID===address){
             return;
            }
         }
         console.log('>> actuator register ');
         actuator.push(new NodeStruct(receiveData,sensor_flag));
         return;
         
     }
     console.log('>> already registered ');
}


//find which node send data，return node number ,if not found return -1 
exports.findNode= function (node,receiveData){
     
    for(var i=0;i<node.length;i++){
         if(node[i].UUID===receiveData.UUID){
             return i;
         }
     }
    return -1;
    
}


//discover connected node
function discoverNode(sensorNode,actuator){
    connectedNode='';
    var sensorNodeTemp=new Array(sensorNode.length);
    
    for(var i=0;i<sensorNodeTemp.length;i++){
        sensorNodeTemp[i]=sensorNode[i];
        delete sensorNodeTemp[i].wakeup;
        
        if(connectedNode===''){
            connectedNode=JSON.stringify(sensorNodeTemp[i]);
        }
        else{
            connectedNode=connectedNode+','+JSON.stringify(sensorNodeTemp[i]);
        }
        
    }
    for(var i=0;i<actuator.length;i++){
        if(connectedNode===''){
            connectedNode=JSON.stringify(actuator[i]);
        }
        else{
            connectedNode=connectedNode+','+JSON.stringify(actuator[i]);
        }
    }
    
    
   
}
exports.doDiscoverNode=function(sensorNode,actuator){
    
    setTimeout(discoverNode,1000,sensorNode,actuator);
  
    //return connectedNode;
}
exports.getConnectedNode=function(){
  
    return connectedNode;
}
