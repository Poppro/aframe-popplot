//global variables used by plot lib declared
var popPlotMouse = new THREE.Vector2();

//declare component
AFRAME.registerComponent('plot', {
  schema: { //need to add way to turn off raycasting, custom JSON files (attributes currently hardcoded), and custom animation speeds.
    data: {type: 'string'}, //the data that the graph is parsing. Pass in as a stringifyed JSON array.
    scale: {default: [2,2,2]}, //the scale of the graph in A-Frame units. You should not scale the graph manually with 'native scale', but you can if you want
    denomCount: {default: 10}, //number of denominators & denom labels that we render
    enableAxis: {default: true}, //enables the axis
    enableLabels: {default: false}, //enables labels for the plot
    enableDenom: {default: false}, //enables plot denominators
    enableGrid: {default: false}, //enables a grid around the plot
    enableDenomLabels: {default: false}, //enables denominator labels for the plot (at the moment does not work alongside enableLabels)
    enableCamera: {default: false}, //if enabled the camera will automatically put the 2d graph into "fullscreen view". Not reccomended unless you know what you're doing
    enableRaycasting: {default: false}, //when enabled the plot will create a raycaster and allow users to inspect individual elements in the plot (Access with the function plotRaycaster(vals,labels,index))
    xGradient: {default: ['#000000', '#FF0000']},
    yGradient: {default: ['#000000', '#00FF00']},
    zGradient: {default: ['#000000', '#0000FF']},
    graphColor: {default: 'FFFFFF'}, //use this to set the color of the graph elements such as labels & axis. Does not affect graph dataset color.
    particleSize: {default: 0.0025}, //size FACTOR of each particle in the graph. The size factor is scaled with the graph scale, and is therefor dynamic
    animationSpeed: {default: 0.1}, //linear interpolate speed of the librarys animations. 0 never moves, 1 is instant animation.
    activeCamera: {default: 'main'}, //animate & switch between cameras. main, camXY, camXZ, camYZ (Your scene camera needs to have a rig with id #rig for this to work & enableCamera===true)
    labels: {default: ['X-Axis', 'Y-Axis', 'Z-Axis']}, //label of your axis (purely cosmetic)
    jsonLayout: {default: ['x','y','z']} //names of the labels in your JSON input file (purely practical)
  },

  init: function () {
    this.step = 0;
    grabAndRender(this); //grabs all data from the JSON input and sets up the mesh for the graph
    drawAxis(this); //draws the basic 3 axis for the graph
    drawLabels(this); //draws axis labels
    drawDenom(this); //draws 3d demoninators
    drawGrid(this); //draws 3d plot grid
    drawNumbers(this); //draws denominator labels
    genSetup(this); //sets up any random stuff that needsto get done
    setupCamera(this); //renders all "2D" graph elements
  },

  update: function (oldData) { //this function allows us to modify the plot externally
    let data = this.data;
    if(data.enableAxis != oldData.enableAxis) {
      toggleAxisInternal(this);
    }
    if(data.enableLabels != oldData.enableLabels) {
      toggleLabelsInternal(this);
    }
    if(data.enableDenom != oldData.enableDenom) {
      toggleDenomInternal(this);
    }
    if(data.enableGrid != oldData.enableGrid) {
      toggleGridInternal(this);
    }
    if(data.enableDenomLabels != oldData.enableDenomLabels) {
      toggleDenomLabelsInternal(this);
      toggleLabelsInternal(this)
    }
    if(oldData.xGradient != undefined && (data.xGradient[0] != oldData.xGradient[0] || data.xGradient[1] != oldData.xGradient[1]
       || data.yGradient[0] != oldData.yGradient[0] || data.yGradient[1] != oldData.yGradient[1]
       || data.zGradient[0] != oldData.zGradient[0] || data.zGradient[1] != oldData.zGradient[1])) {
      updateGradientInternal(this);
    }
    if(data.activeCamera != oldData.activeCamera) {
      toggleDenomLabelsInternal(this);
      handleLerp(this, oldData.activeCamera);
    }
  },
  remove: function () {
  },

  tick: function (time, timeDelta) {
    //animate(this, time, timeDelta); //handles idle movement of the graph (asthetic)
    if(this.data.enableRaycasting === true) {
        raycast(this); //detects if the mouse is over a node & acts accordingly
    }
    if(this.lerping === true) {
      lerpCamera(this);
    }
  }
});

/////////////Main functions that handle all essential plot rendering/////////////
function drawAxis(self) {
  ////DRAW MAIN AXIS
    //Draw grid lines
    geometry = new THREE.Geometry();
    let material = new THREE.LineBasicMaterial( { color: '#'+self.data.graphColor } );
    let scale = self.el.getAttribute('plot').scale;
    geometry.vertices.push(new THREE.Vector3( 0, 0, scale[2]) );
    geometry.vertices.push(new THREE.Vector3( 0, 0, 0) );
    geometry.vertices.push(new THREE.Vector3( 0, scale[1], 0) );
    geometry.vertices.push(new THREE.Vector3( 0, 0, 0) );
    geometry.vertices.push(new THREE.Vector3( scale[0], 0, 0) );
    var grid = new THREE.Line(geometry, material);
    //add axis lines to sceneEl
    let el = self.el;
    el.setObject3D('axis', grid);
    el.getObject3D('axis').visible = self.data.enableAxis;
}

function drawDenom(self) {
    //Draw grid lines
    geometry = new THREE.Geometry();
    let material = new THREE.LineBasicMaterial( { color: '#'+self.data.graphColor } );
    let denomCount = self.data.denomCount;
    let scale = self.data.scale;
    let sizeFactor = 20;
    //draw z
    for(let i = 1; i <= denomCount; i++) {
      geometry.vertices.push(new THREE.Vector3(-scale[0]/sizeFactor, 0, (scale[0]/denomCount)*i));
      geometry.vertices.push(new THREE.Vector3(scale[0]/sizeFactor, 0, (scale[0]/denomCount)*i));
    }
    //draw x
    for(let i = 1; i <= denomCount; i++) {
      geometry.vertices.push(new THREE.Vector3((scale[2]/denomCount)*i+0, 0, 0-scale[2]/sizeFactor));
      geometry.vertices.push(new THREE.Vector3((scale[2]/denomCount)*i+0, 0, 0+scale[2]/sizeFactor));
    }
    //draw y
    for(let i = 1; i <= denomCount; i++) {
      geometry.vertices.push(new THREE.Vector3(0-Math.sqrt(Math.pow((scale[1]/sizeFactor),2)/2), (scale[1]/denomCount)*i+0, 0+Math.sqrt(Math.pow((scale[1]/sizeFactor),2)/2)));
      geometry.vertices.push(new THREE.Vector3(0+Math.sqrt(Math.pow((scale[1]/sizeFactor),2)/2), (scale[1]/denomCount)*i+0, 0-Math.sqrt(Math.pow((scale[1]/sizeFactor),2)/2)));
    }
    let denoms = new THREE.LineSegments(geometry, material);
    //add denominators line to object geometry
    let el = self.el;
    el.setObject3D('denominators', denoms);
    el.getObject3D('denominators').visible = self.data.enableDenom;
}

function drawGrid(self) {
    //Draw grid lines
    geometry = new THREE.Geometry();
    let material = new THREE.LineBasicMaterial( { color: '#'+self.data.graphColor, opacity: 0.25, transparent: true } );
    let denomCount = self.data.denomCount;
    let scale = self.el.getAttribute('plot').scale;
    //draw z
    for(let j = 0; j <= denomCount; j++) {
      for(let i = 0; i <= denomCount; i++) {
        geometry.vertices.push(new THREE.Vector3(0, 0+scale[1]/denomCount*j, (scale[2]/denomCount)*i+0));
        geometry.vertices.push(new THREE.Vector3(0+scale[0], 0+scale[1]/denomCount*j, (scale[2]/denomCount)*i+0));
      }
    }
    //draw x
    for(let j = 0; j <= denomCount; j++) {
      for(let i = 0; i <= denomCount; i++) {
        geometry.vertices.push(new THREE.Vector3((scale[0]/denomCount)*i+0, 0+scale[1]/denomCount*j, 0));
        geometry.vertices.push(new THREE.Vector3((scale[0]/denomCount)*i+0, 0+scale[1]/denomCount*j, 0+scale[2]));
      }
    }
    //draw y
    for(let j = 0; j <= denomCount; j++) {
      for(let i = 0; i <= denomCount; i++) {
        geometry.vertices.push(new THREE.Vector3((scale[0]/denomCount)*i+0, 0, 0+scale[2]/denomCount*j));
        geometry.vertices.push(new THREE.Vector3((scale[0]/denomCount)*i+0, 0+scale[1], 0+scale[2]/denomCount*j));
      }
    }
    let grid = new THREE.LineSegments(geometry, material);

    //add grid lines to object geometry
    let el = self.el;
    el.setObject3D('grid', grid);
    el.getObject3D('grid').visible = self.data.enableGrid;;
}

