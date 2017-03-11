//////////////////////sensor setting
#include <dht.h>     
#define DHT_PIN A0 
dht DHT;

//////////////////////arduino setting
const byte kLedPin = 13; 
const int kRouterName=1;
const int kNodeType=0;
#include <TrueRandom.h>
byte uuid_number[16]; // UUIDs in binary form are 16 bytes long

//////////////////////sleep setting
#include <avr/sleep.h>
volatile int sleep_count = 0; // Keep track of how many sleep done
const int kWorkTime=5; //work 5 seconds
int sleep_time=1;  // sleep_time*8seconds is pediod of sleep 
int sleep_mode =1; // 1=8seconds ;2=16seconds; 3=1hr

//////////////////////gateway setting
boolean cordinator_flag=false;
long  cordinator_low_address= 0X00000000;
long  cordinator_high_address= 0x0013a200;

//////////////////////xbee setting
#include <XBee.h>
XBee xbee = XBee();
ZBRxResponse zbRx = ZBRxResponse();


//////////////////////main function
void setup() {
  Serial.begin(9600); 
  TrueRandom.uuid(uuid_number);//set uuid
  pinMode(kLedPin, OUTPUT);
  WatchdogOn();   //start Watchdog
}
 
void loop() 
{
  if(cordinator_flag==true)  //to check if gateway is connect
  {
     GoToSleep();
     if (sleep_count == sleep_time)  //if time up,then wake up
     {
        WakeUp();
     }
  }
  else
  {
    DataReceive();                //if gateway not detected,always on and listen 
  }
  
}

///////////////////////////WakeUp process//////////////////////////////////
void WakeUp()
{
   int times=0; // time   
   digitalWrite(kLedPin, HIGH);
   DataSend();                    //send data and notify gateway wakeup
   CheckSleepMode();
   while(times<=(kWorkTime*10))   //0.1 second ;wait receive process
   { 
      times ++;
      DataReceive();
      digitalWrite(kLedPin, HIGH);
      delay(100);
   }
   
   DataSend();                  //send data and notify gateway going to sleep
   digitalWrite(kLedPin, LOW);  //turn off led 
   WatchdogOn();                // reset watch dog
   sleep_count=0;               //reset sleep count
}

////////////////////////////receive action////////////////////////
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
                  cordinator_flag=true;
                  cordinator_low_address=zbRx.getRemoteAddress64().getLsb();
                  BlinkLed(3);
                  WatchdogOn();
                  ConfirmSend();// to confirm this node to gateway
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
          case 0:
                  BlinkLed(5);
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
    }
  }
  
}


/* data  format
'kNodeType' 'kRouterName' 'sleep_mode'  'Humidity' 'Temperature' '
{"type" ,"uuid": ,"sleep_mode": , ,"Humidity", "Temperature" }
*/
/////////////////////////////////////////DataSend////////////////////////////////
void DataSend()
{
   XBeeAddress64 addr64 = XBeeAddress64(cordinator_high_address, cordinator_low_address); // xbee address
   DHT.read11(DHT_PIN);  //dht read
   String uuid_string=UUIDToString(uuid_number);;
   
   String trans_data="{\"UUID\":";
   trans_data.concat(uuid_string);
   trans_data.concat(",\"sleep_mode\":");
   trans_data.concat(String(sleep_mode));
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
/* data  format
'kNodeType' 'kRouterName' 'sleep_mode'  'Humidity' 'Temperature' '
{"type" ,"uuid": ,"sleep_mode": , ,"Humidity", "Temperature" }
*/
/////////////////////confirm gateway
void ConfirmSend()
{
   XBeeAddress64 addr64 = XBeeAddress64(cordinator_high_address, cordinator_low_address); // xbee address
   DHT.read11(DHT_PIN);  //dht read
   String uuid_string=UUIDToString(uuid_number);;
   
   String trans_data="{\"Type\":";
   trans_data.concat(String(kNodeType));
   trans_data.concat(",\"UUID\":");
   trans_data.concat(uuid_string);
   trans_data.concat("} ");
    
   uint8_t trans_data_array[trans_data.length()];
   trans_data.toCharArray(trans_data_array, trans_data.length());
   ZBTxRequest zbTx = ZBTxRequest(addr64, trans_data_array, sizeof(trans_data_array));
   xbee.send(zbTx);
   delay(100);
  
}

////////////////////////////////check sleep mode has been changed
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
      sleep_time=450;
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

//////////////////////////uuid convert 
String UUIDToString(byte* number) {
  String uuid_string;
  
  for (int i=0; i<16; i++) {
  int top_digit = number[i] >> 4;
  int bottom_digit = number[i] & 0x0f;
  uuid_string.concat(String("0123456789ABCDEF"[top_digit]));
  uuid_string.concat(String("0123456789ABCDEF"[bottom_digit]));
  }
  
  return uuid_string;

}

///////////////////////debug////////////////////////////////////
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
