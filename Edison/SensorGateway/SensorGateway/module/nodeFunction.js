//record all nodes that connect to gateway
var connectedNode='';
var sensornodeQuantity=0;
var actuatorQuantity=0;
var sensor_flag=false;
// sensor 及 actuator 處存格式
function NodeStruct(receiveData,sensor_flag) {
   
  this.UUID = receiveData.UUID;
  this.TYPE=receiveData.TYPE;
    
  // sensor node record sleepmode and wakeup     
  if(sensor_flag===true){
      this.SLEEP_MODE=receiveData.SLEEPMODE;
      this.wakeup=false; 
  }
    
  else{
      this.STATE=receiveData.STATE;
  }
   
  
}



// check node is recored or not
exports.checkNode =function checkNode(sensorNode,actuator,receiveData){
    //type <100:sensor ; >100 actuator
    sensor_flag=false;
    for(var i=0;i<receiveData.TYPE.length;i++){
      
        if(receiveData.TYPE[i]>1000){
            sensor_flag=true;
        }
    }
        
     if(sensor_flag===true){
         for(var i=0;i<sensorNode.length;i++){
         if(sensorNode[i].UUID===receiveData.UUID){
             sensorNode[i].UUID = receiveData.UUID;
             sensorNode[i].TYPE=receiveData.TYPE;
             sensorNode[i].SLEEP_MODE=receiveData.SLEEPMODE;
             console.log('>> sensorNode updated');
             return;
            }
         }
         console.log('>> sensor register');
         sensorNode.push(new NodeStruct(receiveData,sensor_flag));
        
         return;
     }
    
     else{
         for(var i=0;i<actuator.length;i++){
         if(actuator[i].UUID===receiveData.UUID){
             actuator[i].UUID = receiveData.UUID;
             actuator[i].TYPE=receiveData.TYPE;
             console.log('>> actuator updated');
             return;
            }
         }
         console.log('>> actuator register ');
         actuator.push(new NodeStruct(receiveData,sensor_flag));
         return;
         
     }
     
}


//find which node send data，return node number ,if not found return -1 
exports.findNode= function (node,UUID){
     
    for(var i=0;i<node.length;i++){
         if(node[i].UUID===UUID){
             return i;
         }
     }
    return -1;
    
}


//discover connected node
function discoverNode(sensorNode,actuator){
    //connectedNode='';
    
    var sensorNodeTemp=new Array(sensorNode.length);
    var actuatorTemp=new Array(actuator.length);
    
    // sensor node process
    if(sensornodeQuantity<sensorNodeTemp.length){
        for(sensornodeQuantity;sensornodeQuantity<sensorNodeTemp.length;sensornodeQuantity++){
            var type='';
            sensorNodeTemp[sensornodeQuantity]=sensorNode[sensornodeQuantity];
            delete sensorNodeTemp[sensornodeQuantity].wakeup;

            for(var j=0;j<(sensorNodeTemp[sensornodeQuantity].TYPE.length);j++){

                if(type===''){
                    type=type+sensorNodeTemp[sensornodeQuantity].TYPE[j];
                }
                else{
                    type=type+','+sensorNodeTemp[sensornodeQuantity].TYPE[j];
                }

            }
            delete sensorNodeTemp[sensornodeQuantity].TYPE;
            sensorNodeTemp[sensornodeQuantity].TYPE=type;
            
            if(connectedNode===''){
                connectedNode=JSON.stringify(sensorNodeTemp[sensornodeQuantity]);
            }
            else{
                connectedNode=connectedNode+','+JSON.stringify(sensorNodeTemp[sensornodeQuantity]);
            }     
        }   
    }
    
    // actuator process
    if(actuatorQuantity<actuatorTemp.length){
        
        for(actuatorQuantity;actuatorQuantity<actuatorTemp.length;actuatorQuantity++){
        var type='';
        actuatorTemp[actuatorQuantity]=actuator[actuatorQuantity];
        for(var j=0;j<(actuatorTemp[actuatorQuantity].TYPE.length);j++){
            if(type===''){
                type=type+actuatorTemp[actuatorQuantity].TYPE[j]+'_'+actuatorTemp[actuatorQuantity].STATE;
                
            }
            else{
                type=type+','+actuatorTemp[actuatorQuantity].TYPE[j]+'_'+actuatorTemp[actuatorQuantity].STATE;
            }
            
        }
        delete actuatorTemp[actuatorQuantity].TYPE;
        delete actuatorTemp[actuatorQuantity].STATE;
        actuator[actuatorQuantity].TYPE=type;
        
        if(connectedNode===''){
            connectedNode=JSON.stringify(actuatorTemp[actuatorQuantity]);
        }
        else{
            connectedNode=connectedNode+','+JSON.stringify(actuatorTemp[actuatorQuantity]);
        }
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
