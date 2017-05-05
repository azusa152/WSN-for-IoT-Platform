/////////////////library
#include <ArduinoJson.h>
#include <TrueRandom.h>
#include <XBee.h>

//////////////////////relay setting
const int relayPin = 10;                 // 繼電器(Relay)
int relayState = 0;                      // 繼電器狀態

//////////////////////ARDUINO CONFIG 
const byte kLedPin = 13; 
const int kNodeType []={1};
int kActuactorState []={0};
//////////////////////GATEWAY CONFIG
boolean cordinator_flag=false;
const long  cordinator_high_address= 0x0013a200;
long  cordinator_low_address= 0X00000000;

//////////////////////XBEE CONFIG
XBee xbee = XBee();
ZBRxResponse zbRx = ZBRxResponse();

//////////////////////MAIN FUNCTION
void setup() {
  Serial.begin(9600); 
  pinMode(kLedPin, OUTPUT);
  pinMode(relayPin, OUTPUT); 
}
 
void loop() 
{
  DataReceive();   
}

//////////////////////RECEIVE COMMAND
void DataReceive()
{
xbee.readPacket();
  if (xbee.getResponse().isAvailable()) {
    if (xbee.getResponse().getApiId() == ZB_RX_RESPONSE) {
      xbee.getResponse().getZBRxResponse(zbRx);
      String receive_data = zbRx.getData();
      //json convert
      
      StaticJsonBuffer<200> json_buffer;
      JsonObject& receive_json_data = json_buffer.parseObject(receive_data.c_str());
      int command=receive_json_data["Command"];
      
      if(cordinator_flag!=true)  //if first time detected gateway
      {
        switch (command){
          case 1:
                  BlinkLed(1);
                  cordinator_flag=true;
                  cordinator_low_address=zbRx.getRemoteAddress64().getLsb();
                  delay(TrueRandom.random(1,500));// avoid collision
                  ConfirmGateway();// to confirm this node to gateway
                  break;
          default: 
                  break;
          
         }
      }
      else if (zbRx.getRemoteAddress64().getLsb() ==cordinator_low_address) {    
         
         switch (command){
          case 1:
                  BlinkLed(1);
                  cordinator_flag=true;
                  cordinator_low_address=zbRx.getRemoteAddress64().getLsb();
                  delay(TrueRandom.random(1,500));// avoid collision
                  ConfirmGateway();// to confirm this node to gateway
                  break;

          case 2:
            
                  digitalWrite(relayPin, 1);  
                  relayState=1;
                  kActuactorState[0]=1;
                  BlinkLed(command);
                  break;
          case 3:
 
                  digitalWrite(relayPin, 0); 
                  relayState=0;
                  kActuactorState[0]=0; 
                   BlinkLed(command);
                 
                  break;
          case 4:
                  BlinkLed(command);
                  break;
          default: 
                  break;
          
         }
       
      }
    }
  }
  
}


/* DATA FORMAT
{"Type": ,"E"=0}
*/
//////////////////////CONFIRM GATEWAY
void ConfirmGateway()
{
   XBeeAddress64 addr64 = XBeeAddress64(cordinator_high_address, cordinator_low_address); // xbee address
   StaticJsonBuffer<200> jsonBuffer;
   JsonObject& root = jsonBuffer.createObject();
   root["E"]=0;
   
   JsonArray& TYPE = root.createNestedArray("TYPE");
        for(int i=0;i<sizeof(kNodeType)/2;i++){
          TYPE.add(kNodeType[i]);
        }

   JsonArray& STATE = root.createNestedArray("STATE");
        for(int i=0;i<sizeof(kActuactorState)/2;i++){
          STATE.add(kActuactorState[i]);
        }
    
   String trans_data;
   root.printTo(trans_data);
   trans_data=trans_data+" ";

   //xbee trans data
   uint8_t trans_data_array[trans_data.length()];
   trans_data.toCharArray(trans_data_array, trans_data.length());
   ZBTxRequest zbTx = ZBTxRequest(addr64, trans_data_array, sizeof(trans_data_array));
   xbee.send(zbTx);
   delay(100);
  
}



//////////////////////DEBUG
void BlinkLed(int times)
{
  for(int i=1;i<=times;i++)
  {
         digitalWrite(kLedPin,HIGH);
         delay(100);                      
         digitalWrite(kLedPin, LOW);   
         delay(100);  
  }
}

