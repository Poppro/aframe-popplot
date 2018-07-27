function start() {
  runDOM()
  //draw the graph (should be abstracted later, this is temp)
  getData(function(data) {
    let sceneEl = document.querySelector('a-scene');
    let el = document.createElement('a-entity');
    el.setAttribute('id', 'plot')
    el.setAttribute('position', '2 2 0')
    el.setAttribute('plot', 'data:'+JSON.stringify(data)+';scale:10,2.5,10;labels:X-Label,Y-Label,Z-Label; \
   activeCamera:main;enableCamera:true;jsonLayout:x,z,y;enableRaycasting:true; particleSize: 0.005');
    sceneEl.appendChild(el);
  });
}

function getData(callback) {
  $.getJSON( "sample-data/sample.json", function( data ) {
    callback(data);
  });
}

function plotRaycaster(vals, names, index) {
  if(index !== undefined) {
    let info = document.getElementById('node-info');
    info.style.visibility = 'visible';
    info.getElementsByTagName('p')[0].innerHTML = "Node " + index + "<br> " + names.x + ": " + Math.round(vals.x*100)/100
    + "<br> " + names.y + ": " + Math.round(vals.y*100)/100
    + "<br> " + names.z + ": " + Math.round(vals.z*100)/100;
  } else {
    let info = document.getElementById('node-info');
    info.style.visibility = 'hidden';
  }
}

function runDOM() {
  if(document.getElementById('node-info') === null) {
    let infoWindow = document.createElement("div");
    infoWindow.style = 'position:absolute; width:150px; top:0px; right:0px; z-index: 99 !important; color: black; background-color: white; padding: 10px; visibility: visible;';
    let text = document.createElement("p");
    //text.innerHTML = "Node 2323 <br> X-Axis: 3233 <br> Y-Axis: 2323 <br> Z-Axis: 2323";
    infoWindow.appendChild(text);
    infoWindow.setAttribute('id', 'node-info');
    infoWindow.style.visibility = 'hidden';
    document.body.appendChild(infoWindow);
  }
}
