//////////////////////library
#include <dht.h>   
#include <ArduinoJson.h>
#include <TrueRandom.h>
#include <avr/sleep.h>
#include <XBee.h>

//////////////////////SENSOR CONFIG 
//DHT config
#define DHT_PIN A0 
dht DHT;
float DHTtemperature;
float DHThumidity;

void ReadDHT(){  //read from dhy 11
  DHT.read11(DHT_PIN);  //dht read
  DHThumidity=DHT.humidity;
  DHTtemperature=DHT.temperature;
}


//////////////////////ARDUINO CONFIG 
const byte kLedPin = 13; 
const byte kBuzzPin = 2; 
const int kNodeType[]={1001,1002};

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

void Buzzer()
{
  digitalWrite(kBuzzPin,HIGH);
  delay(100);                      
  digitalWrite(kBuzzPin, LOW); 
  delay(100);    
}

//////////////////////SLEEP CONFIG
volatile int sleep_count = 0; // Keep track of how many sleep done
const int kWorkTime=5; //work 5 seconds
int sleep_time=1;  // sleep_time*8seconds is pediod of sleep 
int sleep_mode =1; // 1=8seconds ;2=16seconds; 3=1hr
const int kSmartSleepShort=1; //1 minute
const int kSmartSleepMiddle=75; // 10minutes
const int kSmartSleepLong=450; //1hour

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

int original_sleep_mode =1;
int m_n=0;
double m_oldM, m_newM, m_oldS, m_newS;
const int kAnomalyCounter=20;

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
   //if in emergency mode,send emergence data
   CheckEmergencyMode();
   
   // in emergency and not recovered ,return
   if(emergency_flag==true&&recover_flag==false){
    return;
   }
   
   int counter=0; // record count 
   digitalWrite(kLedPin, HIGH);
   delay(1000);//預熱sensor
   
   //recovered but not receive stop emergence  
   if(emergency_flag==true&&recover_flag==true){
    DataTransmit(3);
   } 
   // in normal mode ,trans normal data
   else{
    DataTransmit(1);  
   }
   digitalWrite(kLedPin, HIGH);

   while(counter<=(kWorkTime*10))   //0.1 second ;wait receive process
   {  
    DataReceive();
    counter ++;
      
    // DetectAbnormal 每秒偵測1次
    if(counter%1000==0){
      DetectAbnormalTemperature();  
      //if detect abnormal  
      if(emergency_flag==true&&recover_flag==false){
        digitalWrite(kLedPin, LOW);  //turn off led 
        ResetSleep();
        return;
        }
      }
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
          case 201:
            BlinkLed(2);
            if(emergency_flag==false&&recover_flag==false){
              emergency_flag=true;
              original_sleep_mode=sleep_mode;
              DataTransmit(2);
              }
            break;
                  
          //receive recover command
          case 202:
            emergency_flag=false;
            recover_flag=false;
            BlinkLed(2);
            break;
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
        DetectAbnormalTemperature();
        root["H"]=DHThumidity;
        root["T"]=DHTtemperature;
        break;

      case 2://send EMERGENCY data
        root["T"]=DHTtemperature;
        root["EVENT"]=event;
        break;

      case 3://send RECOVER data
        root["T"]=DHTtemperature;
        root["EVENT"]=event;
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
      sleep_time=kSmartSleepShort;
      break;
    case 2:
      sleep_time=kSmartSleepMiddle;
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
//////////////////////EMERGENCY MODE
void CheckEmergencyMode()
{
   ReadDHT();
   //若還沒回正常
   if(emergency_flag==true&&recover_flag==false){
    emergency_count++;
    DataTransmit(2);
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
  if(m_n>1){
    if(AnomalyDetectionStandardDeviation()!=0){
       if(abs(DHTtemperature-AnomalyDetectionMean())>(3*AnomalyDetectionStandardDeviation())&&emergency_flag==false){
         //record original setting
        original_sleep_mode=sleep_mode;
        Buzzer();
        recover_flag=false;
        emergency_flag=true;
        sleep_time=1;
        return;
       }    
    }
  }
  if(emergency_flag==false&&DHTtemperature!=0){
      //push normal data
      if(m_n>kAnomalyCounter){
       AnomalyDetectionClear();
      }
      AnomalyDetectionPush(DHTtemperature);
    }
}


///////////////DetectAbnormalTemperature
void DetectRecover( )
{
  if(abs(DHTtemperature-AnomalyDetectionMean())<(3*AnomalyDetectionStandardDeviation())&&emergency_flag==true) {
    recover_flag=true;
    sleep_mode=original_sleep_mode; 
     }

}
///////////////Anomaly culculation function
void AnomalyDetectionPush(double x)
 {
            m_n++;

            // See Knuth TAOCP vol 2, 3rd edition, page 232
            if (m_n == 1)
            {
                m_oldM = m_newM = x;
                m_oldS = 0.0;
            }
            else
            {
                m_newM = m_oldM + (x - m_oldM)/m_n;
                m_newS = m_oldS + (x - m_oldM)*(x - m_newM);

                // set up for next iteration
                m_oldM = m_newM;
                m_oldS = m_newS;
            }
}

double AnomalyDetectionMean() 
 {
  return (m_n > 0) ? m_newM : 0.0;
 }

double AnomalyDetectionVariance() 
 {
  return ( (m_n > 1) ? m_newS/(m_n - 1) : 0.0 );
 }

double AnomalyDetectionStandardDeviation() 
{
            return sqrt( AnomalyDetectionVariance() );
}
void AnomalyDetectionClear(){
  m_n=0;
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

