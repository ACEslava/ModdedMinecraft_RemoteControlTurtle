import asyncio
import websockets
import json
import funkybob
import pickle
from turtle import Turtle
import os

FILE_DIR = os.path.dirname(os.path.realpath(__file__))
CONNECTED = set()
TURTLES = dict()

class message_data(): #json packet parser
        def __init__(self, sender:str, recipient:str, message_type:str, content = None):
            self.sender = sender
            self.recipient = recipient
            self.message_type = message_type
            self.content = content
        
        def encodeJSON(self):
            message = {
                "sender":self.sender,
                "recipient":self.recipient,
                "message": {
                    "message_type":self.message_type,
                    "content":self.content
                }
            }
            return json.dumps(message)
        
        def decodeJSON(message):
            for key in ["sender","recipient","message","message_type","content"]:
                if key not in message:
                    print("Error: Bad Formatting")
            contents = json.loads(message)
            
            return message_data(
                contents["sender"],
                contents["recipient"],
                contents["message"]["message_type"],
                contents["message"]["content"]
            )

async def broadcast(message):
    for ws in CONNECTED:
        await ws.send(message)

async def connect(websocket, path):
    try: 
        async for message in websocket:
            CONNECTED.add(websocket)
            message = message_data.decodeJSON(message) #converts message into Object
            print(f'[{message.sender}]: {message.message_type} | {message.content}') #log
            
            if message.recipient != "Server": #echos msg if recipient not server
                await asyncio.create_task(broadcast(message.encodeJSON()))

            elif message.sender == "Client": #checks if sender is client
                if message.message_type == "client_connect":
                    print(f'[Client] Connected')

            else: #thus sender is turtle if not client or server
                TURTLES[message.sender] = websocket #adds turtle to current working list of connected turtles
                if message.message_type == "turtle_connect":
                    print(f'[{message.sender}] Connected')
                    turtle = Turtle.jsonToObject(message.content) #converts message into Turtle object

                    if message.sender == 'Unnamed': #renames unnamed turtle
                        with open(os.path.join(FILE_DIR, 'turtle.json'), 'r') as db: #opens turtle database
                            database = json.load(db)

                        while True: #checks if name matches any existing turtles
                            name = next(iter(funkybob.RandomNameGenerator(members=2, separator='_')))
                            if name in database.keys():
                                continue
                            else: break
                        
                        renamecommand = message_data("Server", "Unnamed", "turtle_command", f"rename {name}") #sends rename command
                        print(renamecommand.encodeJSON())
                        await websocket.send(renamecommand.encodeJSON())
                        
                        turtle.label = name #updates turtle object to match
                        database[turtle.label] = turtle.__dict__

                        with open(os.path.join(FILE_DIR, 'turtle.json'), 'w') as db: #adds turtle to database
                            json.dump(database,db, indent=4)
                
                elif message.message_type == "information":
                    with open(os.path.join(FILE_DIR, 'turtle.json'), 'r') as db:
                        database = json.load(db)
                    turtle = Turtle.jsonToObject(message.content)
                    database[turtle.label] = turtle.__dict__
                    with open(os.path.join(FILE_DIR, 'turtle.json'), 'w') as db:
                        json.dump(database,db, indent=4)

    except Exception as e:
        print(e)
        pass

    finally:
        print(f'[{message.sender}] Disconnected')
        CONNECTED.remove(websocket)
        
        if websocket in TURTLES.values():
            del TURTLES[turtle.label]
            print(str(TURTLES))

start_server = websockets.serve(connect, "localhost", 1000)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()