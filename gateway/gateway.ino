const byte ledPin = 13; 

#include <XBee.h>
XBee xbee = XBee();
long endDeviceAddress[100];
int deviceQuanty=0;

XBeeAddress64 addr64 = XBeeAddress64(0x0013a200, 0x40c8d185);
ZBRxResponse zbRx = ZBRxResponse();
long cordinatorAddress= 0x40c8d185;



void setup() {

  Serial.begin(9600); 
  pinMode(ledPin, OUTPUT);
  

}

void loop() {

  
  dataSend();
  dataReceive();

}


void dataSend()
{
   String postData="1";
   uint8_t dataArray[postData.length()];
   postData.toCharArray(dataArray, postData.length());
   ZBTxRequest zbTx = ZBTxRequest(addr64, dataArray, sizeof(dataArray));
   xbee.send(zbTx);
   //delay(100);
  
}

void dataReceive()
{
xbee.readPacket();
  if (xbee.getResponse().isAvailable()) {
    if (xbee.getResponse().getApiId() == ZB_RX_RESPONSE) {
     
      xbee.getResponse().getZBRxResponse(zbRx);
      long receiveAddress=zbRx.getRemoteAddress64().getLsb();
      for(int i=0;i<=deviceQuanty;i++)
      {
        if(endDeviceAddress[i]==NULL)
        {
          deviceQuanty++;
          endDeviceAddress[i]=receiveAddress;
          
          break;
        }
        else if(endDeviceAddress[i]==receiveAddress)
        {
          break;
        }
        else
          continue;
      }
      
      if (receiveAddress ==endDeviceAddress[deviceQuanty-1]) {    
       blinkLed(deviceQuanty);
      }
    }
  }
  
}
void blinkLed(int times)
{
  for(int i=0;i<=times;i++)
  {
         digitalWrite(ledPin,HIGH);
         delay(100);                       // wait for a second
         digitalWrite(ledPin, LOW);    // turn the LED off by making the voltage LOW
         delay(100);  
  }
         


}

