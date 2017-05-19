var ponte = require("ponte");
var util = require('util');
var edison_time=[];
var ponte_time;
var time_count=0;
var dateFormat = require('dateformat');

var counter=0;
var fs = require('fs');
var logger = fs.createWriteStream('log.txt', {
  flags: 'a' // 'a' means appending (old data will be preserved)
})

var opts = {
  logger: {
    level: 'info'
  },
  http: {
    port: 3001 // tcp 
  },
  mqtt: {
    port: 1883 // tcp 
  },
  coap: {
    port: 5683 // udp 
  },

};
var server = ponte(opts);
 
server.on("updated", function(resource, buffer) {
  
 counter++;
 if(counter==500){
  logger = fs.createWriteStream('log1.txt', {
  flags: 'a' // 'a' means appending (old data will be preserved)
})
 }
 else if(counter==1000){
  logger = fs.createWriteStream('log2.txt', {
  flags: 'a' // 'a' means appending (old data will be preserved)
})
 }
 else if(counter==1500){
  logger = fs.createWriteStream('log3.txt', {
  flags: 'a' // 'a' means appending (old data will be preserved)
})
 }
 else if(counter==2001){
  logger = fs.createWriteStream('log4.txt', {
  flags: 'a' // 'a' means appending (old data will be preserved)
})
 }

  ponte_time=dateFormat(new Date(), "h:MM:ss.l");
  logger.write(ponte_time);
  logger.write('\n');
  


});

