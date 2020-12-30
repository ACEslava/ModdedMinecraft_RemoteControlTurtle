import asyncio
import websockets

async def hello():
    uri = "ws://localhost:1000"
    async with websockets.connect(uri) as websocket:
        while True:
            await websocket.send("working")
            greeting = await websocket.recv()
            print(f"< {greeting}")

asyncio.get_event_loop().run_until_complete(hello())