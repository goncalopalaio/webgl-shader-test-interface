

function pushToErrorBox(message){
	errorBox=document.getElementById("errorBox");
	errorBox.value+=message+"\n";
}
function cleanErrorBox () {
	errorBox=document.getElementById("errorBox");
	errorBox.value="";
}

function start () {


    canvas = document.getElementById("canvas");    
    
    //Setup elements
	veditor = CodeMirror.fromTextArea(document.getElementById("vertex_shader"), {
        lineNumbers: true,
        matchBrackets: true,
        mode: "text/x-csrc"
      });
	 feditor = CodeMirror.fromTextArea(document.getElementById("fragment_shader"), {
        lineNumbers: true,
        matchBrackets: true,
        mode: "text/x-csrc"
     });
	canvas.width=550;
    canvas.height=400;
    reloadLink=document.getElementById("reload");
    reloadLink.onclick=reload;
    
    


	startGL(canvas,veditor,feditor,pushToErrorBox,cleanErrorBox);



	
}


window.onload=start;