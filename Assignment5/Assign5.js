////////////////////////////////////////////////////////////////////////
// Assignment 5

var canvas;

var aPositionLocation;
var uColorLoc;

var sqbuf;
var sqindexBuf;
var sqtexBuf;

var light= [0.0, 18.0, 3.0];
var mode = 4;  
var bounce_no = 1;
//////////////////////////////////////////////////////////////////////////

const vertexShaderCode = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition,0.0,1.0);
  gl_PointSize = 3.0;
}`;

const fragShaderCode = `#version 300 es
precision mediump float;

out vec4 fragColor;
uniform vec3 light;
uniform int mode;
uniform int bounce_no;

struct Ray {
    vec3 origin;
    vec3 direction;
};

struct Sphere {
  vec3 center;
  float radius;
  vec3 color;
};

// Defining spheres
Sphere spheres[4] = Sphere[4](
    Sphere(vec3(-3, 1.4, -0.8), 2.0, vec3(0.0, 1.0, 0.0)),  // Sphere 1
    Sphere(vec3(0.0, 1, -6.3), 3.5, vec3(1.0, 0.0, 0.0)),   // Sphere 2
    Sphere(vec3(3, 1.4, -0.8), 2.0, vec3(0.0, 0.0, 1.0)),      // Sphere 3
    Sphere(vec3(0, -32.2, 1), 30.0, vec3(0.6, 0.6, 0.6))    // Sphere 4
);
float shine[4] = float[4](25.0,6.0,50.0, 100.0);

// Calculating phong_lighting
vec3 Lighting(vec3 normal, vec3 viewDir, vec3 lightDir, vec3 objectColor, float shininess) {
    // executing phong shading
    vec3 ambient = 0.25 * objectColor;
    vec3 diffuse = 0.4 * objectColor * max(dot(normal, lightDir), 0.0);
    vec3 reflectDir = reflect(-lightDir, normal);
    vec3 specular =1.0* vec3(1.0, 1.0, 1.0) * pow(max(dot(viewDir, reflectDir), 0.0), shininess);
    if(shininess==100.0)
    {
      return ambient + diffuse ;
    }
    return ambient + diffuse + specular;
}

// // calculating reflection
// vec3 reflection(vec3 lightDir, vec3 normal) {
//     return lightDir - 2.0 * dot(lightDir, normal) * normal;
// }

// Ray-sphere intersection
float trace(Ray ray, Sphere sphere, out vec3 normal) {

    float b = 2.0 * dot(ray.direction, ray.origin - sphere.center);
    float a = dot(ray.direction,ray.direction);
    float c = dot(ray.origin - sphere.center, ray.origin - sphere.center) - sphere.radius * sphere.radius;
    float x, y;
    bool quad;

    float discriminat = b * b - 4. * a * c;
    if (discriminat == 0.)
    {
        x = y = -b / (2. * a);
        quad = true;
    }
    else if (discriminat < 0.)
    {
        quad = false;
    }
    else
    {
      x = (-b + sqrt(discriminat)) / (2. * a);
      y = (-b - sqrt(discriminat)) / (2. * a);
      quad = true; 
    } 
      
    if (!quad) {
        return -1.0;
    }
    if (x > y) {
        float temp = x;
        x = y;
        y = temp;
    }
    if (x < 0.0) {
        x = y; // if x is negative, let's use y instead
        if (x < 0.0) {
            return -1.0; // both x and y are negative
        }
      }
    float t = x; 
    vec3 intersectionPoint = ray.origin + t * ray.direction;
    normal = normalize(intersectionPoint - sphere.center);
    return t;
}

// Find closest intersectionpoint 
float closestIntersectionPoint(Ray ray, out vec3 normal) {
    float closestIntersection = -1.0;
    vec3 closestNormal = vec3(0.0);

    // Find the closest intersection
    for (int i = 0; i < 4; ++i) {
        float t = trace(ray, spheres[i], normal);
        if (t > 0.0 && (closestIntersection < 0.0 || t < closestIntersection)) {
            closestIntersection = t;
            closestNormal = normal; 
        }
    }
    return closestIntersection;
}