function drawLabels(self) {
  //Text initalize
  let labelx = document.createElement('a-text');
  let labely = document.createElement('a-text');
  let labelz = document.createElement('a-text');
  let gSize = (parseFloat(self.data.scale[0])+parseFloat(self.data.scale[1])+parseFloat(self.data.scale[2]))/3
  //build text appropriately
  labelx.setAttribute('value',self.data.labels[0]);
  labelx.setAttribute('rotation', '-90 180 0');
  labelx.setAttribute('position', (self.data.scale[0]/2)  + ' ' + 0 + ' ' + (-.15*self.data.scale[2]+0));
  labelx.setAttribute('scale', (0.3*gSize) + ' ' + (0.3*gSize) + ' 1');
  labelx.setAttribute('anchor', 'align');
  labelx.setAttribute('align', 'center');
  labelx.setAttribute('color','#'+self.data.graphColor)
  labely.setAttribute('value',self.data.labels[1]);
  labely.setAttribute('rotation', '0 135 -90');
  labely.setAttribute('position', (-.15*self.data.scale[1]+0) + ' ' + (self.data.scale[1]/2+0) + ' ' + (0-.15*self.data.scale[1]));
  labely.setAttribute('scale', 0.3*gSize + ' ' + 0.3*gSize + ' 1');
  labely.setAttribute('anchor', 'align');
  labely.setAttribute('align', 'center');
  labely.setAttribute('side', 'double');
  labely.setAttribute('color','#'+self.data.graphColor)
  labelz.setAttribute('value',self.data.labels[2]);
  labelz.setAttribute('rotation', '-90 -90 0');
  labelz.setAttribute('position', (-.15*self.data.scale[0]+0) + ' ' +  0  + ' ' + (self.data.scale[2]/2+0))
  labelz.setAttribute('scale', 0.3*gSize + ' ' + 0.3*gSize + ' 1');
  labelz.setAttribute('anchor', 'align');
  labelz.setAttribute('align', 'center');
  labelz.setAttribute('color','#'+self.data.graphColor);
  //add to dom
  self.el.appendChild(labelx);
  self.el.appendChild(labely);
  self.el.appendChild(labelz);
  //save for use throughout controller
  self.labelx = labelx;
  self.labely = labely;
  self.labelz = labelz;
  self.labelx.object3D.visible = self.data.enableLabels;;
  self.labely.object3D.visible = self.data.enableLabels;
  self.labelz.object3D.visible = self.data.enableLabels;
}

function drawNumbers(self) {
  self.numberLabels = [[],[],[]]; //stores all number labels in 2d array based on axis
  let count = self.data.denomCount;
  //setup scale calculation
  let xscale = self.xmax - self.xmin;
  let scale = self.data.scale;
  let sizeFactor = 20;
  //draw x labels
  for(let i = 1; i <= count; i++) {
    let numLabelx = document.createElement('a-text');
    let val= Math.floor(((i/count)*xscale+self.xmin)*100)/100;
    numLabelx.setAttribute('value', val);
    numLabelx.setAttribute('rotation', '-90 -90 0');
    numLabelx.setAttribute('position', i*(scale[0]/10)  + ' ' + 0 + ' ' + (-scale[2]/sizeFactor/.8));
    numLabelx.setAttribute('scale', 0.2*scale[0] + ' ' + 0.2*scale[0] + ' 1');
    numLabelx.setAttribute('anchor', 'right');
    numLabelx.setAttribute('align', 'right');
    numLabelx.setAttribute('color','#'+self.data.graphColor)
    numLabelx.object3D.visible = self.data.enableDenomLabels;
    self.el.appendChild(numLabelx);
    self.numberLabels[0].push(numLabelx);
  }
  //setup scale calculation
  let yscale = self.ymax - self.ymin;
  //draw y Labels
  for(let i = 1; i <= count; i++) {
    let numLabely = document.createElement('a-text');
    let val= Math.floor(((i/count)*yscale+self.ymin)*100)/100;
    numLabely.setAttribute('value', val);
    numLabely.setAttribute('rotation', '0 -45 0');
    numLabely.setAttribute('position',  (-scale[0]/sizeFactor/.8)  + ' ' + i*(scale[1]/10) + ' ' + (-scale[2]/sizeFactor/.8));
    numLabely.setAttribute('scale', 0.2*scale[1] + ' ' + 0.2*scale[1] + ' 1');
    numLabely.setAttribute('anchor', 'right');
    numLabely.setAttribute('align', 'right');
    numLabely.setAttribute('side', 'double')
    numLabely.setAttribute('color','#'+self.data.graphColor)
    numLabely.object3D.visible = self.data.enableDenomLabels;
    self.el.appendChild(numLabely);
    self.numberLabels[1].push(numLabely);
  }
  //scale calculate
  let zscale = self.zmax - self.zmin;
  //draw x labels
  for(let i = 1; i <= count; i++) {
    let numLabelz = document.createElement('a-text');
    let val= Math.floor(((i/count)*zscale+self.zmin)*100)/100;
    numLabelz.setAttribute('value', val);
    numLabelz.setAttribute('rotation', '-90 0 0');
    numLabelz.setAttribute('position', (-scale[0]/sizeFactor/.8) + ' ' + 0 + ' ' + i*(scale[2]/10));
    numLabelz.setAttribute('scale', 0.2*scale[2] + ' ' + 0.2*scale[2] + ' 1');
    numLabelz.setAttribute('anchor', 'right');
    numLabelz.setAttribute('align', 'right');
    numLabelz.setAttribute('color','#'+self.data.graphColor)
    numLabelz.object3D.visible = self.data.enableDenomLabels;
    self.el.appendChild(numLabelz);
    self.numberLabels[0].push(numLabelz);
  }
}

