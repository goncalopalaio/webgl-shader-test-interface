//Reference to WebGLContext
var gl=null; 
var canvas=null;
//Model Matrix. Used to move models from own object space to world space
var modelMatrix=mat4.create();
//View Matrix, Transforms world space to eye space (like a camera). Everything is positioned relative to our defined eye
var viewMatrix=mat4.create();
//Projection Matrix. Used to project the scene onto a 2D viewport
var projectionMatrix=mat4.create();
//Final combined matrix. Passed into the shader program
var mvpMatrix=mat4.create();

//LIGHTS
//Copy of the Model Matrix to be used specifically for the light position
var lightModelMatrix=mat4.create();

//MODELDATA
//Float32Array buffers to store our model data
var cubePositions;
var cubeNormals;
var cubeColors;

//References to the vertex buffer objects (VBO) that we will create
var cubePositionBufferObject;
var cubeColorBufferObject;
var cubeNormalBufferObject;

//Used to pass in the combined transformation matrix
var mvpMatrixHandle;
//Used to pass in the modelview matrix
var mvMatrixHandle;
//Used to pass in the light position
var lightPosHandle;
//Used to pass in the model position
var positionHandle;
//Used to pass in the model color information
var colorHandle;
//Used to pass in the model normal information
var normalHandle;

/**********************************/

//Size of the position data in elements
var positionDataSize=3;

//Size of the color data in elements
var colorDataSize	=4;

//Size of the normal data in elements
var normalDataSize	=3;

/**********************************/

//LIGHTS
//Used to hold a light centered on the origin in model space,
//fourth coordinate used so we can get translations to work when we multiply this by our transformation matrixes
var lightPosInModelSpace = new Array (0,0,0,1);

//Used to hold the current position of the light in world space (afther transformation via model matrix)
var lightPosInWorldSpace=new Array(0,0,0,0);

//Used to hold the transformed position of the light in eyespace (after the transformation via modelviw matrix)
var lightPosInEyeSpace=new Array(0,0,0,0);

//Handle to be used in our per-vertex cube shading program;
var perVertexProgramHandle;

//Handle to our light point program
var pointProgramHandle;



/*********************************************/

/**Helper function to load a shader*/
function loadShader (sourceScriptId,type) {
	var shaderHandle=gl.createShader(type);
	var error;

	if (shaderHandle!=0) {
		var shaderSource = document.getElementById(sourceScriptId);

		if (!shaderSource) {
			error="Error: shader script "+ sourceScriptId + " not found";
			pushToErrorBox(error);
			throw(error);
		};

		//Pass the shader source
		gl.shaderSource(shaderHandle,shaderSource.value);

		//Compile the shader
		gl.compileShader(shaderHandle);

		var compiled = gl.getShaderParameter(shaderHandle,gl.COMPILE_STATUS);

		if (!compiled) {
			error=gl.getShaderInfoLog(shaderHandle);
			gl.deleteShader(shaderHandle);
			shaderHandle=0;

		};

	}
	if(shaderHandle==0){
		error="Error creating shader"+sourceScriptId + " : "+error;
		pushToErrorBox(error);
		throw(error);
	};

	return shaderHandle;
}

/**Helper function to link a shader*/
function linkProgram (vertexShader,fragmentShader,attributes) {
	
	//Create a program object and store the handle to it
	var programHandle=gl.createProgram();
	var error;

	if(programHandle!=0){
		//Bind the vertex shader to the program
		gl.attachShader(programHandle,vertexShader);
		//Bind the fragment shader to the program
		gl.attachShader(programHandle,fragmentShader);

		//Bind attributes
		if (attributes) {
			for (var i = 0; i < attributes.length; i++) {
				gl.bindAttribLocation(programHandle,i,attributes[i]);
			}
		}

		//Link the two shaders together into a program
		gl.linkProgram(programHandle);

		//Get link status
		var linked = gl.getProgramParameter(programHandle,gl.LINK_STATUS);

		//If the link failed delete the program
		if (!linked) {
			error=gl.getProgramInfoLog(programHandle);
			gl.deleteProgram(programHandle);
			programHandle=0;
		}
	}
	if (programHandle==0) {
		error="Error creating program"+ error;
		pushToErrorBox(error);
		throw(error);
	}
	return programHandle;
}

/**Start rendering once we the contex*/

