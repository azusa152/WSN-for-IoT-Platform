
//double inputData[]={2,3,4.5,7.6,4,2,2,2,3,1};
//double inputData[]={1,1,1,1,1,1,1,1,1,1};
//double inputData[]={-20,3,4.5,7.6,4,2,2,2,3,20};
double inputData[]={20.5,20.1,20.1,20.2,20.3,24,20.5,23,21,22};
double PAAArray[100];
int PAAWindow=5;
double PAAStandardDeviation=0;
double PAANormalised[10];
double PAAmean=0;
int PAAdevided=0;
/////////////////////////////
char SAXArray[100];
double SAXRange[]={-0.67,0,0.67};
void setup() {
  // put your setup code here, to run once:
  Serial.begin(9600);
  PAA();
  Serial.println("--------------------------------------:");
  SAX();
}

void loop() {
  // put your main code here, to run repeatedly:

}
void PAA(){
  
  int inputDataSize=sizeof(inputData)/4;
  for (int i = 0; i < inputDataSize; i++){
     PAAmean=PAAmean+inputData[i];
  }
  PAAmean=PAAmean/inputDataSize;
  Serial.print("PAAmean:");
  Serial.println(PAAmean);
  
  for (int i = 0; i < inputDataSize; i++){
    double j=(inputData[i]-PAAmean);
    PAAStandardDeviation=PAAStandardDeviation+pow(j,2);
  }
  PAAStandardDeviation=PAAStandardDeviation/inputDataSize;
  PAAStandardDeviation=sqrt(PAAStandardDeviation);
  Serial.print("PAAStandardDeviation:");
  Serial.println(PAAStandardDeviation);

  for (int i = 0; i < inputDataSize; i++){
    double j=(inputData[i]-PAAmean)/PAAStandardDeviation;
    if(PAAStandardDeviation==0){
      j=0;
    }
   
    PAANormalised[i]=j;
   Serial.print("PAANormalised:");
   Serial.println(PAANormalised[i]); 
  }

  PAAdevided=(inputDataSize+1)/PAAWindow;
  Serial.print("PAAdevided:");
  Serial.println(PAAdevided); 
  int counter=0;
  int condition=0;
  for(int i=0;i<PAAWindow;i++){
    double sumOfPAANormalised=0;
    condition=counter+PAAdevided;
    for(counter;counter<condition;counter++){
      sumOfPAANormalised=sumOfPAANormalised+PAANormalised[counter];
    }
    PAAArray[i]=sumOfPAANormalised/PAAdevided;
    Serial.print("PAA:");
    Serial.println(PAAArray[i]); 
  }
}

void SAX(){
  int rangeSize=sizeof(SAXRange)/4;
  for(int i=0;i<PAAWindow;i++){
    SAXtoChar(i,rangeSize);
    Serial.print("SAXArray:");
    Serial.println(SAXArray[i]); 
  }
}

void SAXtoChar(int i,int rangeSize){
  int symbolNumber=0;;
  for(symbolNumber;symbolNumber<rangeSize;symbolNumber++){
      if(PAAArray[i]<SAXRange[symbolNumber]){
        SAXArray[i]=97+symbolNumber;
        return;
      }
    }
  SAXArray[i]=97+symbolNumber;
}