function grabAndRender(self) {
  //Initalize global variables for the component..
  self.step = 0;
  self.oldIndex = -1;
  self.oldColor;
  //setup the JSON layout variables
  let xl = self.data.jsonLayout[0];
  let yl = self.data.jsonLayout[1];
  let zl = self.data.jsonLayout[2];
  //Setup for graph generation by getting scale information from json
  var data = self.el.getAttribute('plot').data;
  data = JSON.parse(data)
  self.dataset = data;
  let xmax = -2000000000000000;
  let ymax = -2000000000000000;
  let zmax = -2000000000000000;
  let xmin = 2000000000000000;
  let ymin = 2000000000000000;
  let zmin = 2000000000000000;
  for(let i = 0; i < data.length; i++) {
    //handle x value min and max
    if(data[i][xl] > xmax) {
      xmax = data[i][xl];
    }
    if(data[i][xl] < xmin) {
      xmin = data[i][xl];
    }
    //handle y
    if(data[i][yl] > ymax) {
      ymax = data[i][yl];
    }
    if(data[i][yl] < ymin) {
      ymin = data[i][yl];
    }
    //handle z
    if(data[i][zl] > zmax) {
      zmax = data[i][zl];
    }
    if(data[i][zl] < zmin) {
      zmin = data[i][zl];
    }
  }
  //store max & mins locally
  self.xmax = xmax;
  self.ymax = ymax;
  self.zmax=  zmax;
  self.xmin = xmin;
  self.ymin = ymin;
  self.zmin = zmin;
  //calculate total scale
  let xscale = xmax - xmin;
  let yscale = ymax - ymin;
  let zscale = zmax - zmin;
  //calculate median of dataset
  let xmed = (xmax+xmin)/2;
  let ymed = (ymax+ymin)/2;
  let zmed = (zmax+zmin)/2;

  //*****************BEGIN PARTICLE SYSTEM GENERATION***************\\
  //temporary declartion of how large the graph should be
  let scale = self.data.scale;

  // create the particle variables
  var geometry = new THREE.BufferGeometry(),
    pMaterial = new THREE.PointsMaterial({
      vertexColors: THREE.VertexColors,
      size: self.data.particleSize*Math.cbrt(Math.pow(scale[0],2)+Math.pow(scale[1],2)+Math.pow(scale[2],2))
  });

  //grab gradient colors as RGB for linear gradient calculation
  let xG1 = hexToRGB(self.data.xGradient[0]);
  let xG2 = hexToRGB(self.data.xGradient[1]);
  let yG1 = hexToRGB(self.data.yGradient[0]);
  let yG2 = hexToRGB(self.data.yGradient[1]);
  let zG1 = hexToRGB(self.data.zGradient[0]);
  let zG2 = hexToRGB(self.data.zGradient[1]);

  //setup a local variable to store all particle locations for animaton purposes
  self.vertices = [];
  let v = new Float32Array( data.length * 3 ); //vert array
  let c = new Float32Array( data.length * 3 ); //color array
  //Loop through all json data Points
  for(let i = 0, j=0; i < data.length; i++, j+=3) {
    let vertex = new THREE.Vector3();
    let datax = data[i][xl];
    let datay = data[i][yl];
    let dataz = data[i][zl];
    vertex.x =  (((datax/xscale)-(xmed/xscale))*scale[0])+(scale[0]/2);
    vertex.y = ((datay/yscale)-(ymed/yscale))*scale[1]+(scale[1]/2);
    vertex.z = (((dataz/zscale)-(zmed/zscale))*scale[2]+(scale[2]/2));
    v[j] = vertex.x;
    v[j+1] = vertex.y;
    v[j+2] = vertex.z;
    self.vertices.push({x: vertex.x, y: vertex.y, z: vertex.z});
    ////generate color scheme\\\\\
    let totalR = ((Math.ceil((xG2[0]-xG1[0])*((datax-xmin)/xscale))) + xG1[0]) + //calculate gradient colors Red
      ((Math.ceil((yG2[0]-yG1[0])*((datay-ymin)/yscale)) + yG1[0]) +
      ((Math.ceil((zG2[0]-zG1[0])*((dataz-zmin)/zscale)))) + zG1[0])
    if(totalR > 255) {
      totalR = 255;
    }
    let totalG = ((Math.ceil((xG2[1]-xG1[1])*((datax-xmin)/xscale))) + xG1[1]) + //calculate gradient colors Greed
      ((Math.ceil((yG2[1]-yG1[1])*((datay-ymin)/yscale)) + yG1[1]) +
      ((Math.ceil((zG2[1]-zG1[1])*((dataz-zmin)/zscale)))) + zG1[1])
    if(totalR > 255) {
      totalR = 255;
    }
    let totalB = ((Math.ceil((xG2[2]-xG1[2])*((datax-xmin)/xscale))) + xG1[2]) + //calculate gradient colors Blue
      ((Math.ceil((yG2[2]-yG1[2])*((datay-ymin)/yscale)) + yG1[2]) +
      ((Math.ceil((zG2[2]-zG1[2])*((dataz-zmin)/zscale)))) + zG1[2])
    if(totalR > 255) {
      totalR = 255;
    }

    var color = new THREE.Color("rgb(" + totalR + ", "
    + totalG + ", "
    + totalB + ")");
    c[j] = color.r;
    c[j+1] = color.g;
    c[j+2] = color.b;
  }
  // create the particle system
  geometry.addAttribute( 'position', new THREE.BufferAttribute( v, 3));
  geometry.addAttribute( 'color', new THREE.BufferAttribute(c, 3));
  self.cc = new THREE.Points(geometry,pMaterial);
  // add it to the scene
  let el = self.el;
  el.setObject3D('mesh', self.cc);
}

function genSetup(self) { //a general setup function.
  //setup raycaster
  self.raycaster = new THREE.Raycaster();
}

