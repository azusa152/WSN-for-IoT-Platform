//record all nodes that connect to gateway
var connectedNode='';

// sensor 及 actuator 處存格式
function NodeStruct(address,type) {
  this.UUID = address;
  this.TYPE=type;
  this.wakeup=false; 
}



// check node is recored or not
exports.checkNode =function checkNode(sensorNode,actuator,address,type){
    
    //type <100:sensor ; >100 actuator
     if(type<100){
         for(var i=0;i<sensorNode.length;i++){
         if(sensorNode[i].UUID===address){
             return;
            }
         }
         console.log('>> sensor register ');
         sensorNode.push(new NodeStruct(address,type));
         return;
     }
    
     else{
         for(var i=0;i<actuator.length;i++){
         if(actuator[i].UUID===address){
             return;
            }
         }
         console.log('>> actuator register ');
         actuator.push(new NodeStruct(address,type));
         return;
         
     }
     console.log('>> already registered ');
}


//find which node send data，return node number ,if not found return -1 
exports.findNode= function (sensorNode,address){
    for(var i=0;i<sensorNode.length;i++){
         if(sensorNode[i].UUID===address){
             return i;
         }
     }
    return -1;
    
}


//discover connected node
function discoverNode(sensorNode,actuator){
     connectedNode='';

    for(var i=0;i<sensorNode.length;i++){
        if(connectedNode===''){
            connectedNode=JSON.stringify(sensorNode[i]);
        }
        else{
            connectedNode=connectedNode+','+JSON.stringify(sensorNode[i]);
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
