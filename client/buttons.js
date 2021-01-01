const ws = new WebSocket('ws://localhost:1000');
const dropdownselection = document.getElementById('turtle-dropdown')
const turtledb = 'http://localhost:1001/server/turtle.json';
let dropdown = $('#turtle-dropdown');
selectedturtle = "Turtle"

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
    console.log("[" + message["sender"] + "]: " + message["message"]["content"]);
    if (message["message"]["content"] == "map"){
        
    }
};

//Dropdown change recipient
dropdownselection.addEventListener('change', (event) => {
    selectedturtle = document.getElementById("turtle-dropdown").value
});

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

// Populate dropdown with turtles
$.getJSON(turtledb, function(data) {
    $.each(data, function (key, entry) {
        dropdown.append($('<option></option>').attr('value', entry.abbreviation).text(key));
    })
});