function setupCamera(self) { //this function is run once to render in objects used for 2D graph visualization.
  ///////2D Denominations!!!!!!!!!/////
  let denomCount = self.data.denomCount;
  let geometry = new THREE.Geometry();
  let scale = self.el.getAttribute('plot').scale;
  let sizeFactor = 60;
  let material = new THREE.LineBasicMaterial( { color: '#'+self.data.graphColor } );
  //draw x
  for(let i = 1; i <= denomCount; i++) {
    geometry.vertices.push(new THREE.Vector3((scale[0]/denomCount)*i+0, 0-scale[0]/sizeFactor, 0));
    geometry.vertices.push(new THREE.Vector3((scale[0]/denomCount)*i+0, 0+scale[0]/sizeFactor, 0));
  }
  //draw y
  for(let i = 1; i <= denomCount; i++) {
    geometry.vertices.push(new THREE.Vector3(0-scale[1]/sizeFactor, (scale[1]/denomCount)*i+0, 0));
    geometry.vertices.push(new THREE.Vector3(0+scale[1]/sizeFactor, (scale[1]/denomCount)*i+0, 0));
  }
  let denoms = new THREE.LineSegments(geometry, material);
  let el = self.el
  el.setObject3D('denominatorsXY', denoms);
  el.getObject3D('denominatorsXY').scale.x = 0.01;
  el.getObject3D('denominatorsXY').scale.y = 0.01;
  el.getObject3D('denominatorsXY').scale.z = 0.01;
  el.getObject3D('denominatorsXY').visible = self.data.enableDenom;
  geometry = new THREE.Geometry();
  //draw x
  for(let i = 1; i <= denomCount; i++) {
    geometry.vertices.push(new THREE.Vector3((scale[0]/denomCount)*i+0, 0, 0-scale[0]/sizeFactor));
    geometry.vertices.push(new THREE.Vector3((scale[0]/denomCount)*i+0, 0, 0+scale[0]/sizeFactor));
  }
  //draw y
  for(let i = 1; i <= denomCount; i++) {
    geometry.vertices.push(new THREE.Vector3(0-scale[2]/sizeFactor, 0, (scale[2]/denomCount)*i+0));
    geometry.vertices.push(new THREE.Vector3(0+scale[2]/sizeFactor, 0, (scale[2]/denomCount)*i+0));
  }
  denoms = new THREE.LineSegments(geometry, material);
  el.setObject3D('denominatorsXZ', denoms);
  el.getObject3D('denominatorsXZ').scale.x = 0.01;
  el.getObject3D('denominatorsXZ').scale.y = 0.01;
  el.getObject3D('denominatorsXZ').scale.z = 0.01;
  el.getObject3D('denominatorsXZ').visible = self.data.enableDenom;
  geometry = new THREE.Geometry();
  //draw x
  for(let i = 1; i <= denomCount; i++) {
    geometry.vertices.push(new THREE.Vector3(0, 0-scale[2]/sizeFactor, (scale[2]/denomCount)*i+0));
    geometry.vertices.push(new THREE.Vector3(0, 0+scale[2]/sizeFactor, (scale[2]/denomCount)*i+0));
  }
  //draw y
  for(let i = 1; i <= denomCount; i++) {
    geometry.vertices.push(new THREE.Vector3(0, (scale[1]/denomCount)*i+0, 0-scale[1]/sizeFactor));
    geometry.vertices.push(new THREE.Vector3(0, (scale[1]/denomCount)*i+0, 0+scale[1]/sizeFactor));
  }
  denoms = new THREE.LineSegments(geometry, material);
  el.setObject3D('denominatorsYZ', denoms);
  el.getObject3D('denominatorsYZ').scale.x = 0.01;
  el.getObject3D('denominatorsYZ').scale.y = 0.01;
  el.getObject3D('denominatorsYZ').scale.z = 0.01;
  el.getObject3D('denominatorsYZ').visible = self.data.enableDenom;
  /////////*******************render labels******************\\\\\\\\\\ (all will be stored inside of 2d matrices)
  ////////DRAW XZ CAM LABELS\\\\\\\\ 1
  self.numberLabelsXZ = [[],[]]; //stores all number labels in 2d array based on axis
  let count = self.data.denomCount;
  //setup scale calculation
  let xscale = self.xmax - self.xmin;
  let yscale = self.ymax - self.ymin;
  let zscale = self.zmax - self.zmin;
  sizeFactor = 60;
  //draw x labels
  for(let i = 1; i <= count; i++) {
    let numLabelx = document.createElement('a-text');
    let val= Math.floor(((i/count)*xscale+self.xmin)*100)/100;
    numLabelx.setAttribute('value', val);
    numLabelx.setAttribute('rotation', '90 0 90');
    numLabelx.setAttribute('position', i*(scale[0]/10)  + ' ' + 0 + ' ' + (-scale[2]/sizeFactor/.8));
    numLabelx.setAttribute('scale', 0.15*scale[0] + ' ' + 0.15*scale[0] + ' 1');
    numLabelx.setAttribute('anchor', 'right');
    numLabelx.setAttribute('align', 'right');
    numLabelx.object3D.visible = false;
    self.el.appendChild(numLabelx);
    self.numberLabelsXZ[0].push(numLabelx);
  }
  //draw y Labels
  for(let i = 1; i <= count; i++) {
    let numLabelz = document.createElement('a-text');
    let val= Math.floor(((i/count)*zscale+self.zmin)*100)/100;
    numLabelz.setAttribute('value', val);
    numLabelz.setAttribute('rotation', '90 0 0');
    numLabelz.setAttribute('position',  (-scale[0]/sizeFactor/.8)  + ' 0 '  + i*(scale[2]/10));
    numLabelz.setAttribute('scale', 0.15*scale[2] + ' ' + 0.15*scale[2] + ' 1');
    numLabelz.setAttribute('anchor', 'right');
    numLabelz.setAttribute('align', 'right');
    numLabelz.object3D.visible = false;
    self.el.appendChild(numLabelz);
    self.numberLabelsXZ[1].push(numLabelz);
  }
  ////////DRAW XY CAM LABELS\\\\\\\\ 2
  self.numberLabelsXY = [[],[]]; //stores all number labels in 2d array based on axis
  //draw x labels
  for(let i = 1; i <= count; i++) {
    let numLabelx = document.createElement('a-text');
    let val= Math.floor(((i/count)*xscale+self.xmin)*100)/100;
    numLabelx.setAttribute('value', val);
    numLabelx.setAttribute('rotation', '0 0 90');
    numLabelx.setAttribute('position', i*(scale[0]/10)  + ' ' + (-scale[1]/sizeFactor/.8) + ' 0');
    numLabelx.setAttribute('scale', 0.15*scale[0] + ' ' + 0.15*scale[0] + ' 1');
    numLabelx.setAttribute('anchor', 'right');
    numLabelx.setAttribute('align', 'right');
    numLabelx.object3D.visible = false;
    self.el.appendChild(numLabelx);
    self.numberLabelsXY[0].push(numLabelx);
  }
  //draw y Labels
  for(let i = 1; i <= count; i++) {
    let numLabely = document.createElement('a-text');
    let val= Math.floor(((i/count)*yscale+self.ymin)*100)/100;
    numLabely.setAttribute('value', val);
    numLabely.setAttribute('rotation', '0 0 0');
    numLabely.setAttribute('position',  (-scale[0]/sizeFactor/.8)  + ' ' + i*(scale[1]/10) + ' 0');
    numLabely.setAttribute('scale', 0.15*scale[1] + ' ' + 0.15*scale[1] + ' 1');
    numLabely.setAttribute('anchor', 'right');
    numLabely.setAttribute('align', 'right');
    numLabely.object3D.visible = false;
    self.el.appendChild(numLabely);
    self.numberLabelsXY[1].push(numLabely);
  }
  ////////DRAW YZ CAM LABELS\\\\\\\\ 3
  self.numberLabelsYZ = [[],[]]; //stores all number labels in 2d array based on axis
  //draw x labels
  for(let i = 1; i <= count; i++) {
    let numLabelz = document.createElement('a-text');
    let val= Math.floor(((i/count)*zscale+self.zmin)*100)/100;
    numLabelz.setAttribute('value', val);
    numLabelz.setAttribute('rotation', '0 -90 90');
    numLabelz.setAttribute('position',   '0 ' + (-scale[1]/sizeFactor/.8) + ' ' + i*(scale[2]/10));
    numLabelz.setAttribute('scale', 0.15*scale[2] + ' ' + 0.15*scale[2] + ' 1');
    numLabelz.setAttribute('anchor', 'right');
    numLabelz.setAttribute('align', 'right');
    numLabelz.object3D.visible = false;
    self.el.appendChild(numLabelz);
    self.numberLabelsYZ[0].push(numLabelz);
  }
  //draw y Labels
  for(let i = 1; i <= count; i++) {
    let numLabely = document.createElement('a-text');
    let val= Math.floor(((i/count)*yscale+self.ymin)*100)/100;
    numLabely.setAttribute('value', val);
    numLabely.setAttribute('rotation', '0 -90 0');
    numLabely.setAttribute('position',  '0 ' + i*(scale[1]/10) + ' ' + (-scale[2]/sizeFactor/.8));
    numLabely.setAttribute('scale', 0.15*scale[1] + ' ' + 0.15*scale[1] + ' 1');
    numLabely.setAttribute('anchor', 'right');
    numLabely.setAttribute('align', 'right');
    numLabely.object3D.visible = false;
    self.el.appendChild(numLabely);
    self.numberLabelsYZ[1].push(numLabely);
    /////////////////DRAW GRID/////////////
    //Draw grid lines
    geometry = new THREE.Geometry();
    material = new THREE.LineBasicMaterial( { color: '#'+self.data.graphColor, opacity: 0.25, transparent: true } );
    //draw XZ
    for(let i = 0; i <= denomCount; i++) {
        geometry.vertices.push(new THREE.Vector3(0, 0, (scale[2]/denomCount)*i));
        geometry.vertices.push(new THREE.Vector3(scale[0], 0, (scale[2]/denomCount)*i));
        geometry.vertices.push(new THREE.Vector3((scale[0]/denomCount)*i, 0, 0));
        geometry.vertices.push(new THREE.Vector3((scale[0]/denomCount)*i, 0, scale[2]));
    }
    var grid = new THREE.LineSegments(geometry, material);
    //add denominators line to object geometry
    self.el.setObject3D('gridXZ', grid);
    self.el.getObject3D('gridXZ').visible = false;
    geometry = new THREE.Geometry();
    //draw XY
    for(let i = 0; i <= denomCount; i++) {
        geometry.vertices.push(new THREE.Vector3(0, (scale[1]/denomCount)*i, 0));
        geometry.vertices.push(new THREE.Vector3(scale[0], (scale[1]/denomCount)*i, 0));
        geometry.vertices.push(new THREE.Vector3((scale[0]/denomCount)*i, 0, 0));
        geometry.vertices.push(new THREE.Vector3((scale[0]/denomCount)*i, scale[1], 0));
    }
    grid = new THREE.LineSegments(geometry, material);
    //add denominators line to object geometry
    self.el.setObject3D('gridXY', grid);
    self.el.getObject3D('gridXY').visible = false;
    geometry = new THREE.Geometry();
    //draw YZ
    for(let i = 0; i <= denomCount; i++) {
        geometry.vertices.push(new THREE.Vector3(0, 0, (scale[2]/denomCount)*i));
        geometry.vertices.push(new THREE.Vector3(0, scale[1], (scale[2]/denomCount)*i));
        geometry.vertices.push(new THREE.Vector3(0, (scale[1]/denomCount)*i, 0));
        geometry.vertices.push(new THREE.Vector3(0, (scale[1]/denomCount)*i, scale[2]));
    }
    grid = new THREE.LineSegments(geometry, material);
    //add denominators line to object geometry
    self.el.setObject3D('gridYZ', grid);
    self.el.getObject3D('gridYZ').visible = false;
  }
}

/////////////UPDATE FUNCTIONS!!!!!//////////
function toggleAxisInternal(self) { //toggles the axis
    self.el.getObject3D('axis').visible = self.data.enableAxis;
}

