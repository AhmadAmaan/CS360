////////////////////////////////////////////////////////////////////////
// Assignment 1: 2D Scene Graph with Animation
//

var gl;
var animation;
var color;
var matrixStack = [];
// mMatrix is called the model matrix, transforms objects
// from local object space to world space.
var mMatrix = mat4.create();
var uMMatrixLocation;

var circleBuf;
var circleIndexBuf;
const resolution = 60; // Number of segments for the circle

var sqVertexPositionBuffer;
var sqVertexIndexBuffer;

var aPositionLocation;
var uColorLoc;

var sunAngle = 0; // Initial angle for the sun's rotation
var bladeAngle = 0; // Initial angle for the windmill blades' rotation
var boatDisp = 0; // Initial dispalcement of the boat
var boatSpeed = 0.003; // Speed of Boat
var mode; // Takes the input for  the mode of drawing

const vertexShaderCode = `#version 300 es
in vec2 aPosition;
uniform mat4 uMMatrix;

void main() {
  gl_Position = uMMatrix*vec4(aPosition,0.0,1.0);
  gl_PointSize = 3.0;
}`;

const fragShaderCode = `#version 300 es
precision mediump float;
out vec4 fragColor;

uniform vec4 color;

void main() {
  fragColor = color;
}`;

function pushMatrix(stack, m) {
  //necessary because javascript only does shallow push
  var copy = mat4.create(m);
  stack.push(copy);
}

function popMatrix(stack) {
  if (stack.length > 0) return stack.pop();
  else console.log("stack has no matrix to pop!");
}

function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

function vertexShaderSetup(vertexShaderCode) {
  shader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(shader, vertexShaderCode);
  gl.compileShader(shader);
  // Error check whether the shader is compiled correctly
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function fragmentShaderSetup(fragShaderCode) {
  shader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(shader, fragShaderCode);
  gl.compileShader(shader);
  // Error check whether the shader is compiled correctly
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function initShaders() {
  shaderProgram = gl.createProgram();

  var vertexShader = vertexShaderSetup(vertexShaderCode);
  var fragmentShader = fragmentShaderSetup(fragShaderCode);

  // attach the shaders
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  //link the shader program
  gl.linkProgram(shaderProgram);

  // check for compilation and linking status
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.log(gl.getShaderInfoLog(vertexShader));
    console.log(gl.getShaderInfoLog(fragmentShader));
  }

  //finally use the program.
  gl.useProgram(shaderProgram);

  return shaderProgram;
}

function initGL(canvas) {
  try {
    gl = canvas.getContext("webgl2"); // the graphics webgl2 context
    gl.viewportWidth = canvas.width; // the width of the canvas
    gl.viewportHeight = canvas.height; // the height
  } catch (e) {}
  if (!gl) {
    alert("WebGL initialization failed");
  }
}

function initSquareBuffer() {
  // buffer for point locations
  const sqVertices = new Float32Array([
    0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
  ]);
  sqVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, sqVertices, gl.STATIC_DRAW);
  sqVertexPositionBuffer.itemSize = 2;
  sqVertexPositionBuffer.numItems = 4;

  // buffer for point indices
  const sqIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);
  sqVertexIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sqIndices, gl.STATIC_DRAW);
  sqVertexIndexBuffer.itemsize = 1;
  sqVertexIndexBuffer.numItems = 6;
}

function drawSquare(color, mMatrix) {
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

  // buffer for point locations
  gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
  gl.vertexAttribPointer(
    aPositionLocation,
    sqVertexPositionBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // buffer for point indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);

  gl.uniform4fv(uColorLoc, color);
  
  // now draw the square
  gl.drawElements(
    mode,
    sqVertexIndexBuffer.numItems,
    gl.UNSIGNED_SHORT,
    0
  );
}

function initTriangleBuffer() {
  // buffer for point locations
  const triangleVertices = new Float32Array([0.0, 0.5, -0.5, -0.5, 0.5, -0.5]);
  triangleBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuf);
  gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);
  triangleBuf.itemSize = 2;
  triangleBuf.numItems = 3;

  // buffer for point indices
  const triangleIndices = new Uint16Array([0, 1, 2]);
  triangleIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangleIndices, gl.STATIC_DRAW);
  triangleIndexBuf.itemsize = 1;
  triangleIndexBuf.numItems = 3;
}

