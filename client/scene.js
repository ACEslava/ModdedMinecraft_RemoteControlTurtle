const turtledb = `http://localhost:1001/server/turtle.json?nocache=${new Date().getTime()}`;
const worlddb = 'http://localhost:1001/server/world.json';
const dropdownselection = document.getElementById('turtle-dropdown')
let dropdown = $('#turtle-dropdown');
var selectedturtle = "Turtle"

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

function colourFromString(string){
    var hash = 0
    for (var i = 0; i < string.length; i++) {
        hash = string.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash;
    }
    var color = '#';
    for (var i = 0; i < 3; i++) {
        var value = (hash >> (i * 8)) & 255;
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color;   
}

var blocklist = {}
$.ajax({url:worlddb, async:false, success:function(data){ //adds blocks from worlddb
    $.each(data, function (key, value) {
        blocklist[key] = value
    })
}});

var turtlelist = {}
$.ajax({url:turtledb, async:false, success:function(data){ //adds turtles from turtledb
    $.each(data, function (key, value) {
        if (value.connected == true){
            turtlelist[key] = value
        }
    })
}});

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
    cube.position.x = -X
    cube.position.y = Y
    cube.position.z = Z
    cube.name = name
    
    blockgroup.add(cube);
    
    return cube
}

var turtlegroup = new THREE.Group()
function turtle(x, z, y, rot, name){
    const loader = new THREE.GLTFLoader();
    loader.load( 'src/models/turtle.glb', function (turtle) {
    console.log(turtle)
    scene.add(turtle.scene)
    turtlegroup.add(turtle.scene)
    turtle.scene.position.set(-x,y,z)
    
    if(rot == 0){
        turtle.scene.rotation.set(Math.PI/2, 0, 0)
    } else if(rot == 90){ //to compensate for weird turtle rotation behaviour
        turtle.scene.rotation.set(Math.PI/2, -Math.PI/2, 0)
    }else if(rot == 180){
        turtle.scene.rotation.set((3*Math.PI/2), 0, Math.PI)
    }else if(rot == 270){
        turtle.scene.rotation.set(Math.PI/2, Math.PI/2, 0)
    }

    turtle.scene.name = name
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

    for (var keys in blocklist){
        if (scene.getObjectByName(keys) == null){
            coords = keys.split`,`.map(x=>+x)
            
            value = blocklist[keys]
            colour = colourFromString(value.name)

            cube(colour, coords[0], coords[1], coords[2], keys)
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

function updateTurtleList(turtleinfo, isconnecting) {
    if (isconnecting == true){
        turtlelist[turtleinfo.label] = turtleinfo
    
        Object.keys(turtlelist).forEach(function(key){
            console.log(key)
            if (scene.getObjectByName(key) == null){
                [x,y,z,rot] = turtlelist[key].location
                turtle(x, y, z, rot, turtlelist[key].label)
            }
        })

    } else if (isconnecting ==false){
        delete turtlelist[turtleinfo]

        for (object in turtlegroup.children){
            object = turtlegroup.children[object]
            if (!(object.name in turtlelist)){
                console.log("removing turtle")
                scene.remove(object)
                turtlegroup.remove(object)
            }
        };
    }

    //Dropdown
    dropdown.empty();
    dropdown.append('<option selected="true" disabled>Choose Turtle</option>');
    dropdown.prop('selectedIndex', 0);
    for (keys in turtlelist){
        var value = turtlelist[keys]
        dropdown.append($('<option></option>').attr('value', value.abbreviation).text(keys));
    }
}

//ButtonPressFunctions
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

document.addEventListener("keydown", event => {
    if (event.isComposing || event.keyCode === 87) {
        let turtlemessage = new message(selectedturtle, "turtle_command", "move forward");
        ws.send(turtlemessage.generate())
    }

    if (event.isComposing || event.keyCode === 83) {
        let turtlemessage = new message(selectedturtle, "turtle_command", "move backward");
        ws.send(turtlemessage.generate())
    }

    if (event.isComposing || event.keyCode === 81) {
        let turtlemessage = new message(selectedturtle, "turtle_command", "rotate CCW");
        ws.send(turtlemessage.generate())
    }

    if (event.isComposing || event.keyCode === 69) {
        let turtlemessage = new message(selectedturtle, "turtle_command", "rotate CW");
        ws.send(turtlemessage.generate())
    }
});

// ThreeJS Scene
var scene = new THREE.Scene();

var camera = new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight, 1,10000);
camera.position.set( 0, -10, 5);
camera.up = new THREE.Vector3(0,0,1);
camera.lookAt(new THREE.Vector3(0,0,0));

var ThreeJScanvas = document.getElementById("ThreeJSCanvas")
var renderer = new THREE.WebGLRenderer({alpha: true, canvas: ThreeJScanvas });
renderer.setClearColor( 0xffffff, 0);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const light = new THREE.AmbientLight( 0xffffff, 2);
light.position.set( 50, 50, 50 );
scene.add(light);

for (var keys in blocklist){
    if (scene.getObjectByName(keys) == null){
        coords = keys.split`,`.map(x=>+x)
        
        value = blocklist[keys]
        colour = colourFromString(value.name)

        cube(colour, coords[0], coords[1], coords[2], keys)
    }
    blockgroup.traverse(function(object){
        if (!(object.name in blocklist)){
            scene.remove(object)
        }
    });
}

Object.keys(turtlelist).forEach(function(key){
    console.log(key)
    console.log(turtlelist[key])
    if (scene.getObjectByName(key) == null){
        [x,y,z,rot] = turtlelist[key].location
        turtle(x, y, z, rot, turtlelist[key].label)
    }
})

scene.add(turtlegroup)
scene.add(blockgroup)
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.update();

function render() {
    renderer.render(scene, camera)
    requestAnimationFrame(render);
    controls.update();;
}

render();

//Dropdown
dropdown.empty();
dropdown.append('<option selected="true" disabled>Choose Turtle</option>');
dropdown.prop('selectedIndex', 0);
$.getJSON(turtledb, function(data) {
    $.each(data, function (key, entry) {
        if(entry.connected){
            dropdown.append($('<option></option>').attr('value', entry.abbreviation).text(key));
        }
    })
});
//Dropdown change recipient
dropdownselection.addEventListener('change', (event) => {
    selectedturtle = document.getElementById("turtle-dropdown").value
    object = scene.getObjectByName(selectedturtle)
    controls.target.copy(object.position)
    camera.position.copy(object.position)
    camera.position.z = object.position.z + 4
    camera.position.y = object.position.y + 4
    controls.update()
});