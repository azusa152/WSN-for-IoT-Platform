"use strict" ;
var cfg = require("./utl/cfg-app-platform.js")() ;   
   
if( !cfg.test() ) {
    process.exit(1) ;
}

if( !cfg.init() ) {
    process.exit(2) ;
}
 
exports.openMySerialPort= function  (){

cfg.io = new cfg.mraa.Uart(cfg.ioPin) ;         // construct our I/O object
cfg.ioPath = cfg.io.getDevicePath() ;   
cfg.io.setBaudRate(9600) ;
cfg.io.setMode(8, cfg.mraa.UART_PARITY_NONE, 1) ;
cfg.io.setFlowcontrol(false, false) ;
cfg.io.setTimeout(0, 0, 0) ;    
    
}
