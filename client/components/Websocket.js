const ws = new WebSocket('ws://localhost:1000');

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
    console.log("[" + message.sender + "]: " + message.message.message_type);
    
    if (message.message.message_type == "map"){
        updateBlockList(message.message.content);

    } else if (message.message.message_type == "turtle_connect"){
        console.log(message);
        updateTurtleList(message.message.content, true)

    } else if (message.message.message_type == "turtle_disconnect"){
        console.log(message);
        updateTurtleList(message.message.content, false)

    } else if (message.message.message_type == "information"){
        turtlelist[Object.keys(message.message.content)[0]] = message.message.content[Object.keys(message.message.content)[0]] //updates turtlelist from info
        console.log(turtlelist)

        object = scene.getObjectByName(selectedturtle)
        console.log(object.position)

        
        x = turtlelist[selectedturtle].location[0]
        z = turtlelist[selectedturtle].location[1]
        y = turtlelist[selectedturtle].location[2]
        rot = parseInt(turtlelist[selectedturtle].location[3])

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

        controls.target.copy(object.position)
        controls.update()
        
    } else if (message.message.message_type == "error"){
        // var node = document.createElement("div");
        // node.appendChild(document.createTextNode(JSON.stringify(message.content)));
        // document.getElementById("turtle_log").appendChild(node)
    }
};