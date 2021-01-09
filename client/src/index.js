import React, { Component, useState } from 'react';
import ReactDOM from 'react-dom';
import { Button, ButtonGroup, Card, CardContent, Typography, Menu, MenuItem, Grid, Paper} from "@material-ui/core";
import { createMuiTheme } from "@material-ui/core/styles";
import { ThemeProvider} from "@material-ui/styles" 
import ExpandLessIcon from "@material-ui/icons/ExpandLess"
import ExpandMoreIcon from "@material-ui/icons/ExpandMore"

import $ from "jquery";

import * as THREE from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader'

const turtledb = `http://localhost:1001/server/turtle.json?nocache=${new Date().getTime()}`;
const worlddb = 'http://localhost:1001/server/world.json';
var selectedturtle = null
var selectedblock = null
var ignoreBlockList = ["computercraft:turtle_expanded"]
var blocklist = {}
var turtlelist = {}

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

function startWebsocket(){
    const ws = new WebSocket('ws://localhost:1000');
    return ws
}
var ws = startWebsocket();

ws.addEventListener('open', (event) => {
    console.log("Connected to Server");
    let connection = new message("Server", "client_connect", null)
    ws.send(connection.generate())
});

ws.addEventListener('close', (event) => {
    console.log("Disconnected from Server");
    ws = null
    setTimeout(startWebsocket(), 5000)
});
var timeout;

function tooltipBox(blocklocation, blocktype){
    var element = <div style={{
                position: "absolute",
                top:"75px",
                right:"10px",
                padding: "5px"
            }}>
            <ThemeProvider theme={defaultTheme}>
            <Card style={{backgroundColor: "#303030"}}>
                <CardContent>
                    <Typography variant="h5" component="h2" align="right" color="textPrimary">{blocklocation}</Typography>
                    <Typography align="right" color="textPrimary">{blocktype}</Typography>
                </CardContent>
            </Card>
            </ThemeProvider>
        </div>
    clearTimeout(timeout)
    document.getElementById("information").style.display = "initial"
    ReactDOM.render(element, document.getElementById('information'));
    timeout = setTimeout(() => {document.getElementById("information").style.display = "none";}, 4000)
}

