print("Checking if dependencies resolved")
if shell.resolveProgram("json") == nil then --checks if json library imported
    shell.run("pastebin get PrfB3RYb json")
    print("Resolving json dependency")
end
os.loadAPI("json")
print("Resolved")

function websocketLoop()
    print("Connecting to websocket")
    ws, err = http.websocket("ws://9ab36025f046.ngrok.io")
    if err then
        print(err)
        ws.close()
        return
    end
    print("Connected")
    response = ws.receive()
    print(response)
end

while true do
    websocketLoop()
end