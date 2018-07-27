function toggleAxis() {
  let check = document.getElementById('axis check').checked;
  document.getElementById('plot').setAttribute('plot',"enableAxis: " + check);
}

function toggleLabels() {
  let check = document.getElementById('label check').checked;
  document.getElementById('plot').setAttribute('plot',"enableLabels:"+check);
}

function toggleDenom() {
  let check = document.getElementById('denom check').checked;
  document.getElementById('plot').setAttribute('plot',"enableDenom: " + check);

}

function toggleGrid() {
  let check = document.getElementById('grid check').checked;
  document.getElementById('plot').setAttribute('plot',"enableGrid: " + check);
}

function toggleHelper() {
  if(document.getElementById('toggle').innerHTML == 'Close') {
    document.getElementById('toggle').innerHTML = 'Open'
    document.getElementById('inspector').style.visibility = 'hidden';
    document.getElementById('toggle').style.opacity = '0.5';
  } else {
    document.getElementById('toggle').innerHTML = 'Close'
    document.getElementById('inspector').style.visibility = 'visible';
    document.getElementById('toggle').style.opacity = '1';
  }
}

function toggleDenomLabels() {
  let check = document.getElementById('denomL check').checked;
  document.getElementById('plot').setAttribute('plot',"enableDenomLabels: " + check);
}

function updateColorScheme() {
  if(event.srcElement.id === "XG1" || event.srcElement.id === "XG2") {
      document.getElementById('plot').setAttribute('plot',"xGradient: " + document.getElementById('XG1').value + ", " + document.getElementById('XG2').value);
  }
  if(event.srcElement.id === "YG1" || event.srcElement.id === "YG2") {
      document.getElementById('plot').setAttribute('plot',"yGradient: " + document.getElementById('YG1').value + ", " + document.getElementById('YG2').value);
  }
  if(event.srcElement.id === "ZG1" || event.srcElement.id === "ZG2") {
      document.getElementById('plot').setAttribute('plot',"zGradient: " + document.getElementById('ZG1').value + ", " + document.getElementById('ZG2').value);
  }
}

function selectCamera() {
  document.getElementById('plot').setAttribute('plot', "activeCamera: " + event.srcElement.value);
}

document.addEventListener('DOMContentLoaded',function() {
    //setup information window
},false);
