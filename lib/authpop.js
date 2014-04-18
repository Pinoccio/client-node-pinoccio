var json = require('./json')

var origBodyScroll = getStyle(document.body,'overflow');
var active = false;

module.exports = function(api,perms,cb){
  var frame = document.createElement('iframe');
  frame.setAttribute('href',api+'/static/login.html');
  setStyle(frame,{
    width:'448px',
    height:'400px',
    border:'none'
  });

  // first positioning the iframe.
  // if the iframe default width+borders is >= screen size
  //  remove any borders.
  //  remove scroll
  //  use whiole screen
  //  make close button super obvious.
  //else
  //  revert any altered body scroll.
  //  center the iframe in fixed position div
  //  border iframe
  // bind <esc> press to cancel and create underlay with click to close.

  
  // remove scroll
  document.body.style.overflow = 'hidden';

  var cont = document.createElement('div');

  setStyle(cont,{
    border:'3px solid rgba(126,126,126,0.5);',
    borderRadius:'3px',
    position:'absolute',// not using fixed because mobile is weird.
    top:'0px',
    left:'0px'
  });

  if(active) active.destroy();

  cont.appendChild(frame);
  document.body.appendChild(cont);

  active = {
    frame:frame,
    container:cont,
    underlay:underlay,
    called:false,
    sizeData:{width:448,height:400},
    destroy:function(msg){
      document.body.removeChild(this.container);
      // remove underlay
      //document.body.removeChild(this.underlay);
      // restore scrollbars
      document.body.style.overflow = origBodyScroll;

      cb(new Error(msg||'destroyed'),false);
    },
    cb:function(error,data){
      // called once destory and call callback
      if(this.called) return;
      this.called = true;

      this.destroy();
      active = false;
      cb(err,data);
    },
    size:function(update){
      if(update) this.sizeData = update;
      // updates to height || position
      var wd = wdims();

      // lets position the thing.
      // first the iframe wants to be a size 
      setStyle(this.frame,{
        width:this.sizeData.width+'px',
        height:this.sizeData.height+'px'
      });

      // get the cont dims after the change.
      var cd = dims(this.container);

      var top = ((wd.height/2)+wd.top)-cd.height/2;
      var left = ((wd.width/2)+wd.left)-cd.width/2;

      setStyle(this.container,{
        top:top+'px',
        left:left+'px'
      });
    }
  };

  active.size();

  return active;
}


window.addEventListener('resize',function(){
  if(!active) return;
  active.size();
},false);


window.addEventListener("message", function(event){
  if(!active) return;
  if (event.origin !== active.api)
    return console.log('pinoccio: unexpected origin> ',event);

  var o = json(str);
  if(!o) return console.log('message invalid json');

  if(o.event == 'token') {
    active.cb(false,o.data);// < -- success
  } else if(o.event == 'error'){
    active.cb(o.error);// < -- cancel, error etc.
  } else if(o.event == 'size'){
    active.size(o.data);
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



