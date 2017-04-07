//////////////////////library
#include <dht.h>   
#include <ArduinoJson.h>
#include <TrueRandom.h>
#include <avr/sleep.h>
#include <XBee.h>

//////////////////////SENSOR CONFIG 
#define DHT_PIN A0 
dht DHT;
float DHTtemperature;
float DHThumidity;
//////////////////////ARDUINO CONFIG 
const byte kLedPin = 13; 
//const int kNodeType=0;
const String kNodeType="[1001,1002]";
//////////////////////SLEEP CONFIG
volatile int sleep_count = 0; // Keep track of how many sleep done
const int kWorkTime=5; //work 5 seconds
int sleep_time=1;  // sleep_time*8seconds is pediod of sleep 
int sleep_mode =1; // 1=8seconds ;2=16seconds; 3=1hr

//////////////////////GATEWAY CONFIG
boolean cordinator_flag=false;
const long  cordinator_high_address= 0x0013a200;
long  cordinator_low_address= 0X00000000;

//////////////////////XBEE CONFIG
XBee xbee = XBee();
ZBRxResponse zbRx = ZBRxResponse();

//////////////////////EMERGENCY CONFIG
const int kEmergencyTime=3; //8*10=emergency mode time
boolean emergency_flag=false;
boolean recover_flag=false;
int emergency_count=0;
float average_temperature=0;

float kThreshold=20;// percentage of Threshold
float original_temperature=0; // before emergence value
int original_sleep_mode =1;

//////////////////////MAIN FUNCTION
void setup() 
{
  Serial.begin(9600); 
  pinMode(kLedPin, OUTPUT);
}
 