class Scene extends Component {
    componentDidMount(){

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
        
        $.ajax({url:worlddb, async:false, success:function(data){ //adds blocks from worlddb
            $.each(data, function (key, value) {
                if (value.name != "computercraft:turtle_expanded") {
                    blocklist[key] = value
                }
            })
        }});
        
        $.ajax({url:turtledb, async:false, success:function(data){ //adds turtles from turtledb
            $.each(data, function (key, value) {
                if (value.connected == true){
                    turtlelist[key] = value
                }
            })
        }});
        
        //Websocket Message Listener
        ws.onmessage = function (message) {
            var message = JSON.parse(message.data);
            console.log("[" + message.sender + "]: " + message.message.message_type);
            
            if (message.message.message_type == "map"){
                updateBlockList(message.message.content);
        
            } else if (message.message.message_type == "turtle_connect"){
                updateTurtleList(message.message.content, true)
        
            } else if (message.message.message_type == "turtle_disconnect"){
                updateTurtleList(message.message.content, false)
        
            } else if (message.message.message_type == "information"){
                turtlelist[Object.keys(message.message.content)[0]] = message.message.content[Object.keys(message.message.content)[0]] //updates turtlelist from info
                let object = scene.getObjectByName(selectedturtle)
                var x = turtlelist[selectedturtle].location[0]
                var z = turtlelist[selectedturtle].location[1]
                var y = turtlelist[selectedturtle].location[2]
                var rot = parseInt(turtlelist[selectedturtle].location[3])
        
                object.position.x = -x
                object.position.y = y
                object.position.z = z
                
                if (rot == 360){
                    rot = 0
                }
        
                if (rot == -90){
                    rot = 270
                }
                
                if(rot == 90){
                    object.rotation.set(Math.PI/2, -Math.PI/2, 0)
                }
                if(rot == 180){
                    object.rotation.set((3*Math.PI/2), 0, Math.PI)
                }
                if(rot == 0){
                    object.rotation.set(Math.PI/2, 0, 0)
                }
                if(rot == 270){
                    object.rotation.set(Math.PI/2, Math.PI/2, 0)
                }
        
                // controls.target.copy(object.position)
                controls.update()
                
            } else if (message.message.message_type == "error"){
                let alertText = message.message.content
                alert(`${Object.keys(alertText)[0]}: ${Object.values(alertText)[0]}`)
            }
        };
        
        var blockgroup = new THREE.Group()
        function cube(Colour, X, Z, Y, name){
            var geometry = new THREE.BoxBufferGeometry(1, 1, 1);
            var material = new THREE.MeshBasicMaterial({color: Colour});
            var cube = new THREE.Mesh(geometry, material);
        
            //Wireframe outline
            var wiregeo = new THREE.EdgesGeometry(cube.geometry);
            var wiremat = new THREE.LineBasicMaterial( { color: 0x000000, linewidth: 4 } );
            var wireframe = new THREE.LineSegments(wiregeo, wiremat);
            wireframe.name = name
            wireframe.renderOrder = 1; // make sure wireframes are rendered 2nd
            
            cube.add(wireframe);
            cube.position.set(parseFloat(-X), parseFloat(Y), parseFloat(Z))
            cube.name = name
            
            blockgroup.add(cube);
            
            return cube
        }
        
        var turtlegroup = new THREE.Group()
        
        function turtle(x, z, y, rot, name){
            const turtleLoader = new GLTFLoader();
            const otherTurtleLoader = new GLTFLoader();

            turtleLoader.load( 'src/models/turtle.glb', function (turtle) {
                
                turtle.scene.children.forEach(function(children){ //adds the selected turtlemesh
                    if (children.name == "Cube001"){
                        children.name = "SelectedTurtle"
                        children.material.visible = false
                    }
                })

                otherTurtleLoader.load( 'src/models/otherturtle.glb', function (otherturtle) { //adds the unselected turtlemesh
                    otherturtle.scene.children.forEach(function(children){
                        if (children.name == "Cube001"){
                            children.name = "UnselectedTurtle"
                            turtle.scene.add(children)
                            children.material.visible = true
                        }
                    })
                })

                console.log(turtle.scene)
                scene.add(turtle.scene)
                turtlegroup.add(turtle.scene)
                turtle.scene.position.set(parseFloat(-x),parseFloat(y),parseFloat(z))
                
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
            var coords = messagecontent["coords"]
            coords.forEach(function(value, index){
                coords[index] = parseInt(value)
            });
            var [x, y, z, rot] = coords
            if (messagecontent.up != "None" && $.inArray(messagecontent.up.name, ignoreBlockList) == -1){
                blocklist[`${x},${y+1},${z}`] = messagecontent.up
            }
            else if (`${x},${y+1},${z}` in blocklist) {
                delete blocklist[`${x},${y+1},${z}`]
            }
            scene.remove(blockgroup.getObjectByName(`${x},${y+1},${z}`))
            blockgroup.remove(blockgroup.getObjectByName(`${x},${y+1},${z}`))

            if (messagecontent.down != "None" && $.inArray(messagecontent.down.name, ignoreBlockList) == -1){
                blocklist[`${x},${y-1},${z}`] = messagecontent.down
            }
            else if (`${x},${y-1},${z}` in blocklist) {
                delete blocklist[`${x},${y-1},${z}`]
            }
            scene.remove(blockgroup.getObjectByName(`${x},${y-1},${z}`))
            blockgroup.remove(blockgroup.getObjectByName(`${x},${y-1},${z}`))
        
            if(rot == 0){z--}
            else if(rot == 90){x++}
            else if(rot == 180){z++}
            else if(rot == 270){x--}
        
            if (messagecontent.front != "None" && $.inArray(messagecontent.front.name, ignoreBlockList) == -1){
                blocklist[`${x},${y},${z}`] = messagecontent.front
            }
            else if (`${x},${y},${z}` in blocklist) {
                delete blocklist[`${x},${y},${z}`]
            }
            scene.remove(blockgroup.getObjectByName(`${x},${y},${z}`))
            blockgroup.remove(blockgroup.getObjectByName(`${x},${y},${z}`))

            for (var keys in blocklist){
                if (scene.getObjectByName(keys) == null){
                    coords = keys.split`,`.map(x=>+x)
                    
                    value = blocklist[keys]
                    colour = colourFromString(value.name)
        
                    cube(colour, coords[0], coords[1], coords[2], keys)
                }

                for (var object in blockgroup.children){
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
                    if (scene.getObjectByName(key) == null){
                        var [x,y,z,rot] = turtlelist[key].location
                        turtle(x, y, z, rot, turtlelist[key].label)
                    }
                })
        
            } else if (isconnecting ==false){
                delete turtlelist[turtleinfo]
        
                for (var object in turtlegroup.children){
                    object = turtlegroup.children[object]
                    if (!(object.name in turtlelist)){
                        scene.remove(object)
                        turtlegroup.remove(object)
                    }
                };
            }
        }
        
        // ThreeJS Scene
        var raycaster, mouse = {x:0, y:0};
        var scene = new THREE.Scene();

        var camera = new THREE.PerspectiveCamera(90, window.innerWidth/window.innerHeight, 1 ,10000);
        camera.position.set( 0, -10, 5);
        camera.up = new THREE.Vector3(0,0,1);
        camera.lookAt(new THREE.Vector3(0,0,0));

        var renderer = new THREE.WebGLRenderer({alpha: true});
        renderer.setClearColor( 0xffffff, 0);
        renderer.setSize(window.innerWidth, window.innerHeight);
        this.mount.appendChild( renderer.domElement );

        var raycaster = new THREE.Raycaster();
        renderer.domElement.addEventListener( 'click', onMouseMove, false );

        const light = new THREE.AmbientLight( 0xffffff, 2);
        light.position.set( 50, 50, 50 );
        scene.add(light);

        //Raycaster
        function onMouseMove(event) {
            mouse.x = ( event.offsetX / window.innerWidth ) * 2 - 1;
            mouse.y = - ( event.offsetY / window.innerHeight ) * 2 + 1;
            
            let turtleObjects = [...scene.children[1].children] //creates an array of raycastable objects
            var sceneObjects = []

            turtleObjects.forEach(function(group) {
                (group.children).forEach(function(child) {
                    if (child.name == "UnselectedTurtle" && child.material.visible == true) {
                        sceneObjects.push(child)
                    } else if (child.name == "SelectedTurtle" && child.material.visible == true) {
                        sceneObjects.push(child)
                    }
                })
            });

            sceneObjects = sceneObjects.concat(...scene.children[2].children)
            raycaster.setFromCamera( mouse, camera );
            const intersects = raycaster.intersectObjects(sceneObjects);
            if (intersects.length > 0) { //checks if intersected anything
                let intersectedObject = intersects[0].object //chooses first intersected object
                
                if (intersectedObject.name == "UnselectedTurtle") { 
                    intersectedObject.material.visible = false //changes skin to deselected skin

                    turtleObjects.forEach(function(group) { //changes all other turtle skins to deselected skin
                        (group.children).forEach(function(child) { 
                            if (child.name == "SelectedTurtle" && child.material.visible == true) {
                                child.material.visible = false
                                child.parent.children.forEach(function(childGroupObjects) {
                                    if (childGroupObjects.name == "UnselectedTurtle") {
                                        childGroupObjects.material.visible = true
                                    }
                                })
                            }
                        })
                    });

                    intersectedObject.parent.children.forEach(function(child) {
                        if (child.name == "SelectedTurtle") {
                            child.material.visible = true
                        }
                    })
                    selectedturtle = intersectedObject.parent.name //selects turtle
                } else if (intersectedObject.name == "SelectedTurtle") { 
                    intersectedObject.material.visible = false

                    intersectedObject.parent.children.forEach(function(child) {
                        if (child.name == "UnselectedTurtle") {
                            child.material.visible = true
                        }
                    })
                    selectedturtle = null //deselects turtle
                } else if (intersectedObject.type == "Mesh") {
                    console.log(blocklist[intersectedObject.name].name)
                    tooltipBox(intersectedObject.name, blocklist[intersectedObject.name].name);
                }
            }
        }

        for (var keys in blocklist){
            if (scene.getObjectByName(keys) == null){
                var coords = keys.split`,`.map(x=>+x)
                
                var value = blocklist[keys]
                var colour = colourFromString(value.name)

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
                var [x,y,z,rot] = turtlelist[key].location
                turtle(x, y, z, rot, turtlelist[key].label)
            }
        })
        
        scene.add(turtlegroup)
        scene.add(blockgroup)
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.update();
        
        function animate() {
            renderer.render(scene, camera)
            requestAnimationFrame(animate);
            controls.update();
        }

        window.addEventListener( 'resize', onWindowResize, false );

        function onWindowResize(){
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        animate();
    }

    render() {
        return (
            <div style={{
                display: "block",
                position: "absolute",
                top: "0px",
                left: "0px",
                zIndex: 0
                }}
                ref={ref => (this.mount = ref)}>
            </div>
        )
      }
}

const defaultTheme = createMuiTheme({
    palette: {
      text:{
        primary: "#FFFFFF"
      }
    }
});

class Keyboard extends Component {
    constructor(props){
        super(props);
        this.keyFunctions = this.keyFunctions.bind(this)
    }
    
