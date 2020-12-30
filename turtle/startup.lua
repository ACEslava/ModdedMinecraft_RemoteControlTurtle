print("Checking if dependencies resolved")
if shell.resolveProgram("json") == nil then --checks if json library imported
    shell.run("pastebin get PrfB3RYb json")
    print("Resolving json dependency")
end
os.loadAPI("json")
print("Resolved")

function websocketLoop()

    print("Connecting to websocket")
    ws, err = http.websocket("ws://29dec293ffd7.ngrok.io")
    if err then
        print(err)
        return
    end
    print("Connected")
    while true do
        local response = ws.receive()
        print(response)
    end

    ws.close()
end

websocketLoop()