void loop() 
{
  //to check if gateway is connect
  if(cordinator_flag==true)  {
     GoToSleep();
     //if time up,then wake up
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
   //if in emergency mode,send emergence data
   CheckEmergencyMode();
   
   // in emergency and not recovered ,return
   if(emergency_flag==true&&recover_flag==false){
      return;
   }
   
   
   int counter=0; // record count 
   digitalWrite(kLedPin, HIGH);

   //recovered but not receive stop emergence  
   if(emergency_flag==true&&recover_flag==true){
      RecoverSend();
   }
   
   // in normal mode
   else{
      DataSend();  
   }
   
   //check sleep mode         
   CheckSleepMode();
  
   while(counter<=(kWorkTime*10))   //0.1 second ;wait receive process
   {  
      DataReceive();
      counter ++;
      
      // DetectAbnormal 每秒偵測1次
      if(counter%1000==0){
         DetectAbnormalTemperature();    
         if(emergency_flag==true&&recover_flag==false){
             digitalWrite(kLedPin, LOW);  //turn off led 
             ResetSleep();
              return;
            }
      }
     
      digitalWrite(kLedPin, HIGH);
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
      
      //json convert
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
                  ConfirmGateway();// to confirm this node to gateway
                  ResetSleep();
                  break;         
          default: 
                  break;
          
         }
      }
      else if (zbRx.getRemoteAddress64().getLsb() ==cordinator_low_address) {    
         
         switch (command){
          //receive start emergence command
          case 100:
                  BlinkLed(1);
                  if(emergency_flag==false&&recover_flag==false)        
                  {
                   emergency_flag=true;
                   original_sleep_mode=sleep_mode;
                   original_temperature=DHT.temperature;
                   EmergencySend();
                  }
                  break;
                  
          //receive stop emergence command
          case 200:
                  emergency_flag=false;
                  recover_flag=false;
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
{"SM": , ,"H", "T","E"=1 }
*/
//////////////////////SEND ACTION
void DataSend()
{
   XBeeAddress64 addr64 = XBeeAddress64(cordinator_high_address, cordinator_low_address); // xbee address
   DetectAbnormalTemperature();
   ReadDHT();
   String trans_data="{\"H\":";
   trans_data.concat(String(DHThumidity));
   trans_data.concat(",\"T\":");
   trans_data.concat(String(DHTtemperature));
   trans_data.concat(",\"E\":");
   trans_data.concat("1");
   trans_data.concat("} ");
    
   uint8_t trans_data_array[trans_data.length()];
   trans_data.toCharArray(trans_data_array, trans_data.length());
   ZBTxRequest zbTx = ZBTxRequest(addr64, trans_data_array, sizeof(trans_data_array));
   xbee.send(zbTx);
   delay(100);
  
}
/* DATA FORMAT
{"Type": ,"E"=0}
*/
//////////////////////CONFIRM GATEWAY
void ConfirmGateway()
{
   XBeeAddress64 addr64 = XBeeAddress64(cordinator_high_address, cordinator_low_address); // xbee address
   String trans_data="{\"Type\":";
   trans_data.concat(kNodeType);
   trans_data.concat(",\"E\":");
   trans_data.concat("0");
   trans_data.concat(",\"SM\":");
   trans_data.concat(String(sleep_mode));
   trans_data.concat("} ");
    
   uint8_t trans_data_array[trans_data.length()];
   trans_data.toCharArray(trans_data_array, trans_data.length());
   ZBTxRequest zbTx = ZBTxRequest(addr64, trans_data_array, sizeof(trans_data_array));
   xbee.send(zbTx);
   delay(100);
  
}
/* DATA FORMAT
{"Temperature","Event"=2 }
*/
//////////////////////EmergencySend
void EmergencySend()
{
   XBeeAddress64 addr64 = XBeeAddress64(cordinator_high_address, cordinator_low_address); // xbee address
   delay(100);
  
   
   String trans_data="{\"T\":";
   trans_data.concat(String(DHTtemperature));
   trans_data.concat(",\"E\":");
   trans_data.concat("2");
   trans_data.concat("} ");
  
   uint8_t trans_data_array[trans_data.length()];
   trans_data.toCharArray(trans_data_array, trans_data.length());
   ZBTxRequest zbTx = ZBTxRequest(addr64, trans_data_array, sizeof(trans_data_array));
   xbee.send(zbTx);
   delay(100);
  
}
//////////////////////RecoverSend
void RecoverSend()
{
   XBeeAddress64 addr64 = XBeeAddress64(cordinator_high_address, cordinator_low_address); // xbee address
   
 
   String trans_data="{\"T\":";
   trans_data.concat(String(DHTtemperature));
   trans_data.concat(",\"E\":");
   trans_data.concat("3");
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
      sleep_time=225;
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
//////////////////////RESET SLEEP
void ResetSleep()
{   
   WatchdogOn();                // reset watch dog
   sleep_count=0;               //reset sleep count
}
//////////////////////EMERGENCY MODE
void CheckEmergencyMode()
{
   ReadDHT();
   //若還沒回正常
   if(emergency_flag==true&&recover_flag==false){
    emergency_count++;
    EmergencySend();
    ResetSleep();
   }

   // 隔一段時間後檢查有沒有回到正常
   if(emergency_count==kEmergencyTime){
    emergency_count=0;
    DetectRecover( );
   }
   

}

///////////////DetectAbnormalTemperature
void DetectAbnormalTemperature( )
{
  ReadDHT();
  if(average_temperature!=0){
     
      if(abs(1-(DHTtemperature/average_temperature))>(kThreshold/100)&&emergency_flag==false){
         //record original setting
        original_temperature=average_temperature;
        original_sleep_mode=sleep_mode;
        
        EmergencySend();
        
        recover_flag=false;
        emergency_flag=true;
        sleep_time=1;
     }
     
      average_temperature=(average_temperature+DHT.temperature)/2;
  }
  else {
    average_temperature=DHT.temperature;    
  }
}

///////////////DetectAbnormalTemperature
void DetectRecover( )
{
  
  
   if(abs(1-(original_temperature/DHTtemperature))<(kThreshold/100)) {
        recover_flag=true;
        sleep_mode=original_sleep_mode;
       
     }
  
 
}
void ReadDHT(){
  DHT.read11(DHT_PIN);  //dht read
  DHThumidity=DHT.humidity;
  DHTtemperature=DHT.temperature;
}

