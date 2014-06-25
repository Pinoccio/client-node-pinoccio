
var through = require('through');

module.exports = function(){

  var s = through(function(l){
    var c = 0;
    for( c=0;c<l.length;++c ) {
      if(l.charAt(c) == '{'){
        s.level++;
      } else if(l.charAt(c) == '}'){
        if(s.level > 0) s.level--;
      }
    }

    s.queue({line:l,level:s.level});
  });

  s.level = 0;
  return s;
}

