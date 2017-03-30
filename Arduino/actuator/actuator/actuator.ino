//////////////////////ARDUINO CONFIG 
const byte kLedPin = 13; 
const int kNodeType=1;
#include <TrueRandom.h>

//////////////////////GATEWAY CONFIG
boolean cordinator_flag=false;
const long  cordinator_high_address= 0x0013a200;
long  cordinator_low_address= 0X00000000;

//////////////////////XBEE CONFIG
#include <XBee.h>
XBee xbee = XBee();
ZBRxResponse zbRx = ZBRxResponse();

//////////////////////MAIN FUNCTION
void setup() {
  Serial.begin(9600); 
  pinMode(kLedPin, OUTPUT);
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
      if(cordinator_flag!=true)  //if first time detected gateway
      {
        switch (receive_data.toInt() ){
          case 0:
                  BlinkLed(3);
                  cordinator_flag=true;
                  cordinator_low_address=zbRx.getRemoteAddress64().getLsb();
                  delay(TrueRandom.random(1,1001));// avoid collision
                  ConfirmGateway();// to confirm this node to gateway
                  break;
          case 1:
                  BlinkLed(1);
                  break;
          case 2:
                  BlinkLed(2);
                  break;
          default: 
                  break;
          
         }
      }
      else if (zbRx.getRemoteAddress64().getLsb() ==cordinator_low_address) {    
         
         switch (receive_data.toInt() ){
          case 1:
                  BlinkLed(receive_data.toInt());
                  break;
          case 2:
                  BlinkLed(receive_data.toInt()); 
                  break;
          case 3:
                  BlinkLed(receive_data.toInt());
                  break;
          case 4:
                  BlinkLed(receive_data.toInt());
                  break;
          default: 
                  break;
          
         }
       
      }
    }
  }
  
}


/* DATA FORMAT
{"type" ,"uuid": }
*/
//////////////////////CONFIRM GATEWAY
void ConfirmGateway()
{
   XBeeAddress64 addr64 = XBeeAddress64(cordinator_high_address, cordinator_low_address); // xbee address
   
   String trans_data="{\"Type\":";
   trans_data.concat(String(kNodeType));
   trans_data.concat("} ");
    
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
         delay(150);                      
         digitalWrite(kLedPin, LOW);   
         delay(150);  
  }
}