function toggleLabelsInternal(self) { //also handles lable positioning...
    self.labelx.object3D.visible = self.data.enableLabels;
    self.labely.object3D.visible = self.data.enableLabels;
    self.labelz.object3D.visible = self.data.enableLabels;

    self.labelx.setAttribute('align', 'center');
    self.labely.setAttribute('align', 'center');
    self.labelz.setAttribute('align', 'center');
    if(self.data.activeCamera === 'main') {
      if(self.data.enableDenomLabels === true) {
        self.labelx.setAttribute('position', (parseFloat(self.data.scale[0])+self.data.scale[0]/10) + ' 0 0');
        self.labelx.setAttribute('rotation', '-90 -90 0')
        self.labelz.setAttribute('position', '0 0 ' + (parseFloat(self.data.scale[2])+self.data.scale[2]/10));
        self.labelz.setAttribute('rotation', '-90 0 0')
        self.labely.setAttribute('position', '0 ' + (parseFloat(self.data.scale[1])+self.data.scale[1]/10) + ' 0');
        self.labely.setAttribute('rotation', '0 -45 0')
      } else {
        self.labelx.setAttribute('rotation', '-90 180 0');
        self.labelx.setAttribute('position', (self.data.scale[0]/2)  + ' ' + 0 + ' ' + (-.15*self.data.scale[2]+0));
        self.labely.setAttribute('rotation', '0 -45 -90');
        self.labely.setAttribute('position', (-.15*self.data.scale[1]+0) + ' ' + (self.data.scale[1]/2+0) + ' ' + (0-.15*self.data.scale[1]));
        self.labelz.setAttribute('rotation', '-90 -90 0');
        self.labelz.setAttribute('position', (-.15*self.data.scale[0]+0) + ' ' +  0  + ' ' + (self.data.scale[2]/2+0))
      }
    } else if(self.data.activeCamera === 'camXZ') {
      self.labely.object3D.visible = false;
      if(self.data.enableDenomLabels === true) {
        self.labelx.setAttribute('rotation', '90 0 0');
        self.labelx.setAttribute('position', (self.data.scale[0]/10+parseFloat(self.data.scale[0]))  + ' 0 0');
        self.labelz.setAttribute('rotation', '90 0 0');
        self.labelz.setAttribute('position', '0 0 ' + (self.data.scale[2]/10+parseFloat(self.data.scale[2])));
        self.labelx.setAttribute('align', 'left')
      } else {
        self.labelx.setAttribute('rotation', '90 0 0');
        self.labelx.setAttribute('position', (self.data.scale[0]/2)  + ' ' + 0 + ' ' + (-.15*self.data.scale[2]));
        self.labelz.setAttribute('rotation', '90 0 90');
        self.labelz.setAttribute('position', (-.15*self.data.scale[0]) + ' ' +  0  + ' ' + (self.data.scale[2]/2))
      }
    } else if(self.data.activeCamera === 'camXY') {
      self.labelz.object3D.visible = false;
      if(self.data.enableDenomLabels === true) {
        self.labelx.setAttribute('rotation', '0 0 0');
        self.labelx.setAttribute('position', (self.data.scale[0]/10+parseFloat(self.data.scale[0]))  + ' 0 0');
        self.labely.setAttribute('rotation', '0 0 0');
        self.labely.setAttribute('position', '0 ' + (self.data.scale[1]/10+parseFloat(self.data.scale[1])) + ' 0');
        self.labelx.setAttribute('align', 'left')
      } else {
        self.labelx.setAttribute('rotation', '0 0 0');
        self.labelx.setAttribute('position', (self.data.scale[0]/2)  + ' ' + (-.15*self.data.scale[1]) + ' 0');
        self.labely.setAttribute('rotation', '0 0 90');
        self.labely.setAttribute('position', (-.15*self.data.scale[0]) + ' ' +  (self.data.scale[1]/2)  + ' 0')
      }
    } else if(self.data.activeCamera === 'camYZ') {
      self.labelx.object3D.visible = false;
      if(self.data.enableDenomLabels === true) {
        self.labelz.setAttribute('rotation', '0 -90 0');
        self.labelz.setAttribute('position', '0 0 ' + (self.data.scale[2]/10+parseFloat(self.data.scale[2])));
        self.labely.setAttribute('rotation', '0 -90 0');
        self.labely.setAttribute('position', '0 ' + (self.data.scale[1]/10+parseFloat(self.data.scale[1])) + ' 0');
        self.labelz.setAttribute('align', 'left')
      } else {
        self.labelz.setAttribute('rotation', '0 -90 0');
        self.labelz.setAttribute('position', '0 ' + (-.15*self.data.scale[1]) + ' ' + (self.data.scale[2]/2));
        self.labely.setAttribute('rotation', '0 -90 90');
        self.labely.setAttribute('position', '0 ' +  (self.data.scale[1]/2)  + ' ' + -.15*self.data.scale[2])
      }
    }
}

function toggleDenomInternal(self) { //toggles plot denominators
    self.el.getObject3D('denominators').visible = self.data.enableDenom;
    self.el.getObject3D('denominatorsXZ').visible = self.data.enableDenom;
    self.el.getObject3D('denominatorsYZ').visible = self.data.enableDenom;
    self.el.getObject3D('denominatorsXY').visible = self.data.enableDenom;
}

function toggleGridInternal(self) { //toggles showing the plot's grid
  let cam = self.data.activeCamera;
  self.el.getObject3D('grid').visible = false;
  self.el.getObject3D('gridXZ').visible = false;
  self.el.getObject3D('gridXY').visible = false;
  self.el.getObject3D('gridYZ').visible = false;
  if(cam === 'main') {
    self.el.getObject3D('grid').visible = self.data.enableGrid;
  } else if(cam === 'camXZ') {
    self.el.getObject3D('gridXZ').visible = self.data.enableGrid;
  } else if(cam === 'camXY') {
    self.el.getObject3D('gridXY').visible = self.data.enableGrid;
  } else if(cam === 'camYZ') {
    self.el.getObject3D('gridYZ').visible = self.data.enableGrid;
  }
}

function toggleDenomLabelsInternal(self) { //positions denominator labels (the numbers) properly given graph changes
  labelMatrix = self.numberLabels;
  let cam = self.data.activeCamera;
  let enabled = self.data.enableDenomLabels;
  if(cam === 'main') {
    for(let i = 0; i < labelMatrix.length; i++) {
      for(let j = 0; j < labelMatrix[i].length; j++) {
        labelMatrix[i][j].object3D.visible = enabled;
      }
    }
  } else {
    for(let i = 0; i < labelMatrix.length; i++) {
      for(let j = 0; j < labelMatrix[i].length; j++) {
        labelMatrix[i][j].object3D.visible = false;
      }
    }
  }
  if(cam === 'camXZ') {
    for(let i = 0; i < self.numberLabelsXZ.length; i++) {
      for(let j = 0; j < self.numberLabelsXZ[i].length; j++) {
        self.numberLabelsXZ[i][j].object3D.visible = enabled;
      }
    }
  } else {
    for(let i = 0; i < self.numberLabelsXZ.length; i++) {
      for(let j = 0; j < self.numberLabelsXZ[i].length; j++) {
        self.numberLabelsXZ[i][j].object3D.visible = false;
      }
    }
  }
  if(cam === 'camXY') {
    for(let i = 0; i < self.numberLabelsXY.length; i++) {
      for(let j = 0; j < self.numberLabelsXY[i].length; j++) {
        self.numberLabelsXY[i][j].object3D.visible = enabled;
      }
    }
  } else {
    for(let i = 0; i < self.numberLabelsXY.length; i++) {
      for(let j = 0; j < self.numberLabelsXY[i].length; j++) {
        self.numberLabelsXY[i][j].object3D.visible = false;
      }
    }
  }
  if(cam === 'camYZ') {
    for(let i = 0; i < self.numberLabelsYZ.length; i++) {
      for(let j = 0; j < self.numberLabelsYZ[i].length; j++) {
        self.numberLabelsYZ[i][j].object3D.visible = enabled;
      }
    }
  } else {
    for(let i = 0; i < self.numberLabelsYZ.length; i++) {
      for(let j = 0; j < self.numberLabelsYZ[i].length; j++) {
        self.numberLabelsYZ[i][j].object3D.visible = false;
      }
    }
  }
}

function updateGradientInternal(self) { //updates the color scheme of the plot.
  let xG1 = hexToRGB(self.data.xGradient[0]);
  let xG2 = hexToRGB(self.data.xGradient[1]);
  let yG1 = hexToRGB(self.data.yGradient[0]);
  let yG2 = hexToRGB(self.data.yGradient[1]);
  let zG1 = hexToRGB(self.data.zGradient[0]);
  let zG2 = hexToRGB(self.data.zGradient[1]);
  let geometry = self.cc.geometry;
  let scale = self.data.scale;

  for(let i = 0, j = 0; i < geometry.attributes.color.count; i++, j+=3) {
    //find scale of particle relitive to plot for linear gradient managment...
    let xs = self.vertices[i].x/scale[0];
    let ys = self.vertices[i].y/scale[1];
    let zs = self.vertices[i].z/scale[2];

    let totalR = Math.ceil((xG2[0]-xG1[0])*xs) + xG1[0] + //calculate gradient colors Red
      Math.ceil((yG2[0]-yG1[0])*ys) + yG1[0] +
      Math.ceil((zG2[0]-zG1[0])*zs) + zG1[0]
    if(totalR > 255) {
      totalR = 255;
    }
    let totalG = Math.ceil((xG2[1]-xG1[1])*xs) + xG1[1] + //calculate gradient colors Greed
      Math.ceil((yG2[1]-yG1[1])*ys) + yG1[1] +
      Math.ceil((zG2[1]-zG1[1])*zs) + zG1[1]
    if(totalR > 255) {
      totalR = 255;
    }
    let totalB = Math.ceil((xG2[2]-xG1[2])*xs) + xG1[2] + //calculate gradient colors Blue
      Math.ceil((yG2[2]-yG1[2])*ys) + yG1[2] +
      Math.ceil((zG2[2]-zG1[2])*zs) + zG1[2]
    if(totalR > 255) {
      totalR = 255;
    }

    let color = new THREE.Color("rgb(" + totalR + ", "
    + totalG + ", "
    + totalB + ")");

    geometry.attributes.color.array[j] = color.r;
    geometry.attributes.color.array[j+1] = color.g;
    geometry.attributes.color.array[j+2] = color.b;
  }
  geometry.attributes.color.needsUpdate = true;
}

