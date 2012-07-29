
var canvas=null;
function pushToErrorBox(message){
	errorBox=document.getElementById("errorBox");
	errorBox.value+=message+"\n";
}
function cleanErrorBox () {
	errorBox=document.getElementById("errorBox");
	errorBox.value="";
}
var veditor;
var feditor;
var pveditor;
var pfeditor;
function start () {

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

     pveditor = CodeMirror.fromTextArea(document.getElementById("point_vertex_shader"), {
        lineNumbers: true,
        matchBrackets: true,
        mode: "text/x-csrc"
      });
     pfeditor = CodeMirror.fromTextArea(document.getElementById("point_fragment_shader"), {
        lineNumbers: true,
        matchBrackets: true,
        mode: "text/x-csrc"
     });

    
    reloadLink=document.getElementById("reload");
    reloadLink.onclick=reloadSystem;
    document.addEventListener('keyup', shortcuts, false);//pass keyup events to function


	startGL(pushToErrorBox);



	
}
function reloadSystem () {
    //Clean error box
    cleanErrorBox();
    //Copy contents of the editor to the text Area
    veditor.save();
    feditor.save();
    pveditor.save();
    pfeditor.save();
    //Restart rendering process

    reload();
}
function log(message){
    if(console){
        console.log(message);
    }
}

function shortcuts(e) {

    // this would test for whichever key is 40 and the ctrl key at the same time
    if (e.ctrlKey && event.keyCode == 13) {
        
        log("reload Called");
        reloadSystem();
        pushToErrorBox("Reloaded");
    }
}


window.onload=start;