    keyFunctions(event){
        if (event.isComposing || event.keyCode === 87) {
            let turtlemessage = new message(selectedturtle, "turtle_command", "move forward");
            ws.send(turtlemessage.generate())

        } else if (event.isComposing || event.keyCode === 83) {
            let turtlemessage = new message(selectedturtle, "turtle_command", "move backward");
            ws.send(turtlemessage.generate())

        } else if (event.isComposing || event.keyCode === 32) {
            let turtlemessage = new message(selectedturtle, "turtle_command", "move up");
            ws.send(turtlemessage.generate())
        
        } else if (event.isComposing || event.keyCode === 16) {
            let turtlemessage = new message(selectedturtle, "turtle_command", "move down");
            ws.send(turtlemessage.generate())

        } else if (event.isComposing || event.keyCode === 81) {
            let turtlemessage = new message(selectedturtle, "turtle_command", "rotate CCW");
            ws.send(turtlemessage.generate())

        } else if (event.isComposing || event.keyCode === 69) {
            let turtlemessage = new message(selectedturtle, "turtle_command", "rotate CW");
            ws.send(turtlemessage.generate())

        }
    }
    
    componentDidMount(){
        document.addEventListener("keydown", this.keyFunctions, false)
    }
    componentWillUnmount(){
        document.removeEventListener("keydown", this.keyFunctions, false)
    }