void reflection(Ray reflectedRay, vec3 normal,  out vec3 reflectedColor) {

  vec3 finalColor = vec3(0.0);
  vec3 currentColor = vec3(1.0);

  for (int i = 0; i < bounce_no; ++i) {
      float closestIntersection[4] = float[4](-1.0,-1.0,-1.0,-1.0);
      vec3 closestNormal[4];
      int hitSphereIndex[4] = int[4](-1,-1,-1,-1);
      int count = 0;
      // Find the closest intersection for the reflected ray
      for (int j = 0; j < 4; ++j) {
          float t = trace(reflectedRay, spheres[j], closestNormal[count]);
          if (t > 0.1 && (closestIntersection[count] < 0.0 || t < closestIntersection[count])) {
              closestIntersection[count] = t;
              closestNormal[count] = closestNormal[count];
              hitSphereIndex[count] = j;
              count+=1;
          }
      }

      if(count==0)
      {
        reflectedColor = finalColor ;
        return;
      }
      // If no intersection, set background color
      for(int j=0;j<count;j++)
      {
        vec3 objectColor = spheres[hitSphereIndex[j]].color;
        float shininess = shine[hitSphereIndex[j]];

        // Calculate lighting
        vec3 viewDir = normalize(-reflectedRay.direction);
        vec3 point = reflectedRay.origin + closestIntersection[j] * reflectedRay.direction;
        vec3 lightDir = normalize(light - point);
        point = point - 0.001 * closestNormal[j];

        vec3 phongColor = Lighting(closestNormal[j], viewDir, lightDir, objectColor, shininess);
        finalColor = (finalColor+phongColor)/2.0;

        // Updating the reflected ray for the next iteration
        reflectedRay.origin = point - 0.01 * closestNormal[j];
        reflectedRay.direction = reflect(reflectedRay.direction, closestNormal[j]);
      }
        
  }

  reflectedColor = finalColor;
}


// Shading a pixel
vec4 shade(Ray ray) {
    vec3 normal;
    vec3 finalColor = vec3(0.0, 0.0, 0.0);

    float closestIntersection = -1.0;
    vec3 closestNormal = vec3(0.0);

    vec3 viewDir = normalize(-ray.direction);
    vec3 point = ray.origin +closestIntersection * ray.direction;
    vec3 lightDir = normalize(light-point);
    vec3 neworigin = point +0.0002*normal;
    // vec3 phong_fac = (0.25 * objectColor) + (0.4 * objectColor * max(dot(normal, lightDir), 0.0));
    
    // Find the closest normal
    for (int i = 0; i < 4; ++i) {
        float t = trace(ray, spheres[i], normal);
        if (t > 0.0 && (closestIntersection < 0.0 || t < closestIntersection)) {
            closestIntersection = t;
            closestNormal = normal; 
        }
    }

    // If no intersection, set background color
    if (closestIntersection < 0.0) {
        return vec4(0.0, 0.0, 0., 1.0);  // Black color for no intersection
    } else {
        vec3 objectColor = spheres[0].color;  // Default to the color of the first sphere
        float shininess = shine[0];
        // Color of the intersected sphere
        for (int i = 0; i < 4; ++i) {
            if (closestIntersection == trace(ray, spheres[i], normal)) {
                objectColor = spheres[i].color;
                shininess = shine[i];
                break;
            }
        }

        viewDir = normalize(-ray.direction);
        point = ray.origin +closestIntersection * ray.direction;
        lightDir = normalize(light-point);
        neworigin = point +0.0002*normal;
          
        // Check for shadows
        bool shadowed = false;
        for (int i = 0; i < 4; ++i) {
          float t = trace(Ray(neworigin, lightDir), spheres[i], normal);
          if (t > 0.1) {
              shadowed= true;  // Point is in shadow
          }
        }
        // Calculate lighting
        vec3 phongColor = Lighting(closestNormal, viewDir, lightDir, objectColor, shininess);
        // now adding environment reflection using ray tracing
        vec3 reflectedDir = reflect(ray.direction, closestNormal);
        Ray reflectedRay = Ray(neworigin , reflectedDir);
        vec3 reflectedColor = vec3(0.0, 0.0, 0.0);
        
        //calling reflection function
        reflection(reflectedRay, closestNormal,reflectedColor);
        if(mode == 3 || mode == 4)
        {
          phongColor += reflectedColor;
        }
        finalColor = phongColor ;
        if (shadowed && (mode == 2 || mode == 4)) {
          return vec4(0.3*finalColor.x, 0.3*finalColor.y, 0.3*finalColor.z, 1.0);  // Point is in shadow
      } 
      return vec4(finalColor, 1.0);
    }
}

