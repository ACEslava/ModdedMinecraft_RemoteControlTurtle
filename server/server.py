import asyncio
import websockets
import json
import funkybob
import os
import subprocess
import time
import signal
import sys
import threading
from turtle import Turtle

FILE_DIR = os.path.dirname(os.path.realpath(__file__))
CONNECTED = set()
TURTLES = dict()
PORT = 1000

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

            if message.sender == "Client": #checks if sender is client
                if message.message_type == "client_connect":
                    print(f'[Client] Connected')
                elif "dig" in message.content:
                    with open(os.path.join(FILE_DIR, 'turtle.json'), 'r') as db:
                        turtledatabase = json.load(db)
                    turtle = Turtle.jsonToObject(turtledatabase[message.recipient], True)
                    turtleloc = turtle.location
                    x,y,z,rot = turtleloc
                    with open(os.path.join(FILE_DIR, "world.json"), "r") as db:
                        worlddatabase = json.load(db)
                    if message.content == "dig up":
                        del worlddatabase[f"{x},{y+1},{z}"]
                    elif message.content == "dig down":
                        del worlddatabase[f"{x},{y-1},{z}"]
                    elif message.content == "dig front":
                        if rot == 0: z -= 1
                        elif rot == 90: x += 1
                        elif rot == 180: z += 1
                        elif rot == 270: x -= 1
                        del worlddatabase[f"{x},{y},{z}"]

                    with open(os.path.join(FILE_DIR, 'world.json'), 'w') as db:
                        json.dump(worlddatabase, db, indent=4)

                    
            else: #thus sender is turtle if not client or server
                TURTLES[message.sender] = websocket #adds turtle to current working list of connected turtles
                
                if message.message_type == "turtle_connect":
                    print(f'[{message.sender}] Connected')
                    with open(os.path.join(FILE_DIR, 'turtle.json'), 'r') as db:
                        database = json.load(db)

                    if message.sender == "Unnamed":
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
                        database[name] = {"location":[0,0,0,0]}
                        with open(os.path.join(FILE_DIR, 'turtle.json'), 'w') as db: #opens turtle database
                            json.dump(database, db, indent=4)
                    
                    else: 
                        connectedmessage = message_data("Server", "Client", "turtle_connect", database[message.sender])
                        await asyncio.create_task(broadcast(connectedmessage.encodeJSON())) #tells client that bot connected
                        
                        database[message.sender]["connected"] = True
                        with open(os.path.join(FILE_DIR, 'turtle.json'), 'w') as db: #changes database to connected
                            json.dump(database,db, indent=4)
                    
                elif message.message_type == "information":   
                    if message.sender == 'Unnamed': #renames unnamed turtle
                        with open(os.path.join(FILE_DIR, 'turtle.json'), 'r') as db: #opens turtle database
                            database = json.load(db)
                        turtle = Turtle.luaJsonToObject(message.content, True)

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
                        database[turtle.label]["connected"] = True

                        with open(os.path.join(FILE_DIR, 'turtle.json'), 'w') as db: #adds turtle to database
                            json.dump(database,db, indent=4)

                        connectedmessage = message_data("Server", "Client", "turtle_connect", turtle.__dict__)
                        await asyncio.create_task(broadcast(connectedmessage.encodeJSON())) #tells client that bot connected

                    else:
                        infomessage = message_data("Server", "Client", "information", Turtle.information(message)) #sends client the information
                        await asyncio.create_task(broadcast(infomessage.encodeJSON()))
                
                elif message.message_type == "map":
                    Turtle.map(message)
                    await asyncio.create_task(broadcast(message.encodeJSON()))

                elif message.message_type == "query":
                    query = message.content

                    with open(os.path.join(FILE_DIR, 'turtle.json'), 'r') as db:
                        database = json.load(db)
                    if query == "location":
                        locationdata = ' '.join([str(i) for i in database[message.sender][query]]).strip() #converts table to space-sep. string
                        result = message_data("Server", message.sender, "turtle_command", f"location {locationdata}")
                    else:
                        result = message_data("Server", message.sender, "query_response", {"query":query, "response":database[message.sender][query]})
                    await websocket.send(result.encodeJSON())
                
                elif message.message_type == "error":
                    print(message.content)
                    infomessage = message_data("Server", "Client", "error", {message.sender:message.content}) #sends client the information
                    await asyncio.create_task(broadcast(infomessage.encodeJSON()))

                elif message.message_type == "custom_command_response":
                    print(message.content)

    except Exception as e:
        print(e)
        pass

    finally:
        print(f'[{message.sender}] Disconnected')
        CONNECTED.remove(websocket)
        
        if websocket in TURTLES.values():
            print(f'[{message.sender}] Removed from Active Turtles')
            del TURTLES[message.sender]
            
            dcnotification = message_data("Server", "Client", "turtle_disconnect", message.sender) 
            await asyncio.create_task(broadcast(dcnotification.encodeJSON())) #sends notification to client that turtle disconnected

            with open(os.path.join(FILE_DIR, 'turtle.json'), 'r') as db: #removes connected tag
                database = json.load(db)
            database[message.sender]["connected"] = False

            with open(os.path.join(FILE_DIR, 'turtle.json'), 'w') as db:
                json.dump(database, db, indent = 4)

def main():
    proc = subprocess.Popen(['python', '-u', '-m', 'http.server', str(PORT+1)],
                            stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT,
                            shell=True)
    try:
        start_server = websockets.serve(connect, "localhost", PORT)
        time.sleep(1)
        asyncio.get_event_loop().run_until_complete(start_server)
        asyncio.get_event_loop().run_forever() 
    
    finally:
        proc.terminate()
        try:
            outs, _ = proc.communicate(timeout=0.2)
            print('== subprocess exited with rc =', proc.returncode)
            print(outs.decode('utf-8'))
        except subprocess.TimeoutExpired:
            print('subprocess did not terminate in time')

def signal_handler(signal, frame): #disconnects all turtles in db
    print("[Server] Exiting")
    with open(os.path.join(FILE_DIR, 'turtle.json'), 'r') as db: #removes connected tag
        database = json.load(db)

    for keys in database.keys():
        database[keys]["connected"] = False

    with open(os.path.join(FILE_DIR, 'turtle.json'), 'w') as db:
        json.dump(database, db, indent = 4) 
    
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

main()

forever = threading.Event
forever.wait()