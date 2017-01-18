 const byte ledPin = 13; 
 
/////////////////json setting
#include <ArduinoJson.h>



////////connect device setting
long endDeviceAddress[100];
int deviceQuanty=0;
String postData="1";

//////////////xbee setting
#include <XBee.h>
XBee xbee = XBee();
XBeeAddress64 addr64 = XBeeAddress64(0x0013a200, 0x40c8d185);
ZBRxResponse zbRx = ZBRxResponse();
long cordinatorAddress= 0x40c8d185;



void setup() {
  Serial.begin(9600); 
  xbee.begin(Serial);
  pinMode(ledPin, OUTPUT);
   
}

void loop() {
 // dataSend();
  dataReceive();
}


void dataSend()
{
   uint8_t dataArray[postData.length()];
   postData.toCharArray(dataArray, postData.length());
   ZBTxRequest zbTx = ZBTxRequest(addr64, dataArray, sizeof(dataArray));
   xbee.send(zbTx);
}

void dataReceive()
{
xbee.readPacket();
  if (xbee.getResponse().isAvailable()) {
    if (xbee.getResponse().getApiId() == ZB_RX_RESPONSE) {
        
      xbee.getResponse().getZBRxResponse(zbRx);
      long receiveAddress=zbRx.getRemoteAddress64().getLsb();
      String receiveData = zbRx.getData();
      
      char  json[200];
      StaticJsonBuffer<200> jsonBuffer;
      receiveData.toCharArray(json,zbRx.getDataLength());
      JsonObject& root = jsonBuffer.parseObject(json);
      int router = root["Router"];
    
       if (!root.success()) {
          return;
          }
      blinkLed(router);
      memset(json,0,sizeof(json));
     if(endDeviceAddress[router]==NULL)
     {
      endDeviceAddress[router]=receiveAddress;
      deviceQuanty++;
     }     
    }
  }
  
}

void blinkLed(int times)
{
  for(int i=1;i<=times;i++)
  {
         digitalWrite(ledPin,HIGH);
         delay(300);                       // wait for a second
         digitalWrite(ledPin, LOW);    // turn the LED off by making the voltage LOW
         delay(300);  
  }
         


}