function handleLerp(self, oldCam) { //handles main lerp system and calls other lerp functions
  let cam = self.data.activeCamera;
  if(self.data.enableCamera) {
    document.getElementById("#rig").setAttribute('look-controls', 'enabled: false'); //lock user camera rotation (needed so we can move camera ourselves)
    if(oldCam === 'main' || oldCam === undefined) {
      let rigP = document.getElementById("#rig").getAttribute('position');
      let rigR = document.getElementById("#rig").getAttribute('rotation')
      self.freePos = {x: rigP.x, y: rigP.y, z: rigP.z};
      self.freeRot = {x: rigR.x, y: rigR.y, z: rigR.z};
    }
  } else {
    self.lerpCount = 0;
  }
  self.oldCam = oldCam;
  //handle label defaulting & snap attributes
  self.labelx.setAttribute('align', 'center');
  self.labely.setAttribute('align', 'center');
  self.labelz.setAttribute('align', 'center');
  if(self.data.enableDenomLabels) {
    if(cam === 'camXZ') {
      self.labelx.setAttribute('align', 'left');
    } else if(cam === 'camXY') {
      self.labelx.setAttribute('align', 'left');
    } else if(cam === 'camYZ') {
      self.labelz.setAttribute('align', 'left');
    }
  }
  //handle graph animations
  self.el.getObject3D('grid').visible = self.data.enableGrid;
  self.el.getObject3D('gridXZ').visible = false;
  self.el.getObject3D('gridXY').visible = false;
  self.el.getObject3D('gridYZ').visible = false;
  /////////////CALCULATE FUTURE COLOR SCHEME!//////////////// (((((We pre-calculate the scheme so that less computation is required through each loop)))))
  let xG1 = hexToRGB(self.data.xGradient[0]);
  let xG2 = hexToRGB(self.data.xGradient[1]);
  let yG1 = hexToRGB(self.data.yGradient[0]);
  let yG2 = hexToRGB(self.data.yGradient[1]);
  let zG1 = hexToRGB(self.data.zGradient[0]);
  let zG2 = hexToRGB(self.data.zGradient[1]);
  let geometry = self.cc.geometry;
  let scale = self.data.scale;
  self.lerpColors = []; //variable to hold the colors we are lerping to.....

  for(let i = 0; i < geometry.attributes.color.count; i++) {
    //find scale of particle relitive to plot for linear gradient managment...
    let xs = self.vertices[i].x/scale[0];
    let ys = self.vertices[i].y/scale[1];
    let zs = self.vertices[i].z/scale[2];

    //adjust on what future vals will be.....
    if(cam === 'camXZ') {
      ys = 0;
    } else if(cam === 'camXY') {
      zs = 0;
    } else if(cam === 'camYZ') {
      xs = 0;
    }

    let totalR = Math.ceil((xG2[0]-xG1[0])*xs) + xG1[0] + //calculate gradient colors Red
      Math.ceil((yG2[0]-yG1[0])*ys) + yG1[0] +
      Math.ceil((zG2[0]-zG1[0])*zs) + zG1[0]
    if(totalR > 255) {
      totalR = 255;
    }
    let totalG = Math.ceil((xG2[1]-xG1[1])*xs) + xG1[1] + //calculate gradient colors Greed
      Math.ceil((yG2[1]-yG1[1])*ys) + yG1[1] +
      Math.ceil((zG2[1]-zG1[1])*zs) + zG1[1]
    if(totalR > 255) {
      totalR = 255;
    }
    let totalB = Math.ceil((xG2[2]-xG1[2])*xs) + xG1[2] + //calculate gradient colors Blue
      Math.ceil((yG2[2]-yG1[2])*ys) + yG1[2] +
      Math.ceil((zG2[2]-zG1[2])*zs) + zG1[2]
    if(totalR > 255) {
      totalR = 255;
    }
    self.lerpColors.push({r: totalR/255, g: totalG/255, b: totalB/255});
  }

  ///////////END OF COLOR SCHEME GERNATOR//////////////
  self.lerping = true;
}

/////////ANIMATION/RENDER FUNCTIONS!!//////////

function lerpCamera(self) { //moves camera & acts as main lerp loop for other lerp functions
  if(self.data.enableCamera) { //handle camera position if enableCamera
    let data = self.data;
    let scale = self.data.scale;
    let plotPosition = self.el.getAttribute('position');
    let a = document.getElementById("#rig").getAttribute('position'); //source point
    let b; //destination point
    let ar = document.getElementById("#rig").getAttribute('rotation'); //source rotation
    let br; //destination rotation
    //set distination point & rotation
    if(data.activeCamera === "main") {
      b = self.freePos;
      br = self.freeRot;
    } else if(data.activeCamera === "camXY") {
      b = {x: plotPosition.x+scale[0]/2, y: plotPosition.y+scale[1]/2, z: plotPosition.z+scale[2]/1.1};
      br = {x: 0, y: 0, z: 0};
    } else if(data.activeCamera === "camXZ") {
      b = {x: plotPosition.x+scale[0]/2, y: plotPosition.y-scale[1]/1.1, z: plotPosition.z+scale[2]/2};
      br = {x: 90, y: 0, z: 0};
    } else if(data.activeCamera === "camYZ") {
      b = {x: plotPosition.x-scale[0]/1.1, y: plotPosition.y+scale[1]/2, z: plotPosition.z+scale[2]/2};
      br = {x: 0, y: -90, z: 0};
    }
    let pM = lerp(a,b,self.data.animationSpeed); //set position movement Vector
    let rM = lerp(ar,br,self.data.animationSpeed); //set rotation movement Vector;
    document.getElementById("#rig").setAttribute('position', (pM[0]) + ' ' + (pM[1]) + ' ' + (pM[2]));
    document.getElementById("#rig").setAttribute('rotation', (rM[0]) + ' ' + (+rM[1]) + ' ' + (rM[2]));
    //call other interpolates....
    flattenParticles(self);
    lerpUX(self);
    //handle lerp exit condition
    if(Math.sqrt(Math.pow(a.x-b.x,2) + Math.pow(a.y-b.y,2) + Math.pow(a.z-b.z,2)) < 0.01) {
      self.lerping = false;
      if(data.activeCamera === 'main') {
        document.getElementById("#rig").setAttribute('look-controls', 'enabled: true');
      }
      toggleGridInternal(self);
    }
  } else { //handles all animations except camera if enableCamera !== true
    //call other interpolates....
    flattenParticles(self);
    lerpUX(self);
    //handle lerp exit condition...
    if(self.lerpCount > 60) {
      self.lerping = false;
      if(self.data.activeCamera === 'main') {
        document.getElementById("#rig").setAttribute('look-controls', 'enabled: true');
      }
      toggleGridInternal(self);
    }
    self.lerpCount++;
  }
}

function animate(self, time, timeDelta) { //handles idle animations (currently disabled, kept in lib for example of how to interact with particles)
  //this function can be used to update/animate the particle system
  let geometry = self.cc.geometry;
  geometry.vertices.forEach(function(v){
    v.y += ( Math.sin( (v.x/2+self.step) * Math.PI*2 )/1400);
  });

  geometry.verticesNeedUpdate = true;
  self.step += (1/4)*(timeDelta/1000);
  ///////END OF ANIMATION///////
}