function drawTriangle(color, mMatrix) {
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

  // buffer for point locations
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuf);
  gl.vertexAttribPointer(
    aPositionLocation,
    triangleBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // buffer for point indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuf);

  gl.uniform4fv(uColorLoc, color);

  // now draw the square
  gl.drawElements(
    mode,
    triangleIndexBuf.numItems,
    gl.UNSIGNED_SHORT,
    0
  );
}

function initCircleBuffer() {

  // Buffer for point locations
  const circleVertices = [0,0];
  for (let i = 0; i < resolution; i++) {
    const x = Math.cos((i * Math.PI * 2)/resolution);
    const y = Math.sin((i * Math.PI * 2)/resolution);
    circleVertices.push(x);
    circleVertices.push(y);
  }

  circleBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, circleBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circleVertices), gl.STATIC_DRAW);
  circleBuf.itemSize = 2;
  circleBuf.numItems = resolution+1;

  var circleIndices = [];
  for (let i = 1; i < resolution; i++) {
    circleIndices.push(0,i,i+1);
  }
  circleIndices.push(0,1,resolution);
  circleIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleIndexBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(circleIndices), gl.STATIC_DRAW);
  circleIndexBuf.itemsize = 1;
  circleIndexBuf.numItems = circleIndexBuf.length;
}

function drawCircle(color, mMatrix) {
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

  // Bind the vertex position buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, circleBuf);
  gl.vertexAttribPointer(
    aPositionLocation,
    circleBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleIndexBuf);

  gl.uniform4fv(uColorLoc, color);

  
  //Now draw Circle
  gl.drawElements(
    mode, 
    resolution*3,
    gl.UNSIGNED_SHORT, 
    0
    );
}

function drawSky() {
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, 0.5, 0]);
  mMatrix = mat4.scale(mMatrix, [2, 1.0, 1.0]);
  color = [0.5, 0.85,1.0, 1.0];
  drawSquare(color, mMatrix);
  mMatrix = popMatrix(matrixStack);
}

function drawSun() {
  //Centre of Sun
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.75, 0.82, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(sunAngle), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.1, 0.1, 1.0]);
  color = [1.0, 1.0, 0.0, 1.0];
  drawCircle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  //Rays of Sun
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.75, 0.82, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(sunAngle), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.007, 0.3, 1.0]);
  color = [1.0, 1.0, 0.0, 1.0];
  drawSquare(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.75, 0.82, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(45+sunAngle), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.007, 0.3, 1.0]);
  color = [1.0, 1.0, 0.0, 1.0];
  drawSquare(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.75, 0.82, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(90+sunAngle), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.007, 0.3, 1.0]);
  color = [1.0, 1.0, 0.0, 1.0];
  drawSquare(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.75, 0.82, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(135+sunAngle), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.007, 0.3, 1.0]);
  color = [1.0, 1.0, 0.0, 1.0];
  drawSquare(color, mMatrix);
  mMatrix = popMatrix(matrixStack);
}

function drawGround() {
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, -0.5, 0]);
  mMatrix = mat4.scale(mMatrix, [2.0, 1.0, 1.0]);
  color = [0.56, 0.94, 0.56, 1.0];
  drawSquare(color, mMatrix);
  mMatrix = popMatrix(matrixStack);
}

function drawClouds() {
  //cloud 1
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.82, 0.55, 0]);
  mMatrix = mat4.scale(mMatrix, [0.25, 0.11, 1.0]);
  color = [1.0, 1.0, 1.0, 1.0];
  drawCircle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);
  //cloud 2
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.5, 0.53, 0]);
  mMatrix = mat4.scale(mMatrix, [0.18, 0.09, 1.0]);
  color = [1.0, 1.0, 1.0, 1.0];
  drawCircle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);
  //cloud 3
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.3, 0.54, 0]);
  mMatrix = mat4.scale(mMatrix, [0.13, 0.06, 1.0]);
  color = [1.0, 1.0, 1.0, 1.0];
  drawCircle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);
}

