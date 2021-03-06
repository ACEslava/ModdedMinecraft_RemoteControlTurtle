import json
from json import JSONEncoder
import ast
import os
import websockets
import asyncio
FILE_DIR = os.path.dirname(os.path.realpath(__file__))

class Turtle():
    def __init__(
        self, 
        id:int = None, 
        label:str = None, 
        fuel:int = None, 
        maxFuel:int = None, 
        selectedSlot:int = None,
        inventory:list = [None]*16,
        location:dict = {"x":0,"y":0,"z":0},
        connected:bool = False
        ):
        
        self.id = id
        self.label = label
        self.fuel = fuel
        self.maxFuel = maxFuel
        self.selectedSlot = selectedSlot
        self.inventory = inventory
        self.location = location
        self.connected = connected


    def objectToFile(self, file):
        json.dump({self.label: self.__dict__}, file, indent=4)
        return
    
    def luaJsonToObject(object, connected):
        inventory = ast.literal_eval(object["inventory"].strip('][\\'))
        inventory = [None if i == 'None' else i for i in inventory]
        location = [int(i) for i in object["location"]]
        return Turtle(
            object["id"],
            object["label"],
            object["fuel"],
            object["maxFuel"],
            object["selectedSlot"],
            inventory,
            location,
            connected
        )

    def jsonToObject(object, connected):
        return Turtle(
            object["id"],
            object["label"],
            object["fuel"],
            object["maxFuel"],
            object["selectedSlot"],
            object["inventory"],
            object["location"],
            connected
        )
    
    def map(message):
        block = message.content
        with open(os.path.join(FILE_DIR, 'world.json'), 'r') as db:
            database = json.load(db)
        block = {k:None if v == "None" else block[k] for k,v in block.items()} #changes None str to none
        x,y,z,rot = list(map(int, message.content["coords"]))
        
        if block["up"] != None: database[f"{x},{y+1},{z}"] = block["up"]
        elif f"{x},{y+1},{z}" in database: del database[f"{x},{y+1},{z}"] #removes air entries
        
        if block["down"] != None: database[f"{x},{y-1},{z}"] = block["down"]
        elif f"{x},{y-1},{z}" in database: del database[f"{x},{y-1},{z}"] #removes air entries
        
        if rot == 0: z -= 1
        elif rot == 90: x += 1
        elif rot == 180: z += 1
        elif rot == 270: x -= 1

        if block["front"] != None: database[f"{x},{y},{z}"] = block["front"]
        elif f"{x},{y},{z}" in database: del database[f"{x},{y},{z}"] #removes air entries

        with open(os.path.join(FILE_DIR, 'world.json'), 'w') as db:
            json.dump(database, db, indent=4)
        return

    def information(message):
        with open(os.path.join(FILE_DIR, 'turtle.json'), 'r') as db:
            database = json.load(db)
        
        turtle = Turtle.luaJsonToObject(message.content, True)
        database[turtle.label] = turtle.__dict__

        with open(os.path.join(FILE_DIR, 'turtle.json'), 'w') as db:
            json.dump(database,db, indent=4)
        
        return {turtle.label:turtle.__dict__}