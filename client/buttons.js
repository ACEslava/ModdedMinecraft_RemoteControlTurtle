const ws = new WebSocket("ws://localhost:1000");

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
    };

    //ButtonPressFunctions
    function rotateCW(){
        let turtlemessage = new message("Turtle", "turtle_custom_command", "return turtle.turnRight()");
        ws.send(turtlemessage.generate())
    }

    function rotateCCW(){
        let turtlemessage = new message("Turtle", "turtle_custom_command", "return turtle.turnLeft()");
        ws.send(turtlemessage.generate())
    }

    function customcommand(){
        let customcommand = document.getElementById("customcommand").value
        let turtlemessage = new message("Turtle", "turtle_custom_command", customcommand);
        ws.send(turtlemessage.generate())
    }

    function definedcommand(){
        let definedcommand = document.getElementById("definedcommand").value
        let turtlemessage = new message("Turtle", "turtle_command", definedcommand);
        ws.send(turtlemessage.generate())
    }
