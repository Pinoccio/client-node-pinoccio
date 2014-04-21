

//add css rules to the dom

module.exports = function(sheet,rules){ 
  if(rules[0] && rules.length){
    for(var i=0; i<rules.length;++i){
      var rule = rules[i];
      sheet.addRule(rule.selector||rule[0],formatRule(rule.rules||rule[1]));
    }
  } else {
    for(var selector in rules){
      if(!rules.hasOwnProperty(selector)) continue;
      sheet.addRule(selector,formatRule(rules[selector]));
    }
  }
}

// http://davidwalsh.name/add-rules-stylesheets
module.exports.insertStyle = function(){
  var style = document.createElement("style");
  // WebKit hack :(
  style.appendChild(document.createTextNode(""));
  // Add the <style> element to the page
  document.head.appendChild(style);
  return style;
}

function formatRule(r){
  if(r && r.substr) {
    return r;
  }

  var s = "";
  for(var k in r){
    if(!r.hasOwnProperty(k)) continue;
    s += k+':'+r[k]+';';
  }
  return s;
}

window.csstest = module.exports;