// Entry point for fragment shader
void main() {
    // Screen space coordinates in the range [-1, 1]
    vec2 Coords = (gl_FragCoord.xy / vec2(500, 500)) * 2.0 - 1.0;
    vec3 rayDirection = normalize(vec3(Coords, -1.0));

    // Calculate ray origin in view space
    vec3 rayOrigin = vec3(0.0, 1.7, 4.9);

    Ray required_Ray = Ray(rayOrigin, rayDirection);

    // Output to screen
    fragColor = shade(required_Ray);
}`;

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

  // check for compiiion and linking status
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
  var vertices = [
    -1.5,
    -1.5,
    0.0, // bottom left
    1.5,
    -1.5,
    0.0, // bottom right
    1.5,
    1.5,
    0.0, // top right
    -1.5,
    1.5,
    0.0, // top left
  ];
  sqbuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sqbuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  sqbuf.itemSize = 3;
  sqbuf.numItems = 4;

  var indices = [0, 1, 2, 0, 2, 3];
  sqindexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqindexBuf);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW
  );  
  sqindexBuf.itemSize = 1;
  sqindexBuf.numItems = 6;

}

function drawSquare(color) {
  gl.bindBuffer(gl.ARRAY_BUFFER, sqbuf);
  gl.vertexAttribPointer(
    aPositionLocation,
    sqbuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // buffer for point indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqindexBuf);
  
  gl.uniform4fv(uColorLoc, color);
  gl.uniform3fv(uLightLoc, light);
  gl.uniform1i(uModeLoc, mode);
  gl.uniform1i(uBounceLoc, bounce_no);
  gl.drawElements(gl.TRIANGLES, sqindexBuf.numItems, gl.UNSIGNED_SHORT, 0);
}

//////////////////////////////////////////////////////////////////////
//The main drawing routine
function drawScene() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clearColor(0.8, 0.8, 0.8, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  // gl.enable(gl.DEPTH_TEST);
  color = [0.0, 0.0, 0.0, 1.0];
  drawSquare(color);

}

// This is the entry point from the html
function webGLStart() {
  canvas = document.getElementById("Assign5");
  
  initGL(canvas);
  shaderProgram = initShaders();
  
  //get locations of attributes declared in the vertex shader
  aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
  uColorLoc = gl.getUniformLocation(shaderProgram, "color");
  uLightLoc = gl.getUniformLocation(shaderProgram, "light");
  uModeLoc = gl.getUniformLocation(shaderProgram, "mode");
  uBounceLoc = gl.getUniformLocation(shaderProgram, "bounce_no");

  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);

  //initialize buffers for the square
  initSquareBuffer();

  var Phong = document.getElementById('Phong');
  Phong.addEventListener('click', function () {
    mode = 1;
    drawScene();
  });

  var PhongShad = document.getElementById('PhongShad');
  PhongShad.addEventListener('click', function () {
    mode = 2;
    drawScene();
  });

  var PhongRef = document.getElementById('PhongRef');
  PhongRef.addEventListener('click', function () {
    mode = 3;
    drawScene();
  });

  var PhongShadRef = document.getElementById('PhongShadRef');
  PhongShadRef.addEventListener('click', function () {
    mode = 4;
    drawScene();
  });
    

  var LightSlider = document.getElementById('Light');
  LightSlider.addEventListener('input', function () {
    var LightValue = parseFloat(LightSlider.value);
    light = [LightValue, 20.0, 3.0];
    drawScene();
  });
  var LightValue = document.getElementById("LightValue");
  LightValue.innerHTML = LightSlider.value;
  LightSlider.oninput = function() {
  LightValue.innerHTML = this.value;
  };

  var BounceSlider = document.getElementById('Bounce');
  BounceSlider.addEventListener('input', function () {
    var BounceValue = parseFloat(BounceSlider.value);
    bounce_no = BounceValue;
    drawScene();
  });
  var BounceValue = document.getElementById("BounceValue");
  BounceValue.innerHTML = BounceSlider.value;
  BounceSlider.oninput = function() {
  BounceValue.innerHTML = this.value;
  };

  drawScene();
}
