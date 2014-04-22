var json = require('./json')

var active = false;

module.exports = function(api,perms,cb){
  var frame = document.createElement('iframe');

  var w = 448;
  var h = 400;
  var left = (screen.width/2)-(w/2);
  var top = (screen.height/2)-(h/2);
  
  if(active) active.destroy();

  var authpop = window.open(api+'/static/login.html?perms='+encodeURIComponent(JSON.stringify(perms))+'&'+now(),
   "Pinoccio Authorize Login", "resizable,scrollbars,status,width="+w+",height="+h+",top="+top+",left="+left);

  active = {
    api:api,
    pop:authpop,
    //container:cont,
    underlay:false,
    called:false,
    sizeData:{width:448,height:400},
    destroy:function(msg){
      this.pop.close();
      active = false;
      cb(new Error(msg||'destroyed'),false);
    },
    cb:function(error,data){
      // called once destory and call callback
      if(this.called) return;
      this.called = true;

      this.destroy();
      active = false;
      cb(error,data);
    }
  };

  return active;
}


window.addEventListener('resize',function(){
  if(!active) return;
  active.size();
},false);


window.addEventListener("message", function(event){
  if(!active) return;
  if (event.origin !== active.api)
    return console.log('pinoccio: unexpected origin> ',event,active);

  var o = json(event.data);
  if(!o) return console.log('message invalid json');

  if(o.event == 'token') {
    active.cb(false,o.data);// < -- success
  } else if(o.event == 'error'){
    active.cb(o.error);// < -- cancel, error etc.
  } else if(o.event == 'size'){
  } else {
    console.log('pinoccio: unknown message from auth.',event);
  }

}, false);


window.addEventListener('keyup',function(ev){
  if(!active) return;
  if(ev.which === 27) active.destroy('closed with esc');
},false);


function dims(el){
  if(el === window) return wdims();
  return el.getBoundingClientRect();
}


function wdims(){
	var o = {
	  left:(window.pageXOffset !== undefined) ? window.pageXOffset : (document.documentElement || document.body.parentNode || document.body).scrollLeft,
	  top:(window.pageYOffset !== undefined) ? window.pageYOffset : (document.documentElement || document.body.parentNode || document.body).scrollTop
	}

  if(window.innerWidth){
    o.width = window.innerWidth;
    o.height = window.innerHeight;
  } else if( document.documentElement && ( document.documentElement.clientWidth || document.documentElement.clientHeight ) ) {
    //IE 6+ in 'standards compliant mode'
    o.width = document.documentElement.clientWidth;
    o.height = document.documentElement.clientHeight;
  }

  return o;
}

// quirksmode http://www.quirksmode.org/dom/getstyles.html
function getStyle(el,styleProp) {
  if (el.currentStyle)
    var y = el.currentStyle[styleProp];
  else if (window.getComputedStyle)
    var y = (window.getComputedStyle||document.defaultView.getComputedStyle)(el,null).getPropertyValue(styleProp);
  return y;
}

function setStyle(el,o){
  for(var i in o){
    if(!o.hasOwnProperty(i)) return;
    el.style[i] = o[i];
  }
}

function now(){
  return +(new Date())
}