function drawMountains() {
  //Mountain 1
  pushMatrix(matrixStack, mMatrix); 
  mMatrix = mat4.translate(mMatrix, [-0.7, 0.06, 0]);
  mMatrix = mat4.scale(mMatrix, [1.3, 0.35, 1.0]);
  color = [0.39, 0.26, 0.13, 1.0];
  drawTriangle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix); 
  mMatrix = mat4.translate(mMatrix, [-0.67, 0.06, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(10), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [1.3, 0.35, 1.0]);
  color = [0.65, 0.55, 0.39, 1.0];
  drawTriangle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);
  //Mountain 2
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.1, 0.06, 0]);
  mMatrix = mat4.scale(mMatrix, [1.8, 0.6, 1.0]);
  color = [0.39, 0.26, 0.13, 1.0];
  drawTriangle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.045, 0.06, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(10), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [1.8, 0.6, 1.0]);
  color = [0.65, 0.55, 0.39, 1.0];
  drawTriangle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);
  //Mountain 3
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.75, 0.06, 0]);
  mMatrix = mat4.scale(mMatrix, [1.0, 0.25, 1.0]);
  color = [0.65, 0.55, 0.39, 1.0];
  drawTriangle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);
}

function drawTree(){
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.45, 0.18, 0]);
  mMatrix = mat4.scale(mMatrix, [0.05, 0.4, 1.0]);
  color = [0.6, 0.4, 0.3, 1.0];
  drawSquare(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.45, 0.5, 0]);
  mMatrix = mat4.scale(mMatrix, [0.45, 0.3, 1.0]);
  color = [0.0, 0.55, 0.2, 1.0];
  drawTriangle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.45, 0.55, 0]);
  mMatrix = mat4.scale(mMatrix, [0.45, 0.3, 1.0]);
  color = [0.3, 0.7, 0.4, 1.0];
  drawTriangle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.45, 0.6, 0]);
  mMatrix = mat4.scale(mMatrix, [0.45, 0.3, 1.0]);
  color = [0.4, 0.85, 0.4, 1.0];
  drawTriangle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);
}

function drawTrees() {

  // Tree 1
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.36, 0, 0]);
  mMatrix = mat4.scale(mMatrix, [0.85, 0.85, 1.0]);
  drawTree();
  mMatrix = popMatrix(matrixStack);

  // Tree 2
  drawTree();

  // Tree 3
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.15, 0, 0]);
  mMatrix = mat4.scale(mMatrix, [0.75, 0.75, 1.0]);
  drawTree();
  mMatrix = popMatrix(matrixStack);
}

function drawBird() {
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.07, 0.68, 0]);
  mMatrix = mat4.scale(mMatrix, [0.015, 0.02, 1.0]);
  color = [0.0, 0.0, 0.0, 1.0];
  drawSquare(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.106, 0.70, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(10), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.1, 0.012, 1.0]);
  color = [0.0, 0.0, 0.0, 1.0];
  drawTriangle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.032, 0.70, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(-10), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.1, 0.012, 1.0]);
  color = [0.0, 0.0, 0.0, 1.0];
  drawTriangle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);
}

function drawBirds() {
  //Bird 1
  drawBird();

  //Bird 2
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.26, 0.28, 0]);
  mMatrix = mat4.scale(mMatrix, [0.7, 0.7, 1.0]);
  drawBird();
  mMatrix = popMatrix(matrixStack);

  //Bird 3
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.28, 0.38, 0]);
  mMatrix = mat4.scale(mMatrix, [0.7, 0.7, 1.0]);
  drawBird();
  mMatrix = popMatrix(matrixStack);

  //Bird 4
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.08, 0.5, 0]);
  mMatrix = mat4.scale(mMatrix, [0.5, 0.5, 1.0]);
  drawBird();
  mMatrix = popMatrix(matrixStack);

  //Bird 5
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.06, 0.63, 0]);
  mMatrix = mat4.scale(mMatrix, [0.4, 0.4, 1.0]);
  drawBird();
  mMatrix = popMatrix(matrixStack);

}

