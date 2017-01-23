 const byte kLedPin = 13; 
 /* packet format
routerName' 'sleepMode' 'workTime' 'Humidity' 'Temperature' '
{"router": ,"sleepMode": ,"workTime": ,"Humidity", "Temperature" }
*/
/////////////////json setting
#include <ArduinoJson.h>

////////connect device setting
typedef struct
 {
     long address;
     boolean work_flag=false;
 }  ConnectedDevice;
 ConnectedDevice connect_device[100];
int device_quanty=0;
String post_data="1";

 
//////////////xbee setting
#include <XBee.h>
XBee xbee = XBee();
XBeeAddress64 addr64 = XBeeAddress64(0x0013a200, 0x40c8d185);
ZBRxResponse zbRx = ZBRxResponse();
long cordinator_address= 0x40c8d185;

///////////wifi setting
#include "ESP8266.h"
ESP8266 wifi(Serial1);
#define SSID        "wise"
#define PASSWORD    "c319913c"

///////// ThingSpeak Settings
#define HOST_NAME "api.thingspeak.com"
#define KEY "EP9PGHQ1B4VXDN9H"
#define HOST_PORT (80)


void setup() {
  Serial.begin(9600); 
  xbee.begin(Serial);
  pinMode(kLedPin, OUTPUT);
  ConnectToWifi();
   
}

void loop() {
 // DataSend();
  DataReceive();

}


void DataSend()
{
   uint8_t dataArray[post_data.length()];
   post_data.toCharArray(dataArray, post_data.length());
   ZBTxRequest zbTx = ZBTxRequest(addr64, dataArray, sizeof(dataArray));
   xbee.send(zbTx);
}

void DataReceive()
{
xbee.readPacket();
  if (xbee.getResponse().isAvailable()) {
    if (xbee.getResponse().getApiId() == ZB_RX_RESPONSE) {
        
      xbee.getResponse().getZBRxResponse(zbRx);
      long receive_address=zbRx.getRemoteAddress64().getLsb();
      String receive_data = zbRx.getData();
      
      char  json_parse[200];
      StaticJsonBuffer<200> json_buffer;
      receive_data.toCharArray(json_parse,zbRx.getDataLength());
      JsonObject& receive_json_data = json_buffer.parseObject(json_parse);
       if (!receive_json_data.success()) {
          return;
          }
          
      int router_num = receive_json_data["Router"];
      String temperature=receive_json_data["Temperature"];
      String humidity= receive_json_data["Humidity"];

  
      WifiSend(temperature,humidity);
      BlinkLed(router_num); // debug

      memset(json_parse,0,sizeof(json_parse));
      
     if(connect_device[router_num].address==NULL)  
     {
      connect_device[router_num].address=receive_address;
      connect_device[router_num].work_flag=true;
      device_quanty++;
     }
     else
     {
      switch(connect_device[router_num].work_flag)
      {
        case false:
          connect_device[router_num].work_flag=true;
          break;
        case true:
          connect_device[router_num].work_flag=false;
          break;
        default:
          break;
        
      }
     }
    }
  }
  
}

void BlinkLed(int times)
{
  for(int i=1;i<=times;i++)
  {
         digitalWrite(kLedPin,HIGH);
         delay(150);                       // wait for a second
         digitalWrite(kLedPin, LOW);    // turn the LED off by making the voltage LOW
         delay(150);  
  }
}
void ConnectToWifi()
{
 
    if (wifi.setOprToStation()) {
       BlinkLed(3);
    }
     if (wifi.joinAP(SSID, PASSWORD)) {
       BlinkLed(3);
     }
    wifi.disableMUX();
   
}
void WifiSend(String temp,String humi)
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