function startRendering(){

	console.log(canvas);
	//viewport as the same size of canvas
	gl.viewport(0,0,canvas.clientWidth,canvas.clientHeight);

	//create new perspective projection matrix. Fixed height but varying width according
	//to aspect ratio
	var ratio=canvas.clientWidth/canvas.clientHeight;
	console.log("RATIO: "+ ratio);

	var left= 	-ratio;
	var right=	ratio;
	var bottom=	-1.0;
	var top=	1.0;
	var near=	1.0;
	var far=	10.0;

	mat4.frustum(left,right,bottom,top,near,far,projectionMatrix);

	//set background clear color
	gl.clearColor(0.0,0.0,0.0,0.0);
	
	//remove backfaces
	gl.enable(gl.CULL_FACE);

	//enable depth testing
	gl.enable(gl.DEPTH_TEST);

	//Enable dithering
	gl.enable(gl.DITHER);

	//Configure camera
	//Position the eye behind the origin
	var eyeX=	0.0;
	var eyeY=	0.0;
	var eyeZ=	-0.5;

	//Looking at:
	var lookX=	0.0;
	var lookY=	0.0;
	var lookZ=	-5.0;

	//set UP vector.

	var upX=0.0;
	var upY=1.0;
	var upZ=0.0;

	//set view matrix. This matrix represents the camera position
	var eye=vec3.create();
	eye[0]=eyeX;
	eye[1]=eyeY;
	eye[2]=eyeZ;

	var center=vec3.create();
	center[0]=lookX;
	center[1]=lookY;
	center[2]=lookZ;

	var up=vec3.create();
	up[0]=upX;
	up[1]=upY;
	up[2]=upZ;

	mat4.lookAt(eye,center,up,viewMatrix);

	//CONFIGURE SHADERS
	var vertexShaderHandle=loadShader("vertex_shader",gl.VERTEX_SHADER);
	var fragmentShaderHandle=loadShader("fragment_shader",gl.FRAGMENT_SHADER);

	//create a program object and store the handle to it
	perVertexProgramHandle=linkProgram(vertexShaderHandle,fragmentShaderHandle,new Array("a_Position","a_Color","a_Normal"));

	//simple shader program for our point
	var pointVertexShaderHandle=loadShader("point_vertex_shader",gl.VERTEX_SHADER);
	var pointFragmentShaderHandle=loadShader("point_fragment_shader",gl.FRAGMENT_SHADER);

	//create another program object
	pointProgramHandle=linkProgram(pointVertexShaderHandle,pointFragmentShaderHandle,new Array("a_Position"));

	//BUFFERS IN OPENGL WORKING MEMORY
	cubePositionBufferObject=gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,cubePositionBufferObject);
	gl.bufferData(gl.ARRAY_BUFFER,cubePositions,gl.STATIC_DRAW);

	cubeColorBufferObject=gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,cubeColorBufferObject);
	gl.bufferData(gl.ARRAY_BUFFER,cubeColors,gl.STATIC_DRAW);

	cubeNormalBufferObject=gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,cubeNormalBufferObject);
	gl.bufferData(gl.ARRAY_BUFFER,cubeNormals,gl.STATIC_DRAW);

	//render frames

	window.requestAnimFrame(render,canvas);

}
function render (time) {
	//clear canvas
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	var time=Date.now() % 10000; //Complete rotation every 10 seconds
	var angleInDegrees=(360.0/10000.0)*time;
	var angleInRadians=angleInDegrees / 57.295;

	gl.useProgram(perVertexProgramHandle);

	//Set program handles for cube drawing
	mvpMatrixHandle = gl.getUniformLocation(perVertexProgramHandle,"u_MVPMatrix");
	mvMatrixHandle = gl.getUniformLocation(perVertexProgramHandle,"u_MVMatrix");
	lightPosHandle=gl.getUniformLocation(perVertexProgramHandle,"u_LightPos");


	positionHandle=gl.getAttribLocation(perVertexProgramHandle,"a_Position");
	colorHandle=gl.getAttribLocation(perVertexProgramHandle,"a_Color");
	normalHandle=gl.getAttribLocation(perVertexProgramHandle,"a_Normal");

	var v=vec3.create();
	//Calculate position of the light.Rotate and the push into the distance
	mat4.identity(lightModelMatrix);
	v[0]=0; v[1]=0; v[2]=-5;
	mat4.translate(lightModelMatrix,v);
	mat4.rotateY(lightModelMatrix,angleInRadians);
	v[0]=0; v[1]=0; v[2]=2;
	mat4.translate(lightModelMatrix,v);

	mat4.multiplyVec4(lightModelMatrix,lightPosInModelSpace,lightPosInWorldSpace);
	mat4.multiplyVec4(viewMatrix,lightPosInWorldSpace,lightPosInEyeSpace);

	
	//DRAW CUBES
	mat4.identity(modelMatrix);
	v[0]=4; v[1]=0; v[2]=-7;
	mat4.translate(modelMatrix,v);
	mat4.rotateX(modelMatrix,angleInRadians);
	drawCube();

	mat4.identity(modelMatrix);
	v[0]=-4; v[1]=0; v[2]=-7;
	mat4.translate(modelMatrix,v);
	mat4.rotateY(modelMatrix,angleInRadians);
	drawCube();

	mat4.identity(modelMatrix);
	v[0]=0; v[1]=4; v[2]=-7;
	mat4.translate(modelMatrix,v);
	mat4.rotateZ(modelMatrix,angleInRadians);
	drawCube();

	mat4.identity(modelMatrix);
	v[0]=4; v[1]=-4; v[2]=-7;
	mat4.translate(modelMatrix,v);
	drawCube();
	
	mat4.identity(modelMatrix);
	v[0]=4; v[1]=0; v[2]=-5;
	mat4.translate(modelMatrix,v);
	v[0]=1;v[1]=1;v[2]=0;
	mat4.rotate(modelMatrix,angleInRadians,v);
	drawCube();

	//Draw a point to indicate the light
	gl.useProgram(pointProgramHandle);
	drawLight();

	gl.flush();//Flush commands to webgl
	
	window.requestAnimFrame(render,canvas);
}