function drawRiver() {
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, -0.16, 0]);
  mMatrix = mat4.scale(mMatrix, [2.0, 0.25, 1.0]);
  color = [0.1, 0.35, 0.9, 1.0];
  drawSquare(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, -0.08, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(90), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.0035, 0.4, 1.0]);
  color = [1.0, 1.0, 1.0, 1.0];
  drawSquare(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.7, -0.25, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(90), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.0035, 0.4, 1.0]);
  color = [1.0, 1.0, 1.0, 1.0];
  drawSquare(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.7, -0.15, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(90), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.0035, 0.4, 1.0]);
  color = [1.0, 1.0, 1.0, 1.0];
  drawSquare(color, mMatrix);
  mMatrix = popMatrix(matrixStack);
}

function drawBoat() {
  //flagpole 
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0+boatDisp, -0.02, 0]);
  mMatrix = mat4.scale(mMatrix, [0.012, 0.3, 1.0]);
  color = [0.0, 0.0, 0.0, 1.0];
  drawSquare(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  //inclined rod
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.06+boatDisp, -0.02, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(155), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.005, 0.28, 1.0]);
  color = [0.0, 0.0, 0.0, 1.0];
  drawSquare(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  //flag
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.085+boatDisp, 0.0, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(270), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.23, 0.16, 1.0]);
  color = [0.9, 0.35, 0.25, 1.0];
  drawTriangle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  // boat body
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0+boatDisp, -0.17, 0]);
  mMatrix = mat4.scale(mMatrix, [0.2, 0.065, 1.0]);
  color = [0.8, 0.8, 0.8, 1.0];
  drawSquare(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.1+boatDisp, -0.17, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.1, 0.065, 1.0]);
  color = [0.8, 0.8, 0.8, 1.0];
  drawTriangle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.1+boatDisp, -0.17, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.1, 0.065, 1.0]);
  color = [0.8, 0.8, 0.8, 1.0];
  drawTriangle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);
}

function drawWindMill() {
  //Stand
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.6, -0.15, 0]);
  mMatrix = mat4.scale(mMatrix, [0.034, 0.5, 1]);
  color = [0.25, 0.25, 0.25, 1];
  drawSquare(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  //Blades
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.6, 0.1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(45+bladeAngle), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.07, 0.25, 1]);
  mMatrix = mat4.translate(mMatrix, [0.0, -0.5, 0]);
  color = [0.8, 0.8, 0.0, 1];
  drawTriangle(color, mMatrix);
  mMatrix = popMatrix(matrixStack); 

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.6, 0.1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(-45+bladeAngle), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.07, 0.25, 1]);
  mMatrix = mat4.translate(mMatrix, [0.0, -0.5, 0]);
  color = [0.8, 0.8, 0.0, 1];
  drawTriangle(color, mMatrix);
  mMatrix = popMatrix(matrixStack); 

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.6, 0.1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(135+bladeAngle), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.07, 0.25, 1]);
  mMatrix = mat4.translate(mMatrix, [0.0, -0.5, 0]);
  color = [0.8, 0.8, 0.0, 1];
  drawTriangle(color, mMatrix);
  mMatrix = popMatrix(matrixStack); 

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.6, 0.1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(-135+bladeAngle), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [0.07, 0.25, 1]);
  mMatrix = mat4.translate(mMatrix, [0.0, -0.5, 0]);
  color = [0.8, 0.8, 0.0, 1];
  drawTriangle(color, mMatrix);
  mMatrix = popMatrix(matrixStack); 

  //circle
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.6, 0.1, 0]);
  mMatrix = mat4.scale(mMatrix, [0.03, 0.03, 1]);
  color = [0.1, 0.1, 0.1, 1];
  drawCircle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);
}

