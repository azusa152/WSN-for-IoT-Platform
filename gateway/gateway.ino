 const byte ledPin = 13; 
 /* packet format
routerName' 'sleepMode' 'workTime' 'Humidity' 'Temperature' '
{"router": ,"sleepMode": ,"workTime": ,"Humidity", "Temperature" }
*/
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

///////////wifi setting
#include "ESP8266.h"
ESP8266 wifi(Serial1);
#define SSID        "wise"
#define PASSWORD    "c319913c"

///////// ThingSpeak Settings
#define HOST_NAME "api.thingspeak.com"
#define KEY "EP9PGHQ1B4VXDN9H"
#define HOST_PORT (80)
uint8_t buffer[1024] = {0};

void setup() {
  Serial.begin(9600); 
  xbee.begin(Serial);
  pinMode(ledPin, OUTPUT);
  connectWifi();
   
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
      String Temperature=root["Temperature"];
      String Humidity= root["Humidity"];

  
      wifiSend(Temperature,Humidity);
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
         delay(150);                       // wait for a second
         digitalWrite(ledPin, LOW);    // turn the LED off by making the voltage LOW
         delay(150);  
  }
}
void connectWifi()
{
 
    if (wifi.setOprToStation()) {
       blinkLed(3);
    }
     if (wifi.joinAP(SSID, PASSWORD)) {
       blinkLed(3);
     }
    wifi.disableMUX();
   
}
void wifiSend(String temp,String humi)
{
    if(wifi.createTCP(HOST_NAME, HOST_PORT))
    {
    String http = String();
    http += "GET /update?key=";
    http += KEY;
    http += "&field1=" + temp;
    http += "&field2=" + humi;
    http += " HTTP/1.1\r\n";
    http += "Host: api.thingspeak.com\r\n";
    http += "Connection: close\r\n\r\n";
    wifi.send((const uint8_t*)http.c_str(), http.length());
   
    }
    wifi.releaseTCP();
   
}

