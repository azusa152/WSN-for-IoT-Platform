////////////arduino setting
const byte ledPin = 13; 
const int routerName=1;

//////////////////////sensor setting
#include <dht.h>     
#define dht_dpin A0 
dht DHT;

//////////////////////sleep setting
#include <avr/sleep.h>
volatile int sleep_count = 0; // Keep track of how many sleep
const int workTime=5; //read 5 seconds
int sleepMode =1; // sleepeMode*8senconds is pediod of sleep 

/////////////////////xbee setting
#include <XBee.h>
XBee xbee = XBee();
XBeeAddress64 addr64 = XBeeAddress64(0x0013a200, 0x40c8d191);



void setup() {
  Serial.begin(9600); 
  pinMode(ledPin, OUTPUT);
  watchdogOn(); 
}
 
void loop() 
{
  goToSleep();
 if (sleep_count == sleepMode) 
 {
   wakeup();
 }
}

///////////////////////////wakeup process//////////////////////////////////
void wakeup()
{
   int times=0; // record 
   digitalWrite(ledPin, HIGH);
   dataSend();
   while(times<=(workTime*10))   //0.1 second 
   { 
      times ++;
      receive();
      digitalWrite(ledPin, HIGH);
      delay(100);
   }
   
   dataSend();
   digitalWrite(ledPin, LOW);
   watchdogOn();
   sleep_count=0;
}
////////////////////////////receive action////////////////////////
void receive()
{
char xbeeIn=Serial.read();
switch(xbeeIn)
      {
        case 'a':
                 Serial.write(routerName);
                 Serial.write("is receive:");
                 Serial.write(xbeeIn);
                 Serial.write("   ");
                 
                 if(Serial.read()=='5')
                  Serial.write("azusa");
                 digitalWrite(ledPin, HIGH);
                 delay(100);
                 digitalWrite(ledPin, LOW);
                 delay(100);
                 break;
                 
        case '1':
                 sleepMode=1;
                 Serial.write("sleep 8 seconds ");
                 break;
                 
        case '2':
                 sleepMode=2;
                 Serial.write("sleep 16 seconds ");
                 break;
       default:
                 
                 break;

      }
  
}
/* send format
routerName' 'sleepMode' 'workTime' 'Humidity' 'Temperature' '
{"router": ,"sleepMode": ,"workTime": ,"Humidity", "Temperature" }
*/
/////////////////////////////////////////wakeup send////////////////////////////////
void dataSend()
{
   String postData="{\"Router\":";
   postData.concat(String(routerName));
   postData.concat(",\"sleepMode\":");
   postData.concat(String(sleepMode));
   postData.concat(",\"workTime\":");
   postData.concat(String(workTime));

   DHT.read11(dht_dpin); 
   postData.concat(",\"Humidity\":");
   postData.concat(String(DHT.humidity));
   postData.concat(",\"Temperature\":");
   postData.concat(String(DHT.temperature));
   
   postData.concat("} ");
    
   uint8_t dataArray[postData.length()];
   postData.toCharArray(dataArray, postData.length());
   ZBTxRequest zbTx = ZBTxRequest(addr64, dataArray, sizeof(dataArray));
   xbee.send(zbTx);
   delay(100);
  
}
///////////////////////////////////sleep send////////////////////////////////////
void sleepSend()
{
   String postData="Router:";
   postData=postData+String(routerName);
   postData=postData+" is sleep";
   postData=postData+" sleepMode:";
   postData=postData+String(sleepMode);
   
   
   DHT.read11(dht_dpin); 
   String Humidity="Humidity"+String(DHT.humidity);
   String Temperature="Temperature"+String(DHT.temperature);
   postData= postData+Humidity+Temperature;

   postData=postData+" ";
   

   uint8_t dataArray[postData.length()];
   postData.toCharArray(dataArray, postData.length());
   ZBTxRequest zbTx = ZBTxRequest(addr64, dataArray, sizeof(dataArray));
   xbee.send(zbTx);
   delay(100);
  
}

///////////////////////////////////////////Sleep////////////////////////////////////////////////////////////////
void goToSleep()   
{
set_sleep_mode(SLEEP_MODE_PWR_DOWN); // Set sleep mode.
sleep_enable(); // Enable sleep mode.
sleep_mode(); // Enter sleep mode.
sleep_disable(); // Disable sleep mode after waking.
                     
}
///////////////////////////////////////////Watch dog////////////////////////////////////////////////////////////////
void watchdogOn() 
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
