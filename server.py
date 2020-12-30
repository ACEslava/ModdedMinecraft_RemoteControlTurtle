import asyncio
import websockets
import json

class message_data(): #json packet parser
        def __init__(self, sender:str, recipient:str, message_type:str, content = None):
            self.sender = sender
            self.recipient = recipient
            self.message_type = message_type
            self.content = content
        
        def message_to_JSON(self):
            message = {
                "sender":self.sender,
                "recipient":self.recipient,
                "message": {
                    "message_type":self.message_type,
                    "content":self.content
                }
            }
            return json.dumps(message)
        
        def JSON_to_message(message):
            for key in ["sender","recipient","message","message_type","content"]:
                if key not in message:
                    print("Error: Bad Formatting")
        
            return json.loads(message)
        
async def hello(websocket, path):
    websocket.broadcast = 
    async for receivedmessage in websocket:
        print(receivedmessage)
        receivedmessage = message_data.JSON_to_message(receivedmessage)
        await websocket.send(receivedmessage)
        
        # if message["message"]["message_type"] == "connected":
        #     print(f'[{message["sender"]}] Connected')
        #     continue

        # print(f'[{message["sender"]}]: Sent "{message["message"]["content"]}"')
        
        # sending = message_data("Server", "Turtle", "test", "hello")
        # sending = sending.message_to_JSON()
        # await websocket.send(sending)

start_server = websockets.serve(hello, "localhost", 1000)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()