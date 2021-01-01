const ws = new WebSocket('ws://localhost:1000');
const turtledb = 'http://localhost:1001/server/turtle.json';
const worlddb = 'http://localhost:1001/server/world.json';
const dropdownselection = document.getElementById('turtle-dropdown')
let dropdown = $('#turtle-dropdown');
var selectedturtle = "Turtle"
var blocklist = {}

class message {
    constructor(recipient, message_type, content){
        this.recipient = recipient
        this.message_type = message_type
        this.content = content
    }
    generate(){
        var message = {
            "sender":"Client",
            "recipient":this.recipient, 
            "message": { 
                "message_type":this.message_type, 
                "content": this.content 
                } 
            }
        return JSON.stringify(message);
    }
}

// ThreeJS Scene
var scene = new THREE.Scene();

var camera = new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight, 1,10000);
camera.position.set( 0, -10, 5);
camera.up = new THREE.Vector3(0,0,1);
camera.lookAt(new THREE.Vector3(0,0,0));


var renderer = new THREE.WebGLRenderer({alpha: true});
renderer.setClearColor( 0xffffff, 0);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

var blockgroup = new THREE.Group()
function cube(Colour, X, Z, Y, name){
    var geometry = new THREE.BoxGeometry(1, 1, 1);
    var material = new THREE.MeshBasicMaterial({color: Colour});
    var cube = new THREE.Mesh(geometry, material);

    //Wireframe outline
    var wiregeo = new THREE.EdgesGeometry(cube.geometry);
    var wiremat = new THREE.LineBasicMaterial( { color: 0x000000, linewidth: 4 } );
    var wireframe = new THREE.LineSegments(wiregeo, wiremat);
    wireframe.name = name
    wireframe.renderOrder = 1; // make sure wireframes are rendered 2nd
    
    cube.add(wireframe);
    cube.position.x = X
    cube.position.y = Y
    cube.position.z = Z
    cube.name = name
    
    blockgroup.add(cube);
    
    return cube
}

var turtlegroup = new THREE.Group()
function turtle(x, z, y, rot){
    const loader = new THREE.GLTFLoader();
    loader.load( 'src/models/turtle.glb', function (turtle) {
    console.log(turtle)
    scene.add(turtle.scene)
    turtlegroup.add(turtle.scene)
    turtle.scene.position.set(x,y,z)
    turtle.scene.rotation.set((rot+90)*(Math.PI/180), 0, 0)
    return turtle.scene
    })
}

function updateBlockList(messagecontent) {
    coords = messagecontent["coords"]
    coords.forEach(function(value, index){
        coords[index] = parseInt(value)
    });
    var [x, y, z, rot] = coords
    if (messagecontent["up"] != "None"){
        blocklist[`${x},${y+1},${z}`] = messagecontent["up"]
    }
    else if (`${x},${y+1},${z}` in blocklist) {
        delete blocklist`${x},${y+1},${z}`
    }

    if (messagecontent["down"] != "None"){
        blocklist[`${x},${y-1},${z}`] = messagecontent["down"]
    }
    else if (`${x},${y-1},${z}` in blocklist) {
        delete blocklist`${x},${y-1},${z}`
    }

    if(rot == 0){z--}
    else if(rot == 90){x++}
    else if(rot == 180){z++}
    else if(rot == 270){x--}

    if (messagecontent["front"] != "None"){
        blocklist[`${x},${y},${z}`] = messagecontent["front"]
    }
    else if (`${x},${y},${z}` in blocklist) {
        delete blocklist[`${x},${y},${z}`]
    }
    console.log(blocklist);

    for (var keys in blocklist){
        if (scene.getObjectByName(keys) == null){
            coords = keys.split`,`.map(x=>+x)
            cube(0x43d21f, coords[0], coords[1], coords[2], keys)
        }
        for (object in blockgroup.children){
            object = blockgroup.children[object]
            if (!(object.name in blocklist)){
                scene.remove(object)
                blockgroup.remove(object)
            }
        };
    }
}

const light = new THREE.PointLight( 0xffffff, 5);
light.position.set( 50, 50, 50 );
scene.add( light );

$.ajax({url:worlddb, async:false, success:function(data){
    $.each(data, function (key, value) {
        blocklist[key] = value
    })
}});
console.log(blocklist);

for (var keys in blocklist){
    if (scene.getObjectByName(keys) == null){
        console.log("adding block")
        coords = keys.split`,`.map(x=>+x)
        cube(0x43d21f, coords[0], coords[1], coords[2], keys)
    }
    blockgroup.traverse(function(object){
        console.log(object.name)
        if (!(object.name in blocklist)){
            scene.remove(object)
        }
    });
}

scene.add(turtlegroup)
scene.add(blockgroup)
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.update();

function render() {
    requestAnimationFrame(render);
    controls.update();
    renderer.render(scene, camera);
}

render();

//Websocket Listeners
ws.addEventListener('open', (event) => {
    console.log("Connected to Server");
    let connection = new message("Server", "client_connect", null)
    ws.send(connection.generate())
});

ws.addEventListener('close', (event) => {
    console.log("Disconnected from Server");
});

ws.onmessage = function (message) {
    message = JSON.parse(message.data);
    console.log("[" + message["sender"] + "]: " + message["message"]["message_type"]);
    
    if (message["message"]["message_type"] == "map"){
        console.log(message)
        updateBlockList(message["message"]["content"])
    }
};

//ButtonPressFunctions
function rotateCW(){
    let turtlemessage = new message(selectedturtle, "turtle_custom_command", "return turtle.turnRight()");
    ws.send(turtlemessage.generate())
}

function rotateCCW(){
    let turtlemessage = new message(selectedturtle, "turtle_custom_command", "return turtle.turnLeft()");
    ws.send(turtlemessage.generate())
}

function updateAll(){
    $.getJSON(turtledb, function(data) {
        $.each(data, function (key, entry) {
            let turtlemessage = new message(key, "turtle_command", "update");
            ws.send(turtlemessage.generate())
        })
    });
}

function customCommand(){
    let customcommand = document.getElementById("customcommand").value
    let turtlemessage = new message(selectedturtle, "turtle_custom_command", customcommand);
    ws.send(turtlemessage.generate())
}

function definedCommand(){
    let definedcommand = document.getElementById("definedcommand").value
    let turtlemessage = new message(selectedturtle, "turtle_command", definedcommand);
    ws.send(turtlemessage.generate())
}

function moveForward(){
    let turtlemessage = new message(selectedturtle, "turtle_custom_command", "return turtle.turnLeft()");
    ws.send(turtlemessage.generate())
}

//Dropdown
dropdown.empty();
dropdown.append('<option selected="true" disabled>Choose Turtle</option>');
dropdown.prop('selectedIndex', 0);
$.getJSON(turtledb, function(data) {
    $.each(data, function (key, entry) {
        dropdown.append($('<option></option>').attr('value', entry.abbreviation).text(key));
    })
});
//Dropdown change recipient
dropdownselection.addEventListener('change', (event) => {
    selectedturtle = document.getElementById("turtle-dropdown").value
});