import json
from json import JSONEncoder
import ast
import websockets
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
        ):
        
        self.id = id
        self.label = label
        self.fuel = fuel
        self.maxFuel = maxFuel
        self.selectedSlot = selectedSlot
        self.inventory = inventory
        self.location = location


    def objectToFile(self, file):
        json.dump({self.label: self.__dict__}, file, indent=4)
        return
    
    def jsonToObject(object):
        inventory = ast.literal_eval(object["inventory"].strip('][\\'))
        inventory = [None if i == 'None' else i for i in inventory]

        location = {key:int(value) for key, value in object["location"].items()}

        return Turtle(
            object["id"],
            object["label"],
            object["fuel"],
            object["maxFuel"],
            object["selectedSlot"],
            inventory,
            location
        )
    