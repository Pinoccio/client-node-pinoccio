

module.exports = {
  "AT&V":function(data){
    /*
    > wifi.command("AT&V")
    ACTIVE PROFILE
    C0 &Y0 E0 V0 &K1 CPL0 CPH0
    +NDHCP=1 +NSET=192.168.1.99,255.255.255.0,192.168.1.1
    +DNS1=0.0.0.0, +DNS2=0.0.0.0
    +WM=0 +WAUTO=0,"rebelious bluejay",,
    +WRETRY=5 +WP=0 +WRXPS=1 +WRXACTIVE=0
    +NAUTO=0,1,192.168.43.172,22757
    +WAUTH=0 +WWPA="thewifipassword"+PSK-valid=0 +SSID=
    +WWEP1=1234567890 +WWEP2=
    +WWEP3= +WWEP4=
    S0=01000 S1=00500 S2=00500 S3=00003 S4=00010 S5=00150 S6=01000 S7=00000
    +BDATA=1  +WSEC=0  +ASYNCMSG=1 
    STORED PROFILE 0
    E0 V0 &K1 CPL0 CPH0
    +NDHCP=1 +NSET=192.168.1.99,255.255.255.0,192.168.1.1
    +DNS1=0.0.0.0, +DNS2=0.0.0.0
    +WM=0 +WAUTO=0,"rebelious bluejay",,
    +WRETRY=5 +WP=0 +WRXPS=1 +WRXACTIVE=0
    +NAUTO=0,1,192.168.43.172,22757
    +WAUTH=0 +WWPA="thewifipassword"+PSK-valid=0 +SSID=
    +WWEP1=1234567890 +WWEP2=
    +WWEP3= +WWEP4=
    S0=01000 S1=00500 S2=00500 S3=00003 S4=00010 S5=00150 S6=01000 S7=00000
    +BDATA=1  +WSEC=0  +ASYNCMSG=1
    */

    var profiles = data.split("STORED PROFILE");
    var active = profiles.shift();
    active = active.replace('"+PSK-valid=','" +PSK-valid=0');
    props = active.split(/\s\+|\r\n|\n/)

    var out = {_:[]};

    props.forEach(function(p){
      var eq = p.indexOf('=');
      if(eq == -1) out._.push(p);
      else {
        var k = p.substr(0,eq);
        out[k] = p.substr(eq+1);

        if(out[k].indexOf('"') === 0) out[k] =out[k].replace(/^"|"$/g,'');
        if(out[k] === "") out[k] = null;
        
      }
    })

    return out;

    


  },
  "wifi.list":function(data){
    /*
    BSSID              SSID                     Channel  Type  RSSI Security
     14:7d:c5:20:66:c8, rebelious bluejay               , 06,  INFRA , -42 , WPA2-PERSONAL
     04:a1:51:bc:a9:a6, cautiously brave sea horse      , 09,  INFRA , -59 , WPA2-PERSONAL
    No.Of AP Found:2
    */
    var lines = data.trim().split(/\r\n|\n/);
    var fields = lines.shift().split(/\s+/);
    var last = lines.pop();

    
    var out = {};
    lines.forEach(function(l){
      var o = {};
      l.split(', ').forEach(function(v,i){
        if(fields[i]) o[fields[i].toLowerCase()] = v.trim();
        else o[i] = v.trim();
      });
      out[o.ssid||o.bssid] = o;      
    });

    return out;
  }
};








