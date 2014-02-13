var cookie = require('cookie');
var url = require('url');

//assumes document

module.exports = {
  getCookie:getCookie,
  setCookie:setCookie,
  clearCookie:clearCookie,
  findAPIScript:findAPIScript
}

// cookie helpers.

function getCookie(name){
  return (cookie.parse(document.cookie)||{})[name];
}

function setCookie(name,token){
  document.cookie = cookie.serialize(name,token,{
    expires: new Date(+(new Date())+1000*60*60*24*30)
    ,path:"/" 
  });
}

function clearCookie(name){
  document.cookie = cookie.serialize(name,'',{
    expires: new Date(0)
    ,path:"/" 
  });
}

function findAPIScript(){
  var scripts = document.getElementsByTagName('script');  
  for(var i=0;i<scripts.length;++i){
    if((scripts[i].src||'').indexOf('/pinoccio-api.js') > -1) {
      // handle protocolless urls
      var src = scripts[i].src;
      if(src.indexOf('//') === 0) {
        src = 'http:'+src;
      }

      var parsed = url.parse(src);
      if(parsed.host) {
        return (parsed.protocol||'https:')+'//'+parsed.host; // includes port.       
      }
    }
  }
}