function drawCube () {
	gl.enableVertexAttribArray(positionHandle);
	gl.bindBuffer(gl.ARRAY_BUFFER,cubePositionBufferObject);
	gl.vertexAttribPointer(positionHandle,positionDataSize,gl.FLOAT,false,0,0);

	gl.enableVertexAttribArray(colorHandle);
	gl.bindBuffer(gl.ARRAY_BUFFER,cubeColorBufferObject);
	gl.vertexAttribPointer(colorHandle,colorDataSize,gl.FLOAT,false,0,0);

	gl.enableVertexAttribArray(normalHandle);
	gl.bindBuffer(gl.ARRAY_BUFFER,cubeNormalBufferObject);
	gl.vertexAttribPointer(normalHandle,normalDataSize,gl.FLOAT,false,0,0);

	//Multiplies the view matrix by the model matrix and store the result in the
	//MVP matrix (which contains model*view)
	mat4.multiply(viewMatrix,modelMatrix,mvpMatrix);

	//Pass the modelview matrix as uniform
	gl.uniformMatrix4fv(mvMatrixHandle,false,mvpMatrix);

	//Multiplies the modelview matrix by the projection matrix
	//The matrix then contains model * view * projection
	mat4.multiply(projectionMatrix,mvpMatrix,mvpMatrix);

	//Pass the Model view projection matrix as uniform
	gl.uniformMatrix4fv(mvpMatrixHandle,false,mvpMatrix);

	//Pass the light position in eye space as uniform
	gl.uniform3f(lightPosHandle,lightPosInEyeSpace[0],lightPosInEyeSpace[1],lightPosInEyeSpace[2]);

	//Finally draw the cube
	gl.drawArrays(gl.TRIANGLES,0,36);

}

function drawLight () {
	
	var pointMVPMatrixHandle = gl.getUniformLocation(pointProgramHandle,"u_MVPMatrix");
	var pointPositionHandle=gl.getAttribLocation(pointProgramHandle,"a_Position");

	//Pass the position
	gl.vertexAttrib3f(pointPositionHandle,lightPosInModelSpace[0],lightPosInModelSpace[1],lightPosInModelSpace[2]);

	//since we are not using a buffer object, disable vertex arrays for this attribute
	gl.disableVertexAttribArray(pointPositionHandle);
	mat4.multiply(viewMatrix,lightModelMatrix,mvpMatrix);
	mat4.multiply(projectionMatrix,mvpMatrix,mvpMatrix);
	gl.uniformMatrix4fv(pointMVPMatrixHandle,false,mvpMatrix);

	//draw the point
	gl.drawArrays(gl.POINTS,0,1);	
}

