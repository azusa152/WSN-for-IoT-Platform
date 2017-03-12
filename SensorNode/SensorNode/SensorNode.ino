//////////////////////SENSOR CONFIG 
#include <dht.h>     
#define DHT_PIN A0 
dht DHT;

//////////////////////ARDUINO CONFIG 
const byte kLedPin = 13; 
const int kRouterName=1;
const int kNodeType=0;
#include <TrueRandom.h>
byte uuid_number[16]; // UUIDs in binary form are 16 bytes long

//////////////////////SLEEP CONFIG
#include <avr/sleep.h>
volatile int sleep_count = 0; // Keep track of how many sleep done
const int kWorkTime=5; //work 5 seconds
int sleep_time=1;  // sleep_time*8seconds is pediod of sleep 
int sleep_mode =1; // 1=8seconds ;2=16seconds; 3=1hr

//////////////////////GATEWAY CONFIG
boolean cordinator_flag=false;
const long  cordinator_high_address= 0x0013a200;
long  cordinator_low_address= 0X00000000;

//////////////////////XBEE CONFIG
#include <XBee.h>
XBee xbee = XBee();
ZBRxResponse zbRx = ZBRxResponse();

//////////////////////EMERGENCY CONFIG
const int kEmergencyTime=3; //8*10=emergency mode time
boolean emergency_flag=false;
int emergency_count=0;
int original_sleep_mode =1;
float average_temperature=0;
float kBias=20;
float original_temperature=0;

//////////////////////MAIN FUNCTION
void setup() {
  Serial.begin(9600); 
  TrueRandom.uuid(uuid_number);//set uuid
  pinMode(kLedPin, OUTPUT);
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

//////////////////////WAKEUP PROCESS
void WakeUp()
{
   
   CheckEmergencyMode();
   if(emergency_flag==true)
   return;
   
   int times=0; // time   
   digitalWrite(kLedPin, HIGH);
   DataSend();                    
   CheckSleepMode();
   delay(500);
   while(times<=(kWorkTime*2))   //0.1 second ;wait receive process
   { 
      times ++;
      DataReceive();

      
      CheckAveragetemperature();            
      if(emergency_flag==true)
      {
        digitalWrite(kLedPin, LOW);  //turn off led 
        ResetSleep();
        return;
      }
      
      
      digitalWrite(kLedPin, HIGH);
      delay(500);
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
      if(cordinator_flag!=true)  //if first time detected gateway
      {
        switch (receive_data.toInt() ){
          case 0:
                  BlinkLed(3);
                  
                  cordinator_flag=true;
                  cordinator_low_address=zbRx.getRemoteAddress64().getLsb();
                  delay(TrueRandom.random(1,1001));// avoid collision
                  ConfirmSend();// to confirm this node to gateway
                  ResetSleep();
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
                  if(emergency_flag==false)        
                  {
                   emergency_flag=true;
                   original_sleep_mode=sleep_mode;
                   original_temperature=DHT.temperature;
                   EmergencySend();
                  }
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


/* DATA FORMAT
{"uuid": ,"sleep_mode": , ,"Humidity", "Temperature","Event" }
*/
//////////////////////SEND ACTION
void DataSend()
{
   XBeeAddress64 addr64 = XBeeAddress64(cordinator_high_address, cordinator_low_address); // xbee address
   String uuid_string=UUIDToString(uuid_number);
   CheckAveragetemperature();
   
   String trans_data="{\"UUID\":";
   trans_data.concat(uuid_string);
   trans_data.concat(",\"sleep_mode\":");
   trans_data.concat(String(sleep_mode));
   trans_data.concat(",\"Humidity\":");
   trans_data.concat(String(DHT.humidity));
   trans_data.concat(",\"Temperature\":");
   trans_data.concat(String(DHT.temperature));
   trans_data.concat(",\"Event\":");
   trans_data.concat("0");
   trans_data.concat("} ");
    
   uint8_t trans_data_array[trans_data.length()];
   trans_data.toCharArray(trans_data_array, trans_data.length());
   ZBTxRequest zbTx = ZBTxRequest(addr64, trans_data_array, sizeof(trans_data_array));
   xbee.send(zbTx);
   delay(100);
  
}
/* DATA FORMAT
{"type" ,"uuid": }
*/
//////////////////////CONFIRM GATEWAY
void ConfirmSend()
{
   XBeeAddress64 addr64 = XBeeAddress64(cordinator_high_address, cordinator_low_address); // xbee address
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
/* DATA FORMAT
{"uuid": ,"Temperature","Event" }
*/
//////////////////////EmergencySend
void EmergencySend()
{
   XBeeAddress64 addr64 = XBeeAddress64(cordinator_high_address, cordinator_low_address); // xbee address
   DHT.read11(DHT_PIN);  //dht read
   String uuid_string=UUIDToString(uuid_number);;

   String trans_data="{\"UUID\":";
   trans_data.concat(uuid_string);
   trans_data.concat(",\"Temperature\":");
   trans_data.concat(String(DHT.temperature));
   trans_data.concat(",\"Event\":");
   trans_data.concat("1");
   trans_data.concat("} ");
  
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
      sleep_time=3;
      break;
    case 3:
      sleep_time=450;
      break;
    default:
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

//////////////////////UUID TO STRING
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
//////////////////////RESET SLEEP
void ResetSleep()
{   
   WatchdogOn();                // reset watch dog
   sleep_count=0;               //reset sleep count
}
//////////////////////EMERGENCY MODE
void CheckEmergencyMode()
{
   if(emergency_flag==true)
   {
    emergency_count++;
    EmergencySend();
    ResetSleep();
   }
   
   if(emergency_count==kEmergencyTime)
   {
    emergency_count=0;
    CheckEmergenceRecover( );
   }
   

}
///////////////CheckAveragetemperature
void CheckAveragetemperature( )
{
  DHT.read11(DHT_PIN);  //dht read
  if(average_temperature!=0)
  {
     
      if(abs(1-(DHT.temperature/average_temperature))>(kBias/100))
     {
        original_temperature=average_temperature; //record not emergence temperature
        EmergencySend();
        emergency_flag=true;
     }
      average_temperature=(average_temperature+DHT.temperature)/2;
  }
  else
  {
    average_temperature=DHT.temperature;    
  }
}
///////////////CheckAveragetemperature
void CheckEmergenceRecover( )
{
  DHT.read11(DHT_PIN);  //dht read
   if(abs(1-(original_temperature/DHT.temperature))<(kBias/100))
     {
        emergency_flag=false;
        sleep_mode=original_sleep_mode;
     }
  
 
}