function drawWindMills(){
  //Windmill 1  
  drawWindMill();

  //Windmill 2
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-1.1, 0.0, 0]);
  drawWindMill();
  mMatrix = popMatrix(matrixStack);

}

function drawGrass(){
  //Grass 1
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.95, -0.58, 0]);
  mMatrix = mat4.scale(mMatrix, [0.06, 0.05, 1.0]);
  color = [0.196, 0.8, 0.196, 1.0];
  drawCircle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.75, -0.58, 0]);
  mMatrix = mat4.scale(mMatrix, [0.04, 0.04, 1.0]);
  color = [0.1, 0.4, 0.1, 1.0];
  drawCircle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.85, -0.58, 0]);
  mMatrix = mat4.scale(mMatrix, [0.1, 0.06, 1.0]);
  color = [0.1, 0.6, 0.2, 1.0];
  drawCircle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  //Grass 2
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.31, -0.58, 0]);
  mMatrix = mat4.scale(mMatrix, [0.065, 0.065, 1.0]);
  color = [0.196, 0.8, 0.196, 1.0];
  drawCircle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.07, -0.58, 0]);
  mMatrix = mat4.scale(mMatrix, [0.05, 0.05, 1.0]);
  color = [0.1, 0.4, 0.1, 1.0];
  drawCircle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.2, -0.58, 0]);
  mMatrix = mat4.scale(mMatrix, [0.12, 0.08, 1.0]);
  color = [0.1, 0.6, 0.2, 1.0];
  drawCircle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  //Grass 3
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.31, -1.025, 0]);
  mMatrix = mat4.scale(mMatrix, [0.08, 0.065, 1.0]);
  color = [0.196, 0.8, 0.196, 1.0];
  drawCircle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.1, -1.02, 0]);
  mMatrix = mat4.scale(mMatrix, [0.05, 0.05, 1.0]);
  color = [0.1, 0.4, 0.1, 1.0];
  drawCircle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.1, -1.0, 0]);
  mMatrix = mat4.scale(mMatrix, [0.18, 0.09, 1.0]);
  color = [0.1, 0.6, 0.2, 1.0];
  drawCircle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  //Grass 4
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.85, -0.44, 0]);
  mMatrix = mat4.scale(mMatrix, [0.07, 0.055, 1.0]);
  color = [0.196, 0.8, 0.196, 1.0];
  drawCircle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [1.0, -0.44, 0]);
  mMatrix = mat4.scale(mMatrix, [0.12, 0.08, 1.0]);
  color = [0.1, 0.6, 0.2, 1.0];
  drawCircle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);
}

function drawHouse(){
    
  //roof
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.55, -0.3, 0]);
  mMatrix = mat4.scale(mMatrix, [0.3, 0.2, 1]);
  color = [0.9, 0.25, 0.0, 1];
  drawSquare(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.7, -0.3, 0]);
  mMatrix = mat4.scale(mMatrix, [0.3, 0.2, 1]);
  color = [0.9, 0.25, 0.0, 1];
  drawTriangle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.4, -0.3, 0]);
  mMatrix = mat4.scale(mMatrix, [0.3, 0.2, 1]);
  color = [0.9, 0.25, 0.0, 1];
  drawTriangle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  //wall
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.55, -0.52, 0]);
  mMatrix = mat4.scale(mMatrix, [0.45, 0.24, 1]);
  color = [1, 0.98, 0.9, 1];
  drawSquare(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  //window and door
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.68, -0.47, 0]);
  mMatrix = mat4.scale(mMatrix, [0.07, 0.07, 1]);
  color = [1.0, 0.85, 0.2, 1];
  drawSquare(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.42, -0.47, 0]);
  mMatrix = mat4.scale(mMatrix, [0.07, 0.07, 1]);
  color = [1.0, 0.85, 0.2, 1];
  drawSquare(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.55, -0.565, 0]);
  mMatrix = mat4.scale(mMatrix, [0.07, 0.15, 1]);
  color = [1.0, 0.85, 0.2, 1];
  drawSquare(color, mMatrix);
  mMatrix = popMatrix(matrixStack);
}