function startGL(){


    canvas = document.getElementById("canvas");    
	canvas.width=550;
    canvas.height=400;

	gl=WebGLUtils.setupWebGL(canvas,{alpha:false});

	if (gl!=null) {
		cubePositions = new Float32Array
		([
				// Front face
				-1.0, 1.0, 1.0,				
				-1.0, -1.0, 1.0,
				1.0, 1.0, 1.0, 
				-1.0, -1.0, 1.0, 				
				1.0, -1.0, 1.0,
				1.0, 1.0, 1.0,
				
				// Right face
				1.0, 1.0, 1.0,				
				1.0, -1.0, 1.0,
				1.0, 1.0, -1.0,
				1.0, -1.0, 1.0,				
				1.0, -1.0, -1.0,
				1.0, 1.0, -1.0,
				
				// Back face
				1.0, 1.0, -1.0,				
				1.0, -1.0, -1.0,
				-1.0, 1.0, -1.0,
				1.0, -1.0, -1.0,				
				-1.0, -1.0, -1.0,
				-1.0, 1.0, -1.0,
				
				// Left face
				-1.0, 1.0, -1.0,				
				-1.0, -1.0, -1.0,
				-1.0, 1.0, 1.0, 
				-1.0, -1.0, -1.0,				
				-1.0, -1.0, 1.0, 
				-1.0, 1.0, 1.0, 
				
				// Top face
				-1.0, 1.0, -1.0,				
				-1.0, 1.0, 1.0, 
				1.0, 1.0, -1.0, 
				-1.0, 1.0, 1.0, 				
				1.0, 1.0, 1.0, 
				1.0, 1.0, -1.0,
				
				// Bottom face
				1.0, -1.0, -1.0,				
				1.0, -1.0, 1.0, 
				-1.0, -1.0, -1.0,
				1.0, -1.0, 1.0, 				
				-1.0, -1.0, 1.0,
				-1.0, -1.0, -1.0
		]);	
		
		// R, G, B, A
		cubeColors = new Float32Array
		([				
				// Front face (red)
				1.0, 0.0, 0.0, 1.0,				
				1.0, 0.0, 0.0, 1.0,
				1.0, 0.0, 0.0, 1.0,
				1.0, 0.0, 0.0, 1.0,				
				1.0, 0.0, 0.0, 1.0,
				1.0, 0.0, 0.0, 1.0,
				
				// Right face (green)
				0.0, 1.0, 0.0, 1.0,				
				0.0, 1.0, 0.0, 1.0,
				0.0, 1.0, 0.0, 1.0,
				0.0, 1.0, 0.0, 1.0,				
				0.0, 1.0, 0.0, 1.0,
				0.0, 1.0, 0.0, 1.0,
				
				// Back face (blue)
				0.0, 0.0, 1.0, 1.0,				
				0.0, 0.0, 1.0, 1.0,
				0.0, 0.0, 1.0, 1.0,
				0.0, 0.0, 1.0, 1.0,				
				0.0, 0.0, 1.0, 1.0,
				0.0, 0.0, 1.0, 1.0,
				
				// Left face (yellow)
				1.0, 1.0, 0.0, 1.0,				
				1.0, 1.0, 0.0, 1.0,
				1.0, 1.0, 0.0, 1.0,
				1.0, 1.0, 0.0, 1.0,				
				1.0, 1.0, 0.0, 1.0,
				1.0, 1.0, 0.0, 1.0,
				
				// Top face (cyan)
				0.0, 1.0, 1.0, 1.0,				
				0.0, 1.0, 1.0, 1.0,
				0.0, 1.0, 1.0, 1.0,
				0.0, 1.0, 1.0, 1.0,				
				0.0, 1.0, 1.0, 1.0,
				0.0, 1.0, 1.0, 1.0,
				
				// Bottom face (magenta)
				1.0, 0.0, 1.0, 1.0,				
				1.0, 0.0, 1.0, 1.0,
				1.0, 0.0, 1.0, 1.0,
				1.0, 0.0, 1.0, 1.0,				
				1.0, 0.0, 1.0, 1.0,
				1.0, 0.0, 1.0, 1.0
		]);
		
		// X, Y, Z
		// The normal is used in light calculations and is a vector which points
		// orthogonal to the plane of the surface. For a cube model, the normals
		// should be orthogonal to the points of each face.
		cubeNormals = new Float32Array
		([												
				// Front face
				0.0, 0.0, 1.0,				
				0.0, 0.0, 1.0,
				0.0, 0.0, 1.0,
				0.0, 0.0, 1.0,				
				0.0, 0.0, 1.0,
				0.0, 0.0, 1.0,
				
				// Right face 
				1.0, 0.0, 0.0,				
				1.0, 0.0, 0.0,
				1.0, 0.0, 0.0,
				1.0, 0.0, 0.0,				
				1.0, 0.0, 0.0,
				1.0, 0.0, 0.0,
				
				// Back face 
				0.0, 0.0, -1.0,				
				0.0, 0.0, -1.0,
				0.0, 0.0, -1.0,
				0.0, 0.0, -1.0,				
				0.0, 0.0, -1.0,
				0.0, 0.0, -1.0,
				
				// Left face 
				-1.0, 0.0, 0.0,				
				-1.0, 0.0, 0.0,
				-1.0, 0.0, 0.0,
				-1.0, 0.0, 0.0,				
				-1.0, 0.0, 0.0,
				-1.0, 0.0, 0.0,
				
				// Top face 
				0.0, 1.0, 0.0,			
				0.0, 1.0, 0.0,
				0.0, 1.0, 0.0,
				0.0, 1.0, 0.0,				
				0.0, 1.0, 0.0,
				0.0, 1.0, 0.0,
				
				// Bottom face 
				0.0, -1.0, 0.0,			
				0.0, -1.0, 0.0,
				0.0, -1.0, 0.0,
				0.0, -1.0, 0.0,				
				0.0, -1.0, 0.0,
				0.0, -1.0, 0.0
		]);    	    	
		startRendering();
	}

}


function reload () {
	startRendering();
}
