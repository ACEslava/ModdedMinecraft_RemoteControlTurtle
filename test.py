import asyncio
import websockets
import time

async def hello(websocket, path):
    async for receive in websocket:
        print(receive)
        await websocket.send(receive)

start_server = websockets.serve(hello, "localhost", 1000)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()