function raycast(self) { //raycasts onto the graph to allow for user analysis. These results are calledback in what should be the user-defined function plotRaycaster
  //check raycast
  let camera = document.querySelector("[camera]").getObject3D('camera')
  self.raycaster.setFromCamera(popPlotMouse,camera);
  let geometry = self.cc.geometry;

    let intersected = self.raycaster.intersectObject(self.cc);
    if(intersected.length>0) {
      //handle selection for raycastng de-selection calls
      if(self.unselected === true) {
        self.unselected = false;
      }
      //handle basic variables for raycast selection algorithm
      let index = 0;
      let closest = 10000000000;
      //make sure the raycast is best match
      for(let i = 0; i < intersected.length; i++) {
        if(intersected[i].distanceToRay<closest) {
          closest = intersected[i].distanceToRay;
          index = intersected[i].index;
        }
      }
      //check if it is different than old match and act accordingly
      if(self.oldIndex === -1) {
        self.oldIndex = index;
        self.oldColor = [geometry.attributes.color.array[index*3],geometry.attributes.color.array[index*3+1],geometry.attributes.color.array[index*3+2]];
        let nC = new THREE.Color("rgb(" + (255-Math.round(self.oldColor[0]*255)) + ", " + (255-Math.round(self.oldColor[1]*255)) + ", " + (255-Math.round(self.oldColor[2]*255)) +")");
        geometry.attributes.color.array[index*3] = nC.r;
        geometry.attributes.color.array[index*3+1] = nC.g;
        geometry.attributes.color.array[index*3+2] = nC.b;
        geometry.attributes.color.needsUpdate = true;

        if(typeof plotRaycaster !== 'undefined') {
          let data = self.dataset;
          plotRaycaster({x: data[index][self.data.jsonLayout[0]],y:data[index][self.data.jsonLayout[1]],z:data[index][self.data.jsonLayout[2]]},
            {xl:self.data.labels[0],yl:self.data.labels[1],zl:self.data.labels[2]}, index);
        }
      } else if(self.oldIndex != index) {
        geometry.attributes.color.array[self.oldIndex*3] = self.oldColor[0];
        geometry.attributes.color.array[self.oldIndex*3+1] = self.oldColor[1];
        geometry.attributes.color.array[self.oldIndex*3+2] = self.oldColor[2];
        self.oldIndex = index;
        self.oldColor = [geometry.attributes.color.array[index*3],geometry.attributes.color.array[index*3+1],geometry.attributes.color.array[index*3+2]];
        let nC = new THREE.Color("rgb(" + (255-Math.round(self.oldColor[0]*255)) + ", " + (255-Math.round(self.oldColor[1]*255)) + ", " + (255-Math.round(self.oldColor[2]*255)) +")");
        geometry.attributes.color.array[index*3] = nC.r;
        geometry.attributes.color.array[index*3+1] = nC.g;
        geometry.attributes.color.array[index*3+2] = nC.b;
        geometry.attributes.color.needsUpdate = true;

        if(typeof plotRaycaster !== 'undefined') {
          let data = self.dataset;
          plotRaycaster({x: data[index][self.data.jsonLayout[0]],y:data[index][self.data.jsonLayout[1]],z:data[index][self.data.jsonLayout[2]]},
            {x:self.data.labels[0],y:self.data.labels[1],z:self.data.labels[2]}, index);
        }
      } else {

      }
    } else if(self.oldIndex !== -1) { //update raycaster function if nothing is selected
      //update function
      if(self.unselected === undefined || self.unselected === false) { //this just makes sure we don't do this opperation unnessesarily often.
        //update node color
        geometry.attributes.color.array[self.oldIndex*3] = self.oldColor[0];
        geometry.attributes.color.array[self.oldIndex*3+1] = self.oldColor[1];
        geometry.attributes.color.array[self.oldIndex*3+2] = self.oldColor[2];
        self.oldIndex = -1;
        self.oldColor = undefined;
        geometry.attributes.color.needsUpdate = true;
        if(typeof plotRaycaster !== 'undefined') {
          plotRaycaster({x:undefined,y:undefined,z:undefined},{xl:undefined,yl:undefined,zl:undefined}, undefined);
          self.unselected = true;
        }
      }
    }
}

function flattenParticles(self) { //falls particles back to 2d configuration based on selected camera
  let cam = self.data.activeCamera;
  let geometry = self.cc.geometry;
  if(cam === 'main') {
    for(let i = 0, j = 0; i < geometry.attributes.position.count; i++, j+=3) {
      let vertices = geometry.attributes.position;
      let lVec = lerp({x: vertices.array[j], y: vertices.array[j+1], z: vertices.array[j+2]}, self.vertices[i], self.data.animationSpeed);
      vertices.array[j] = lVec[0];
      vertices.array[j+1] = lVec[1];
      vertices.array[j+2] = lVec[2];
      //lerp the colors
      let colors = geometry.attributes.color;
      let cLerp = lerpC({r: colors.array[j], g: colors.array[j+1], b: colors.array[j+2]}, self.lerpColors[i], self.data.animationSpeed);
      colors.array[j] = cLerp[0];
      colors.array[j+1] = cLerp[1];
      colors.array[j+2] = cLerp[2];
    }
  } else if(cam === 'camXY') {
    for(let i = 0, j = 0; i < geometry.attributes.position.count; i++, j+=3) {
      let vertices = geometry.attributes.position;
      let lVec = lerp({x: vertices.array[j], y: vertices.array[j+1], z: vertices.array[j+2]}, {x: self.vertices[i].x, y: self.vertices[i].y, z: 0}, self.data.animationSpeed);
      vertices.array[j] = lVec[0];
      vertices.array[j+1] = lVec[1];
      vertices.array[j+2] = lVec[2];
      //lerp the colors
      let colors = geometry.attributes.color;
      let cLerp = lerpC({r: colors.array[j], g: colors.array[j+1], b: colors.array[j+2]}, self.lerpColors[i], self.data.animationSpeed);
      colors.array[j] = cLerp[0];
      colors.array[j+1] = cLerp[1];
      colors.array[j+2] = cLerp[2];
    }
  } else if(cam === 'camXZ') {
    for(let i = 0, j = 0; i < geometry.attributes.position.count; i++, j+=3) {
      let vertices = geometry.attributes.position;
      let lVec = lerp({x: vertices.array[j], y: vertices.array[j+1], z: vertices.array[j+2]}, {x: self.vertices[i].x, y: 0, z: self.vertices[i].z}, self.data.animationSpeed);
      vertices.array[j] = lVec[0];
      vertices.array[j+1] = lVec[1];
      vertices.array[j+2] = lVec[2];
      //lerp the colors
      let colors = geometry.attributes.color;
      let cLerp = lerpC({r: colors.array[j], g: colors.array[j+1], b: colors.array[j+2]}, self.lerpColors[i], self.data.animationSpeed);
      colors.array[j] = cLerp[0];
      colors.array[j+1] = cLerp[1];
      colors.array[j+2] = cLerp[2];
    }
  } else if(cam === 'camYZ') {
    for(let i = 0, j = 0; i < geometry.attributes.position.count; i++, j+=3) {
      let vertices = geometry.attributes.position;
      let lVec = lerp({x: vertices.array[j], y: vertices.array[j+1], z: vertices.array[j+2]}, {x: 0, y: self.vertices[i].y, z: self.vertices[i].z}, self.data.animationSpeed);
      vertices.array[j] = lVec[0];
      vertices.array[j+1] = lVec[1];
      vertices.array[j+2] = lVec[2];
      //lerp the colors
      let colors = geometry.attributes.color;
      let cLerp = lerpC({r: colors.array[j], g: colors.array[j+1], b: colors.array[j+2]}, self.lerpColors[i], self.data.animationSpeed);
      colors.array[j] = cLerp[0];
      colors.array[j+1] = cLerp[1];
      colors.array[j+2] = cLerp[2];
    }
  }

  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.color.needsUpdate = true;
}

