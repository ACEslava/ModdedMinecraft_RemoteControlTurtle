X = 0
Y = 0
Z = 0
A = 0
isFuelLow = false
stopAutomation = false

----BEGIN JSON LIBRARY
--utils
local controls = {["\n"]="\\n", ["\r"]="\\r", ["\t"]="\\t", ["\b"]="\\b", ["\f"]="\\f", ["\""]="\\\"", ["\\"]="\\\\"}

local function isArray(t)
	local max = 0
	for k,v in pairs(t) do
		if type(k) ~= "number" then
			return false
		elseif k > max then
			max = k
		end
	end
	return max == #t
end

local whites = {['\n']=true; ['\r']=true; ['\t']=true; [' ']=true; [',']=true; [':']=true}
function removeWhite(str)
	while whites[str:sub(1, 1)] do
		str = str:sub(2)
	end
	return str
end

--decoding

local decodeControls = {}
for k,v in pairs(controls) do
	decodeControls[v] = k
end

function parseBoolean(str)
	if str:sub(1, 4) == "true" then
		return true, removeWhite(str:sub(5))
	else
		return false, removeWhite(str:sub(6))
	end
end

function parseNull(str)
	return nil, removeWhite(str:sub(5))
end

local numChars = {['e']=true; ['E']=true; ['+']=true; ['-']=true; ['.']=true}
function parseNumber(str)
	local i = 1
	while numChars[str:sub(i, i)] or tonumber(str:sub(i, i)) do
		i = i + 1
	end
	local val = tonumber(str:sub(1, i - 1))
	str = removeWhite(str:sub(i))
	return val, str
end

function parseString(str)
	str = str:sub(2)
	local s = ""
	while str:sub(1,1) ~= "\"" do
		local next = str:sub(1,1)
		str = str:sub(2)
		assert(next ~= "\n", "Unclosed string")

		if next == "\\" then
			local escape = str:sub(1,1)
			str = str:sub(2)

			next = assert(decodeControls[next..escape], "Invalid escape character")
		end

		s = s .. next
	end
	return s, removeWhite(str:sub(2))
end

function parseArray(str)
	str = removeWhite(str:sub(2))

	local val = {}
	local i = 1
	while str:sub(1, 1) ~= "]" do
		local v = nil
		v, str = parseValue(str)
		val[i] = v
		i = i + 1
		str = removeWhite(str)
	end
	str = removeWhite(str:sub(2))
	return val, str
end

function parseObject(str)
	str = removeWhite(str:sub(2))

	local val = {}
	while str:sub(1, 1) ~= "}" do
		local k, v = nil, nil
		k, v, str = parseMember(str)
		val[k] = v
		str = removeWhite(str)
	end
	str = removeWhite(str:sub(2))
	return val, str
end

function parseMember(str)
	local k = nil
	k, str = parseValue(str)
	local val = nil
	val, str = parseValue(str)
	return k, val, str
end

function parseValue(str)
	local fchar = str:sub(1, 1)
	if fchar == "{" then
		return parseObject(str)
	elseif fchar == "[" then
		return parseArray(str)
	elseif tonumber(fchar) ~= nil or numChars[fchar] then
		return parseNumber(str)
	elseif str:sub(1, 4) == "true" or str:sub(1, 5) == "false" then
		return parseBoolean(str)
	elseif fchar == "\"" then
		return parseString(str)
	elseif str:sub(1, 4) == "null" then
		return parseNull(str)
	end
	return nil
end

function decode(str)
	str = removeWhite(str)
	t = parseValue(str)
	return t
end

function decodeFromFile(path)
	local file = assert(fs.open(path, "r"))
	local decoded = decode(file.readAll())
	file.close()
	return decoded
end

----END JSON LIBRARY

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
                    ["location"] = {X, Y, Z, A}
                }
            }
        }
        return turtleinfo
end

function map()
    local label = ""
        if os.getComputerLabel() == nil then
            label = "Unnamed"
        else
            label = os.getComputerLabel()
        end

    local isblockfront, blockfrontinfo = turtle.inspect()
    if isblockfront == false then
        blockfrontinfo = "None"
    end
    local isblockup, blockupinfo = turtle.inspectUp()
    if isblockup == false then
        blockupinfo = "None"
    end
    local isblockdown, blockdowninfo = turtle.inspectDown()
    if isblockdown == false then
        blockdowninfo = "None"
    end

    local turtleinfo = {
        ["sender"] = label,
        ["recipient"] = "Server",
        ["message"] = {
            ["message_type"] = "map",
            ["content"] = {
                ["front"] = blockfrontinfo,
                ["up"] = blockupinfo,
                ["down"] = blockdowninfo,
                ["coords"] = {X,Y,Z,A}
            }
        }
    }
    return turtleinfo
