X = 0
Y = 0
Z = 0
function split(inputstr, sep)
    if sep == nil then
            sep = "%s"
    end
    local t={}
    for str in string.gmatch(inputstr, "([^"..sep.."]+)") do
            table.insert(t, str)
    end
    return t
end

function information()
    local inventory = {}
        for slotnumber = 1, 16 do --reads inventory
            local currentSlotDetail = turtle.getItemDetail(slotnumber)
            if currentSlotDetail == nil then
                currentSlotDetail = "None"
            end
            table.insert(inventory, currentSlotDetail)
        end
        
        local label = ""
        if os.getComputerLabel() == nil then
            label = "Unnamed"
        else
            label = os.getComputerLabel()
        end

        local turtleinfo = {
            ["sender"] = label,
            ["recipient"] = "Server",
            ["message"] = {
                ["message_type"] = "information",
                ["content"] = {
                    ["id"] = os.getComputerID(),
                    ["label"] = label,
                    ["fuel"] = turtle.getFuelLevel(),
                    ["maxFuel"] = turtle.getFuelLimit(),
                    ["selectedSlot"] = turtle.getSelectedSlot(),
                    ["inventory"] = textutils.serialiseJSON(inventory),
                    ["location"] = {["x"]=X, ["y"]=Y, ["z"]=Z}
                }
            }
        }
        return turtleinfo
end

function turtleCommands(command, ...)
    arg = arg[1]
    if command == "rename" then
        os.setComputerLabel(arg[1])
        print("Rename successful")
        return

    elseif command == "information" then
        return information()

    elseif command == "location" then
        X = arg[1]
        Y = arg[2]
        Z = arg[3]
        return information()
    end
end

function initialInformation()
    local inventory = {}
    for slotnumber = 1, 16 do --reads inventory
        local currentSlotDetail = turtle.getItemDetail(slotnumber)
        if currentSlotDetail == nil then
            currentSlotDetail = "None"
        end
        table.insert(inventory, currentSlotDetail)
    end
    local label = ""
    if os.getComputerLabel() == nil then
        label = "Unnamed"
    else
        label = os.getComputerLabel()
    end

    local turtleinfo = {
        ["sender"] = label,
        ["recipient"] = "Server",
        ["message"] = {
            ["message_type"] = "turtle_connect",
            ["content"] = {
                ["id"] = os.getComputerID(),
                ["label"] = label,
                ["fuel"] = turtle.getFuelLevel(),
                ["maxFuel"] = turtle.getFuelLimit(),
                ["selectedSlot"] = turtle.getSelectedSlot(),
                ["inventory"] = textutils.serialiseJSON(inventory),
                ["location"] = {["x"]=X, ["y"]=Y, ["z"]=Z}
            }
        }
    }
    return turtleinfo
end

function websocketLoop()

    print("Connecting to websocket")
    local ws, err = http.websocket("ws://0a1207852c16.ngrok.io")
    
    if err then
        print(err)
        return
    end
    print("Connected")
    ws.send(textutils.serialiseJSON(initialInformation()))
    
    while true do
        local response = ws.receive()
        if response == nil then --when no websocket received
            break
        else
            response = json.decode(response)
            print(response["message"]["content"])
            if response["message"]["message_type"] == "turtle_custom_command" then
                local func = pcall(assert(loadstring(response["message"]["content"])))
                print(func())
            end
            if response["message"]["message_type"] == "turtle_command" then
                input = split(response["message"]["content"])
                command = input[1]
                table.remove(input, 1)
                output = turtleCommands(command, input)
                if output ~= nil then
                    ws.send(textutils.serialiseJSON(output))
                    print("Command:"..response["message"]["content"].." executed successfully")
                end
            end
        end
    end

    ws.close()
end

--checks if json library imported
print("Checking if dependencies resolved")
if shell.resolveProgram("json") == nil then 
    shell.run("pastebin get PrfB3RYb json")
    print("Resolving json dependency")
end
os.loadAPI("json")
print("Resolved")

while true do 
    local status, res = pcall(websocketLoop)
	term.clear()
	term.setCursorPos(1,1)
	if res == 'Terminated' then
		print("Error. Rebooting")
		os.sleep(1)
		break
	end
	print("Sleeping")
	os.sleep(5)
end