    render(){
        return (   
          <div/>
        )
      }
}

function Controls(){
    function updateAll() {
        $.getJSON(turtledb, function(data) {
            $.each(data, function (key, entry) {
                let turtlemessage = new message(key, "turtle_command", "update");
                ws.send(turtlemessage.generate())
            })
        });
    }

    function digUp() {
        let turtlemessage = new message(selectedturtle, "turtle_command", "dig up");
        ws.send(turtlemessage.generate())
    }

    function digForward() {
        let turtlemessage = new message(selectedturtle, "turtle_command", "dig forward");
        ws.send(turtlemessage.generate())
    }

    function digDown() {
        let turtlemessage = new message(selectedturtle, "turtle_command", "dig down");
        ws.send(turtlemessage.generate())
    }

    return (
        <div style={{
            padding: "10px",
            width: "100vw", 
            backgroundColor: "#303030",
            position: "fixed",
            zIndex: 100,
            top: "0px",
            left: "0px"}}>
            <div style={{display: "inline-block"}}>
                <ButtonGroup
                    orientation="horizontal"
                    aria-label="horizontal contained primary button group">
                    <Button style={{backgroundColor: "#f22b29"}} onClick={digUp}><ExpandLessIcon></ExpandLessIcon></Button>
                    <Button style={{backgroundColor: "#f22b29"}} onClick={digForward}>DIG</Button>
                    <Button style={{backgroundColor: "#f22b29"}} onClick={digDown}><ExpandMoreIcon></ExpandMoreIcon></Button>
                </ButtonGroup>
                    <div style={{position: "relative", top: "-8px", left:"10px", display: "inline-block"}}>
                    <Button variant="contained" style={{backgroundColor: "#ecf0f1"}} onClick={updateAll} disableElevation>Update All</Button>
                    </div>
                </div>
        </div>
    )
}

function Inventory() {

    const [anchorEl, setAnchorEl] = React.useState(null);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
        event.preventDefault()
    };