end

function initialInformation()
    
    label = ""
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
            ["content"] = "None"
        }
    }

    ws.send(textutils.serialiseJSON(turtleinfo))
    while true do
        local message = ws.receive()
        if message == nil then --when no websocket received
            break
        else
            message = decode(message)
            input = split(message["message"]["content"])
            command = input[1]
            table.remove(input, 1)
            turtleCommands(command, input)
            print("Command:"..command.." executed successfully")
            break
        end
    end
    return
end

function queryDatabase(querycontent)
    local query = {
        ["sender"] = label,
        ["recipient"] = "Server",
        ["message"] = {
            ["message_type"] = "query",
            ["content"] = querycontent
        }
    }
    return query
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
        X = tonumber(arg[1])
        Y = tonumber(arg[2])
        Z = tonumber(arg[3])
        A = tonumber(arg[4])
        
        ws.send(textutils.serialiseJSON(map()))
        ws.send(textutils.serialiseJSON(information()))
        return
    
    elseif command == "map" then
        return map()
    elseif command == "update" then
        ws.close()
        shell.run("update")
    elseif command == "refuel" then
        for slotnumber = 1, 16 do --reads inventory
            local currentSlotDetail = turtle.getItemDetail(slotnumber)
            if currentSlotDetail ~= nil then
                for _, block in pairs({"minecraft:coal", "minecraft:coal_block"}) do
                    if currentSlotDetail["name"] == block then
                        turtle.select(slotnumber)
                        turtle.refuel()
                    end
                end
            end 
        end
        turtle.select(1)
    elseif command == "move" then
        if arg[1] == "forward" then
            if A == 0 then
                Y = Y - 1
            elseif A == 90 then
                X = X + 1
            elseif A == 180 then
                Y = Y + 1
            elseif A == 270 then
                X = X - 1
            end

            turtle.forward()
            ws.send(textutils.serialiseJSON(information()))
            ws.send(textutils.serialiseJSON(map()))
            ws.send(textutils.serialiseJSON(queryDatabase("location")))

        elseif arg[1] == "backward" then
            if A == 0 then
                Y = Y + 1
            elseif A == 90 then
                X = X - 1
            elseif A == 180 then
                Y = Y - 1
            elseif A == 270 then
                X = X + 1
            end
            turtle.backward()
            ws.send(textutils.serialiseJSON(information()))
            ws.send(textutils.serialiseJSON(map()))
        end    
    end
end

function websocketLoop()

    print("Connecting to websocket")
    ws, err = http.websocket("ws://0a1207852c16.ngrok.io")
    
    if err then
        print(err)
        return
    end
    print("Connected")
    initialInformation()
    ws.send(textutils.serialiseJSON(information()))
    
    while true do
        local message = ws.receive()
        term.clear()
        term.setCursorPos(1,1)
        if message == nil then --when no websocket received
            break
        else
            message = decode(message)
            if message["recipient"] == label then --blocks messages not for turtle
                if isFuelLow == true then --checks if fuel low, sends to server
                    local message = {
                        ["sender"] = label,
                        ["recipient"] = "Server",
                        ["message"] = {
                            ["message_type"] = "error",
                            ["content"] = "Fuel Low"
                        }
                    }
                    ws.send(textutils.serialiseJSON(message))
                end

                print(message["message"]["content"])
                if message["message"]["message_type"] == "turtle_custom_command" then
                    local func = loadstring(message["message"]["content"])
                    func()
                    ws.send(textutils.serialiseJSON(queryDatabase("location")))

                elseif message["message"]["message_type"] == "turtle_command" then
                    input = split(message["message"]["content"])
                    command = input[1]
                    table.remove(input, 1)
                    output = turtleCommands(command, input)
                    if output ~= nil then
                        ws.send(textutils.serialiseJSON(output))
                        print("Command:"..command.." executed successfully")
                    end
                end
            end
        end
    end

    ws.close()
end

--checks if libraries imported
print("Checking if dependencies resolved")
if shell.resolveProgram("update") == nil then
    shell.run("pastebin get s5BEck0q update")
    print("Resolving update dependency")
end
print("Dependencies resolved")

label = ""
    if os.getComputerLabel() == nil then
        label = "Unnamed"
    else
        label = os.getComputerLabel()
    end

while true do 
    term.clear()
    term.setCursorPos(1,1)
    local status, res = pcall(websocketLoop)
	if res == 'Terminated' then
		print("Error. Rebooting")
        os.sleep(1)
        ws.close()
		break
    end
    print(res)
	print("Sleeping")
	os.sleep(5)
end