function drawCar(){

  //Upper part
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.5, -0.75, 0]);
  mMatrix = mat4.scale(mMatrix, [0.18, 0.15, 1]);
  color = [0.8, 0.4, 0, 1];
  drawSquare(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  color = [0.8, 0.4, 0, 1];
  mMatrix = mat4.translate(mMatrix, [-0.59, -0.75, 0]);
  mMatrix = mat4.scale(mMatrix, [0.18, 0.15, 1]);
  drawTriangle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.41, -0.75, 0]);
  mMatrix = mat4.scale(mMatrix, [0.18, 0.15, 1]);
  color = [0.8, 0.4, 0, 1];
  drawTriangle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  //wheels
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.4, -0.88, 0]);
  mMatrix = mat4.scale(mMatrix, [0.05, 0.05, 1]);
  color = [0, 0, 0, 1];
  drawCircle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.4, -0.88, 0]);
  mMatrix = mat4.scale(mMatrix, [0.04, 0.04, 1]);
  color = [0.6, 0.6, 0.6, 1];
  drawCircle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.63, -0.88, 0]);
  mMatrix = mat4.scale(mMatrix, [0.05, 0.05, 1]);
  color = [0, 0, 0, 1];
  drawCircle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.63, -0.88, 0]);
  mMatrix = mat4.scale(mMatrix, [0.04, 0.04, 1]);
  color = [0.6, 0.6, 0.6, 1];
  drawCircle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);


  //body
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.51, -0.81, 0]);
  mMatrix = mat4.scale(mMatrix, [0.4, 0.12, 1]);
  color = [0, 0.5, 0.9, 1];
  drawSquare(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.71, -0.81, 0]);
  mMatrix = mat4.scale(mMatrix, [0.1, 0.12, 1]);
  color = [0, 0.5, 0.9, 1];
  drawTriangle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.31, -0.81, 0]);
  mMatrix = mat4.scale(mMatrix, [0.1, 0.12, 1]);
  color = [0, 0.5, 0.9, 1];
  drawTriangle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);

}
function drawRoad(){
  mat4.identity(mMatrix);
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.75, -0.8, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(-80), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [1.6, 1.55, 1.0]);
  color = [0.4, 0.65, 0.3, 1.0];
  drawTriangle(color, mMatrix);
  mMatrix = popMatrix(matrixStack);
}


function drawScene(val) {
  //To decide the mode of drawing
  if(val == 0) mode=gl.POINTS;
  else if (val == 1) mode=gl.LINE_LOOP;
  else if(val==2) mode=gl.TRIANGLES;

  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

  // stop the current loop of animation
  if (animation) {
  window.cancelAnimationFrame(animation);
}

  var animate = function() {

  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  sunAngle+=0.5; //sun rotation
  bladeAngle-=1.2; //windmill rotation
  boatDisp += boatSpeed; //boat movement

  // If boat is out of screen
  if (boatDisp > 0.75 || boatDisp < -0.75) {
    boatSpeed *= -1; // Changing direction
  }

  drawSky();
  drawSun();
  drawMountains();
  drawGround();
  drawClouds();
  drawTrees();
  drawBirds();
  drawRoad();
  drawRiver();
  drawBoat();
  drawWindMills();
  drawGrass();
  drawHouse();
  drawCar();
  animation = window.requestAnimationFrame(animate);
  };
  animate();
}

// This is the entry point from the html
function webGLStart() {
  var canvas = document.getElementById("Assign1");
  initGL(canvas);
  shaderProgram = initShaders();

  //get locations of attributes declared in the vertex shader
  const aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");

  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");

  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);

  uColorLoc = gl.getUniformLocation(shaderProgram, "color");

  initSquareBuffer();
  initTriangleBuffer();
  initCircleBuffer();
  drawScene();
}