function lerpUX(self) { //interpolates the text and grid itself  (this function is basically hard coded animation for UI, but it looks cool)
  let cam = self.data.activeCamera;
  let a = self.el.getObject3D('axis').scale;
  let mx = self.labelx.getAttribute("position");
  let my = self.labely.getAttribute("position");
  let mz = self.labelz.getAttribute("position");
  let rx = self.labelx.getAttribute("rotation");
  let ry = self.labely.getAttribute("rotation");
  let rz = self.labelz.getAttribute("rotation");
  if(cam === 'main') { //HANDLE MAIN VIEW
    let lerpS = lerp(a, {x:1,y:1,z:1}, self.data.animationSpeed);
    a.x = lerpS[0];
    a.y = lerpS[1];
    a.z = lerpS[2];
    //interpolate the denominators...
    a = self.el.getObject3D('denominators').scale;
    lerpS = lerp(a,{x:1,y:1,z:1}, self.data.animationSpeed);
    a.x = lerpS[0];
    a.y = lerpS[1];
    a.z = lerpS[2];
    //handle labels...
    if(self.data.enableDenomLabels === false) {
      rx = {x:-90,y:180,z:0};
      rz = {x:-90,y: -90,z:0};
      ry = {x:0,y:135,z:-90};
      mx = {x: (self.data.scale[0]/2), y: 0, z: (-.15*self.data.scale[2]+0)};
      my = {x: (-.15*self.data.scale[0]+0), y: (self.data.scale[1]/2+0), z: (0-.15*self.data.scale[2])};
      mz = {x: (-.15*self.data.scale[0]+0), y: 0, z: (self.data.scale[2]/2+0)}
    } else {
      mx = {x: parseFloat(self.data.scale[0])+self.data.scale[0]/10, y: 0, z: 0};
      rx = {x: -90, y: -90, z: 0};
      mz = {x: 0,y: 0, z:(parseFloat(self.data.scale[2])+self.data.scale[2]/10)};
      rz = {x: -90, y: 0, z: 0};
      my = {x: 0, y: (parseFloat(self.data.scale[1])+self.data.scale[1]/10), z: 0};
      ry = {x: 0, y: -45, z: 0};
    }
    //handle grid
    a = self.el.getObject3D('grid').scale;
    lerpS = lerp(a, {x:1,y:1,z:1}, self.data.animationSpeed);
    a.x = lerpS[0];
    a.y = lerpS[1];
    a.z = lerpS[2];
  } else if(cam === 'camXZ') { //HANDLE XZ VIEW
    let lerpS = lerp(a, {x:1,y:0.0001,z:1}, self.data.animationSpeed);
    a.x = lerpS[0];
    a.y = lerpS[1];
    a.z = lerpS[2];
    //interpolate the denominators...
    a = self.el.getObject3D('denominatorsXZ').scale;
    lerpS = lerp(a,{x:1,y:1,z:1}, self.data.animationSpeed);
    a.x = lerpS[0];
    a.y = lerpS[1];
    a.z = lerpS[2];
    //handle labels
    if(self.data.enableDenomLabels === false) {
      rx = {x:90,y:0,z:0};
      rz = {x:90,y:0,z:90};
      mx = {x: self.data.scale[0]/2, y: 0, z: -.15*self.data.scale[2]};
      mz = {x: -.15*self.data.scale[0], y: 0, z: self.data.scale[2]/2};
    } else {
      rx = {x:90,y:0,z:0};
      rz = {x:90,y:0,z:0};
      mx = {x: self.data.scale[0]/10+parseFloat(self.data.scale[0]), y: 0, z: 0};
      mz = {x: 0, y: 0, z: self.data.scale[2]/10+parseFloat(self.data.scale[2])};
    }
    self.labely.object3D.visible = false;
    //handle grid
    a = self.el.getObject3D('grid').scale;
    lerpS = lerp(a, {x:1,y:0.0001,z:1}, self.data.animationSpeed);
    a.x = lerpS[0];
    a.y = lerpS[1];
    a.z = lerpS[2];
  } else if(cam === 'camXY') { //HANDLE XY VIEW
    let lerpS = lerp(a, {x:1,y:1,z:0.0001}, self.data.animationSpeed);
    a.x = lerpS[0];
    a.y = lerpS[1];
    a.z = lerpS[2];
    //interpolate the denominators...
    a = self.el.getObject3D('denominatorsXY').scale;
    lerpS = lerp(a,{x:1,y:1,z:1}, self.data.animationSpeed);
    a.x = lerpS[0];
    a.y = lerpS[1];
    a.z = lerpS[2];
    //handle labels
    if(self.data.enableDenomLabels === false) {
      rx = {x:0,y:0,z:0};
      ry = {x:0,y:0,z:90};
      mx = {x:self.data.scale[0]/2, y:-.15*self.data.scale[1],z:0};
      my = {x:-.15*self.data.scale[0], y:self.data.scale[1]/2,z:0};
    } else {
      rx = {x:0,y:0,z:0};
      ry = {x:0,y:0,z:0};
      mx = {x:self.data.scale[0]/10+parseFloat(self.data.scale[0]), y:0,z:0};
      my = {x:0, y:self.data.scale[1]/10+parseFloat(self.data.scale[1]),z:0};
    }
    self.labelz.object3D.visible = false;
    //handle grid
    a = self.el.getObject3D('grid').scale;
    lerpS = lerp(a, {x:1,y:1,z:0.0001}, self.data.animationSpeed);
    a.x = lerpS[0];
    a.y = lerpS[1];
    a.z = lerpS[2];
  } else if(cam === 'camYZ') { //HANDLE YZ VIEW
    let lerpS = lerp(a, {x:0.0001,y:1,z:1}, self.data.animationSpeed);
    a.x = lerpS[0];
    a.y = lerpS[1];
    a.z = lerpS[2];
    //interpolate the denominators...
    a = self.el.getObject3D('denominatorsYZ').scale;
    lerpS = lerp(a,{x:1,y:1,z:1}, self.data.animationSpeed);
    a.x = lerpS[0];
    a.y = lerpS[1];
    a.z = lerpS[2];
    //handle labels rotation
    if(self.data.enableDenomLabels === false) {
      rz = {x:0,y:-90,z:0};
      ry = {x:0,y:-90,z:90};
      mz = {x:0, y:-.15*self.data.scale[1],z:self.data.scale[2]/2};
      my = {x:0, y:self.data.scale[1]/2,z:-.15*self.data.scale[2]};
    } else {
      rz = {x:0,y:-90,z:0};
      ry = {x:0,y:-90,z:0};
      mz = {x:0, y:0, z:self.data.scale[2]/10+parseFloat(self.data.scale[2])};
      my = {x:0, y:self.data.scale[1]/10+parseFloat(self.data.scale[1]), z:0};
    }
    self.labelx.object3D.visible = false; //hide unused label
    //handle grid
    a = self.el.getObject3D('grid').scale;
    lerpS = lerp(a, {x:0.0001,y:1,z:1}, self.data.animationSpeed);
    a.x = lerpS[0];
    a.y = lerpS[1];
    a.z = lerpS[2];
  }
  //handle label position
  a = self.labelx.getAttribute('position');
  let lerpP = lerp(a, mx, self.data.animationSpeed);
  self.labelx.setAttribute('position', lerpP[0] + ' ' + lerpP[1] + ' ' + lerpP[2]);
  a = self.labely.getAttribute('position');
  lerpP = lerp(a, my, self.data.animationSpeed);
  self.labely.setAttribute('position', lerpP[0] + ' ' + lerpP[1] + ' ' + lerpP[2]);
  a = self.labelz.getAttribute('position');
  lerpP = lerp(a, mz, self.data.animationSpeed);
  self.labelz.setAttribute('position', lerpP[0] + ' ' + lerpP[1] + ' ' + lerpP[2]);

  //handle labels rotation...
  a = self.labelx.getAttribute('rotation');
  let lerpS = lerp(a, rx, self.data.animationSpeed);
  self.labelx.setAttribute('rotation', lerpS[0] + ' ' + lerpS[1] + ' ' + lerpS[2]);
  a = self.labely.getAttribute('rotation');
  lerpS = lerp(a, ry, self.data.animationSpeed);
  self.labely.setAttribute('rotation', lerpS[0] + ' ' + lerpS[1] + ' ' + lerpS[2]);
  a = self.labelz.getAttribute('rotation');
  lerpS = lerp(a, rz, self.data.animationSpeed);
  self.labelz.setAttribute('rotation', lerpS[0] + ' ' + lerpS[1] + ' ' + lerpS[2]);

  //shrink old denominator/handle label movement (basically a reset to baseline)...
  if(self.oldCam === undefined && cam !== 'main') {
    a = self.el.getObject3D('denominators').scale;
  } else if(self.oldCam === 'main') {
    a = self.el.getObject3D('denominators').scale;
  } else if(self.oldCam === 'camXY') {
    a = self.el.getObject3D('denominatorsXY').scale;
    if(self.data.enableLabels === true) {
        self.labelz.object3D.visible = true;
    }
  } else if(self.oldCam === 'camXZ') {
    a = self.el.getObject3D('denominatorsXZ').scale;
    if(self.data.enableLabels === true) {
      self.labely.object3D.visible = true;
    }
  } else if(self.oldCam === 'camYZ') {
    a = self.el.getObject3D('denominatorsYZ').scale;
    if(self.data.enableLabels === true) {
        self.labelx.object3D.visible = true;
    }
  }
  lerpS = lerp(a,{x:0,y:0,z:0}, self.data.animationSpeed);
  a.x = lerpS[0];
  a.y = lerpS[1];
  a.z = lerpS[2];
}

//Helper Functions

function hexToRGB(hexStr) { //converts hex to RGB
  return [parseInt(hexStr.substr(1,2), 16), parseInt(hexStr.substr(3,2), 16), parseInt(hexStr.substr(5,2), 16)];
}

function onMouseMovePlot(event) { //function to update mouse vector position for raycasting into graph
				event.preventDefault();
				popPlotMouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
				popPlotMouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}

function lerp(a, b, n) { //lerp for vector objects
  return [(1 - n) * a.x + n * b.x, (1 - n) * a.y + n * b.y, (1 - n) * a.z + n * b.z];
}

function lerpC(a, b, n) { //lerp for color objects
  return [(1 - n) * a.r + n * b.r, (1 - n) * a.g + n * b.g, (1 - n) * a.b + n * b.b];
}

window.addEventListener( 'mousemove', onMouseMovePlot, false );
