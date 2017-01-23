////////////arduino setting
const byte kLedPin = 13; 
const int kRouterName=1;

//////////////////////sensor setting
#include <dht.h>     
#define DHT_PIN A0 
dht DHT;

//////////////////////sleep setting
#include <avr/sleep.h>
volatile int sleep_count = 0; // Keep track of how many sleep
const int kWorkTime=5; //read 5 seconds
int sleep_time=1;
int sleep_mode =3; // sleepeMode*8senconds is pediod of sleep 

/////////////////////xbee setting
#include <XBee.h>
XBee xbee = XBee();
XBeeAddress64 addr64 = XBeeAddress64(0x0013a200, 0x40c8d191);
ZBRxResponse zbRx = ZBRxResponse();
const long kCordinatorAddress= 0x40c8d191;



void setup() {
  Serial.begin(9600); 
  pinMode(kLedPin, OUTPUT);
  WatchdogOn(); 
}
 
void loop() 
{
  GoToSleep();
 if (sleep_count == sleep_time) 
 {
   WakeUp();
 }
}

///////////////////////////WakeUp process//////////////////////////////////
void WakeUp()
{
   int times=0; // record 
   digitalWrite(kLedPin, HIGH);
   DataSend();
   CheckSleepMode();
   while(times<=(kWorkTime*10))   //0.1 second 
   { 
      times ++;
      DataReceive();
      digitalWrite(kLedPin, HIGH);
      delay(100);
   }
   
  // DataSend();
   digitalWrite(kLedPin, LOW);
   WatchdogOn();
   sleep_count=0;
}
////////////////////////////receive action////////////////////////
void DataReceive()
{
xbee.readPacket();
  if (xbee.getResponse().isAvailable()) {
    if (xbee.getResponse().getApiId() == ZB_RX_RESPONSE) {
      xbee.getResponse().getZBRxResponse(zbRx);
      if (zbRx.getRemoteAddress64().getLsb() ==kCordinatorAddress) {    
         String receive_data = zbRx.getData();
         switch (receive_data.toInt() ){
          case 1:
                  sleep_mode=1;
                  break;
          case 2:
                  sleep_mode=2;
                  break;
          default: 
                  break;
          
         }
       
      }
    }
  }
  
}
/* send format
kRouterName' 'sleep_mode' 'kWorkTime' 'Humidity' 'Temperature' '
{"router": ,"sleep_mode": ,"kWorkTime": ,"Humidity", "Temperature" }
*/
/////////////////////////////////////////DataSend////////////////////////////////
void DataSend()
{
   String trans_data="{\"Router\":";
   trans_data.concat(String(kRouterName));
   trans_data.concat(",\"sleep_mode\":");
   trans_data.concat(String(sleep_mode));
   trans_data.concat(",\"kWorkTime\":");
   trans_data.concat(String(kWorkTime));

   DHT.read11(DHT_PIN); 
   trans_data.concat(",\"Humidity\":");
   trans_data.concat(String(DHT.humidity));
   trans_data.concat(",\"Temperature\":");
   trans_data.concat(String(DHT.temperature));
   
   trans_data.concat("} ");
    
   uint8_t trans_data_array[trans_data.length()];
   trans_data.toCharArray(trans_data_array, trans_data.length());
   ZBTxRequest zbTx = ZBTxRequest(addr64, trans_data_array, sizeof(trans_data_array));
   xbee.send(zbTx);
   delay(100);
  
}
void CheckSleepMode()
{
  switch(sleep_mode)
   {
    case 1:
      sleep_time=1;
      break;
    case 2:
      sleep_time=3;
      break;
    case 3:
      sleep_time=7;
      break;
    default:
      break;
   }
}

///////////////////////////////////////////Sleep////////////////////////////////////////////////////////////////
void GoToSleep()   
{
set_sleep_mode(SLEEP_MODE_PWR_DOWN); // Set sleep mode.
sleep_enable(); // Enable sleep mode.
sleep_mode(); // Enter sleep mode.
sleep_disable(); // Disable sleep mode after waking.
                     
}
///////////////////////////////////////////Watch dog////////////////////////////////////////////////////////////////
void WatchdogOn() 
{

MCUSR = MCUSR & B11110111;
WDTCSR = WDTCSR | B00011000; 
WDTCSR = B00100001;
WDTCSR = WDTCSR | B01000000;
MCUSR = MCUSR & B11110111;

}

ISR(WDT_vect)
{
sleep_count ++; 
}
