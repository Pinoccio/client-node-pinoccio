var test = require('tape');
var scoutparse = require('../lib/scoutparse');

var at_v = "ACTIVE PROFILE\n"
+"C0 &Y0 E0 V0 &K1 CPL0 CPH0\n"
+"+NDHCP=1 +NSET=192.168.1.99,255.255.255.0,192.168.1.1\n"
+"+DNS1=0.0.0.0, +DNS2=0.0.0.0\n"
+"+WM=0 +WAUTO=0,\"rebelious bluejay\",,\n"
+"+WRETRY=5 +WP=0 +WRXPS=1 +WRXACTIVE=0\n"
+"+NAUTO=0,1,192.168.43.172,22757\n"
+"+WAUTH=0 +WWPA=\"thewifipassword\"+PSK-valid=0 +SSID=\n"
+"+WWEP1=1234567890 +WWEP2=\n"
+"+WWEP3= +WWEP4=\n"
+"S0=01000 S1=00500 S2=00500 S3=00003 S4=00010 S5=00150 S6=01000 S7=00000\n"
+"+BDATA=1  +WSEC=0  +ASYNCMSG=1 \n"
+"STORED PROFILE 0\n"
+"E0 V0 &K1 CPL0 CPH0\n"
+"+NDHCP=1 +NSET=192.168.1.99,255.255.255.0,192.168.1.1\n"
+"+DNS1=0.0.0.0, +DNS2=0.0.0.0\n"
+"+WM=0 +WAUTO=0,\"rebelious bluejay\",,\n"
+"+WRETRY=5 +WP=0 +WRXPS=1 +WRXACTIVE=0\n"
+"+NAUTO=0,1,192.168.43.172,22757\n"
+"+WAUTH=0 +WWPA=\"thewifipassword\"+PSK-valid=0 +SSID=\n"
+"+WWEP1=1234567890 +WWEP2=\n"
+"+WWEP3= +WWEP4=\n"
+"S0=01000 S1=00500 S2=00500 S3=00003 S4=00010 S5=00150 S6=01000 S7=00000\n"
+"+BDATA=1  +WSEC=0  +ASYNCMSG=1\n"


test("can parse wifi command AT&V",function(t){
  var res = scoutparse['AT&V'](at_v);  

  t.ok(res,'should have result from parse');
  t.equals(res['WWPA'],"thewifipassword","should have parsed correctly");
  t.end();
});