    const handleClose = () => {
        setAnchorEl(null);
        event.preventDefault()
    };

    function InventoryMenu(buttonID){
        return(
            <div>
                <Button style={{
                    maxWidth: '50px', 
                    maxHeight: '50px', 
                    minWidth: '50px', 
                    minHeight: '50px', 
                    padding: "10px"}} 
                    variant="contained" 
                    onContextMenu={handleClick}>
                    {buttonID}
                </Button>
                <Menu
                    id="simple-menu"
                    anchorEl={anchorEl}
                    keepMounted
                    open={Boolean(anchorEl)}
                    onClose={handleClose}
                >
                    <MenuItem onClick={handleClose}>Profile</MenuItem>
                    <MenuItem onClick={handleClose}>My account</MenuItem>
                    <MenuItem onClick={handleClose}>Logout</MenuItem>
                </Menu>
            </div>
        )
    }

    function InventoryRow(rowID) {
        return (
          <React.Fragment>
            <Grid item xs={0} style={{height: "75px"}}>
                {InventoryMenu(`${rowID}1`)}
            </Grid>
            <Grid item xs={0}>
                {InventoryMenu(`${rowID}2`)}
            </Grid>
            <Grid item xs={0}>
                {InventoryMenu(`${rowID}3`)}
            </Grid>
            <Grid item xs={0}>
                {InventoryMenu(`${rowID}4`)}
            </Grid>
          </React.Fragment>
        );
    }

    return(<div style={{
        position: "absolute",
        top:"75px",
        left:"10px",
    }}>
        <Card style={{backgroundColor: "#303030", width:"284px", height:"270px"}}>
        <Grid container spacing={1} justify="center" alignItems="center" style={{padding:"10px"}}>
                <Grid container item xs={12} spacing={2}>
                {InventoryRow("A")}
                </Grid>
                <Grid container item xs={12} spacing={2}>
                {InventoryRow("B")}
                </Grid>
                <Grid container item xs={12} spacing={2}>
                {InventoryRow("C")}
                </Grid>
                <Grid container item xs={12} spacing={2}>
                {InventoryRow("D")}
                </Grid>
        </Grid>
        </Card>
    </div>
    )
}

function App() {

    return(
        <div style={{
            backgroundColor: "#404040",
            width: "100vw",
            height: "100vh"
            }}>
            <Controls/>
            <Scene/>
            <Keyboard/>
            <Inventory/>
        </div>
    )
}

ReactDOM.render(<App/>, document.getElementById('root'));