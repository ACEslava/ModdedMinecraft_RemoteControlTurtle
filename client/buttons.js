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
        let connection = new message("Server", "connected", null)
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
        let usermessage = new message("Turtle", "turtlecommand", "return turtle.turnRight()");
        ws.send(usermessage.generate())
    }
