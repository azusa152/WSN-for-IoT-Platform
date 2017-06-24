//////////////////////library
#include "MQ135.h"
#include <ArduinoJson.h>
#include <TrueRandom.h>
#include <avr/sleep.h>
#include <XBee.h>
MQ135 MQ(0);
//////////////////////ARDUINO CONFIG 
const byte kLedPin = 13; 
const byte kBuzzPin = 2; 
const int kNodeType[]={3001};

//LED DEBUG
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

//////////////////////SLEEP CONFIG
volatile int sleep_count = 0; // Keep track of how many sleep done
const int kWorkTime=5; //work 5 seconds
int sleep_time=1;  // sleep_time*8seconds is pediod of sleep 
int sleep_mode =1; // 1=8seconds ;2=16seconds; 3=1hr
const int kSmartSleepShort=7; //1 minute
const int kSmartSleepMiddle=75; // 10minutes
const int kSmartSleepLong=450; //1hour

//////////////////////GATEWAY CONFIG
boolean cordinator_flag=false;
const long  cordinator_high_address= 0x0013a200;
long  cordinator_low_address= 0X00000000;

//////////////////////XBEE CONFIG
XBee xbee = XBee();
ZBRxResponse zbRx = ZBRxResponse();



//////////////////////MAIN FUNCTION
void setup() 
{
  Serial.begin(9600); 
  while (!Serial) {
    // wait serial port initialization
  }
  pinMode(kLedPin, OUTPUT);
  pinMode(kBuzzPin, OUTPUT);
}
 
void loop() 
{
  //to check if gateway is connect
  if(cordinator_flag==true)  {
    GoToSleep();
    //if time to wake up,then wake up
    if (sleep_count == sleep_time)  {
      WakeUp();
    }
  }
  else{
    //if gateway not detected,always on and listen 
    DataReceive();                
  }
  
}

//////////////////////WAKEUP PROCESS
void WakeUp()
{

   int counter=0; // record count 
   digitalWrite(kLedPin, HIGH);
   delay(1000);//預熱sensor
   
   DataTransmit(1);  
   digitalWrite(kLedPin, HIGH);
   while(counter<=(kWorkTime*10))   //0.1 second ;wait receive process
   {  
      DataReceive();
      counter ++;
      delay(100);
   }
   
   digitalWrite(kLedPin, LOW);  //turn off led 
   ResetSleep();
}

//////////////////////RECEIVE COMMAND
void DataReceive()
{
xbee.readPacket();
  if (xbee.getResponse().isAvailable()) {
    if (xbee.getResponse().getApiId() == ZB_RX_RESPONSE) {
      xbee.getResponse().getZBRxResponse(zbRx);
      String receive_data = zbRx.getData();
      
      //json parse data
      StaticJsonBuffer<200> json_buffer;
      JsonObject& receive_json_data = json_buffer.parseObject(receive_data.c_str());
      int command=receive_json_data["Command"];
      
      //if first time detected gateway
      if(cordinator_flag!=true)  {
        switch (command){
          //receive discover node
          case 1:
            BlinkLed(1);
            cordinator_flag=true;
            cordinator_low_address=zbRx.getRemoteAddress64().getLsb();
            delay(TrueRandom.random(1,500));// avoid collision
            DataTransmit(0);// to confirm this node to gateway
            ResetSleep();
            break;         
          
         }
      }
      else if (zbRx.getRemoteAddress64().getLsb() ==cordinator_low_address) {    
         switch (command){
          //receive discover command
          case 1:
            BlinkLed(1);
            delay(TrueRandom.random(1,500));// avoid collision
            DataTransmit(0);// to confirm this node to gateway
            break;    

          case 101:
            sleep_mode=1;
            CheckSleepMode();
            DataTransmit(0);// to confirm this node to gateway
            ResetSleep();
            break;  

           case 102:
            sleep_mode=2;
            CheckSleepMode();
            DataTransmit(0);// to confirm this node to gateway
            ResetSleep();
            break;  

            case 103:
            sleep_mode=3;
            CheckSleepMode();
            DataTransmit(0);// to confirm this node to gateway
            ResetSleep();
            break;  

           //receive emergency command
      
         }
      }
    }
  }
}


/* DATA FORMAT
{"SM": , ,"H", "T","E"=1 }
*/
void DataTransmit(int event)
{

   XBeeAddress64 addr64 = XBeeAddress64(cordinator_high_address, cordinator_low_address); // xbee address
   StaticJsonBuffer<200> jsonBuffer;
   JsonObject& root = jsonBuffer.createObject();
   
   switch(event){
      case 0://confirm gateway
      {
        JsonArray& TYPE = root.createNestedArray("TYPE");
        for(int i=0;i<sizeof(kNodeType)/2;i++){
          TYPE.add(kNodeType[i]);
        }
        root["SLEEP_MODE"]=sleep_mode;
      }
        root["EVENT"]=event;
        break;
      case 1://send normal data
        float CO=MQ.getPPM();
        root["C"]=CO;
        break;
   }
   //json to string
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

//////////////////////CHECK SLEEP MODE
void CheckSleepMode()
{
  switch(sleep_mode)
   {
    case 1:
      sleep_time=1;
      break;
    case 2:
      sleep_time=225;
      break;
    case 3:
      SmartSleep();
      break;
   }
}

//////////////////////SLEEP
void GoToSleep()   
{
  set_sleep_mode(SLEEP_MODE_PWR_DOWN); // Set sleep mode.
  sleep_enable(); // Enable sleep mode.
  sleep_mode(); // Enter sleep mode.
  sleep_disable(); // Disable sleep mode after waking.
                     
}
//////////////////////WATCH DOG
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

//////////////////////RESET SLEEP
void ResetSleep()
{   
   WatchdogOn();                // reset watch dog
   sleep_count=0;               //reset sleep count
}

//////////////////smart sleep
void SmartSleep(){
  for(int i=0;i<sizeof(kNodeType)/2;i++){
         if (kNodeType[i]>3000){
          sleep_time=kSmartSleepLong;
          BlinkLed(3);
          return;
         }
         else if (kNodeType[i]>2000){
          sleep_time=kSmartSleepMiddle;
           BlinkLed(2);
          return;
         }
       }
  sleep_time= kSmartSleepShort;
   BlinkLed(1);
}

