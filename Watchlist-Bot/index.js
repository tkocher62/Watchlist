const Discord = require("discord.js");
const fs = require("fs");
const configFile = "./data/config.json";
const bent = require('bent')
const getJSON = bent('json')
const parser = (new (require('xml2js').Parser)).parseStringPromise;
const tcpServer = require("net").createServer();
const watchlistJSON = "./data/watchlist.json";
const reportBansJSON = "./data/reportBans.json";
let config;
var watchlistData;
var reportBans;

if (!fs.existsSync(watchlistJSON)) fs.writeFileSync(watchlistJSON, "{}");
if (!fs.existsSync(reportBansJSON)) fs.writeFileSync(reportBansJSON, "{}");


//Read watchlist
try {
	watchlistData = JSON.parse(fs.readFileSync(watchlistJSON));
} catch (e) {
	console.log("Error in watchlist JSON file, please check the file.\n"+e);
	process.exit(1);
}

//Read Bans for reports
try {
	reportBans = JSON.parse(fs.readFileSync(reportBansJSON));
} catch (e) {
	console.log("Error in reportBans JSON file, please check the file.\n"+e);
	process.exit(1);
}


//Config file loading and checking here
if (fs.existsSync(configFile)) {
	try {
		config = JSON.parse(fs.readFileSync(configFile));
	} catch (e) {
		console.log("Config File Read Error!\n"+e);
		process.exit(1);
	}
	var err;
	var channelTrack = [];
	var idTrack = [];
	if (config.botAuthToken == "" || config.botAuthToken == null) {console.log("Config missing Bot Token!"); err = 1;}
	if (config.servers == null || config.servers.length == 0) {console.log("Config missing Server Configs!"); err = 1;}
	if (config.updateInterval == null) {console.log("Config missing Interval Speed in Configs!"); err = 1;}
	if (config.discordBotPrefix == "" || config.discordBotPrefix == null) {console.log("Missing Discord Bot Prefix in Configs!"); err = 1;}
	if (config.tcpPort == null) {console.log("Missing TCP Port in Configs!"); err = 1;}
	if (config.watchlistChannel == null || config.watchlistChannel == "") {console.log("Missing Watchlist Command Channel in Configs!"); err = 1;}
	if (config.reports == true && (config.reportsChannel == null || config.reportsChannel == "")) {console.log("Missing Reports Channel in Configs!"); err = 1;}
	for (i in config.servers) {
		var server = config.servers[i];
		if (server.id == "" || server.id == null) {console.log("Server missing Server ID!"); err = 1;}
		if (server.targetChannelID == "" || server.targetChannelID == null) {console.log("Server missing Channel ID!"); err = 1;}
		if (channelTrack.includes(server.targetChannelID)) {console.log("Servers have conflicting channel IDs!"); err = 1;}
		else channelTrack.push(server.targetChannelID);
		if (idTrack.includes(server.id)) {console.log("Servers have conflicting IDs!"); err = 1;}
		else idTrack.push(server.id);
	}
	if (config.steamAPIKey == "" || config.steamAPIKey == null) {console.log("Missing Steam API Key!"); err = 1;}
	if (err == 1) process.exit(1);
} else {
	console.log("Config File Not Found!");
}

//Create Discord bot object and login
var bot = new Discord.Client();
console.log("Connecting to discord...");
bot.login(config.botAuthToken);

//Object containing active server message information
var servers = {};

//Interval for calling update function every x millisec.
setInterval(performUpdate, config.updateInterval);

//async GetName function that resolses a SteamID to a name. Returns -1 on request fail, and -2 on not found
async function GetName (steamid) {
	var url = "http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key="+config.steamAPIKey+"&steamids="+steamid;
	let obj;
	try {
		obj = await getJSON(url);
	} catch (e) {
		console.error(e);
		return -1; // Something went wrong in the request
	}
	if (obj.response.players.length == 0) return -2; //No Steam ID match
	else return obj.response.players[0].personaname;
}

/* Cyanox's old code for GetName
// The function for getting a players Steam name through their profile link by reading the Steam API
async function GetName(steamid)
{
    const url = "https://steamcommunity.com/profiles/" + steamid + "/?xml=1";
    try {
      const resp = await fetch(url);
      const text = await resp.text();
      const doc = new DOMParser().parseFromString(text);
      const ele = await doc.documentElement.getElementsByTagName("steamID");
      return ele.item(0).firstChild.nodeValue;
    }
    catch (error) {
        console.log(error);
    }
}
*/

// The function for getting a players SteamID64 through their profile link. Returns -1 on error
async function GetSteamID(url) {
	const get = bent('GET', 200, 'string');
    try {
		const obj = await parser(await get(url));
		return obj.profile.steamID64[0];
    } catch (error) {
        console.log(error);
		return -1;
    }
}

/* Cyanox's old code for GetSteamID
async function GetSteamID(url)
{
    try {
      const resp = await fetch(url);
      const text = await resp.text();
      const doc = new DOMParser().parseFromString(text);
      const ele = doc.documentElement.getElementsByTagName("steamID64");
      return ele.item(0).firstChild.nodeValue;
    }
    catch (error) {
        console.log(error);
    }
}
*/

async function primeChannel (channel) {
	var mess = new Discord.RichEmbed().setColor('#0099ff').setTitle('Loading..');
	var messages = await channel.fetchMessages();
	await channel.bulkDelete(messages);
	channel.send(mess).then(message => servers[channel.customId].message = message.id);
}

//when discord bot ready
bot.on("ready", botReady);

function botReady () {
	console.log("Connected to Discord!");
	for (i in config.servers) {
		var channel = bot.channels.get(config.servers[i].targetChannelID);
		if (channel == null) {
			console.log("WARNING: Server " + (config.servers[i].name || config.servers[i].id) + " channel not found! Ignoring this server")
			continue;
		}
		channel.customId = config.servers[i].id;
		servers[config.servers[i].id] = config.servers[i];
		servers[config.servers[i].id].message = -1;
		primeChannel(channel);
	}
	if (config.reports == true) {
		var rchannel = bot.channels.get(config.reportsChannel);
		if (rchannel == null) {
			console.log("WARNING: Server reports channel not found! Ignoring this server");
			servers.reports = null;
		} else {
			flushReports(rchannel);
			servers.reports = true;
		}
	} else {
		console.log("INFO: Reports Disabled");
	}
}

async function performUpdate () {
	if (bot.status != 0) return;
	for (i in servers) {
		if (servers[i].message != null) {
			if (servers[i].socket != null) {
			//if (servers[i].socket == null) {
				var statistics;
				try {
					statistics = await querryServer(servers[i]);
				} catch (e) {
					if (e == -1) {
						continue; //Other querry is busy for this server. Standby.
					} else {
						console.log("Server Querry Error: " + e);
						continue;
					}
				}
				if (statistics.playerList.length == 0 && servers[i].presenting == 2) continue; //Don't send requests when we don't need to
				for (x in statistics.playerList) if (watchlistData[statistics.playerList[x].steamid] != null) statistics.playerList[x].watchList = watchlistData[statistics.playerList[x].steamid];
				var embed = embedBuilder(servers[i], statistics.playerList.length, statistics.playerList);
				var channel = bot.channels.get(servers[i].targetChannelID);
				channel.customId = servers[i].id;
				var message = channel.messages.get(servers[i].message);
				if (message == null) {
					servers[i].message = -1;
					primeChannel(channel);
					console.log("Error, couldn't find editable message for update, refreshing server " + servers[i].id)
					continue;
				}
				message.edit(embed).catch((e) => {if (e.code == "ECONNRESET") restartBot()});
				if (statistics.playerList.length == 0) {
					servers[i].presenting = 2; //Server empty present
				} else {
					servers[i].presenting = 1; //Server list present
				}
			} else {
				if (servers[i].presenting == 0) continue;
				var name = servers[i].name || servers[i].id;
				var embed = {
					"embed": {
						"color": 1229030,
						"timestamp": new Date(),
						"footer": {"text": "Watchlist by Cyanox & Mitzey"},
						"author": {"name": name + " Status | Offline"},
						"description": "The plugin is not attached to the bot, check the status of the server."
					}
				};
				var channel = bot.channels.get(servers[i].targetChannelID);
				channel.customId = servers[i].id;
				var message = channel.messages.get(servers[i].message);
				if (message == null) {
					servers[i].message = -1;
					primeChannel(channel);
					console.log("Error, couldn't find editable message for update, refreshing server " + servers[i].id)
					continue;
				}
				message.edit(embed).catch((e) => {if (e.code == "ECONNRESET") restartBot()});
				servers[i].presenting = 0; //Server lost present
			}
		}
	}
}

//Takes a server object from "servers" and sends a request to that server for current info
function querryServer(server) {
    return new Promise(function(resolve, reject) {
		if (server.serverQuerryTimeout1 != null) reject(-1);
		server.serverQuerryTimeout1 = setTimeout(function () {
			console.log("Server " + server.id + " Update Request Timed out!");
			if (!server.socket.destroyed) server.socket.destroy();
			server.socket = null;
			this.fail(-2, server);
		}.bind(null, this), 7000);
		this.fail = function (v, server) {
			server.serverQuerryComp = null;
			server.serverQuerryFail = null;
			clearTimeout(server.serverQuerryTimeout1);
			server.serverQuerryTimeout1 = null;
			reject(v);
		}
		this.success = function (v, server) {
			server.serverQuerryComp = null;
			server.serverQuerryFail = null;
			clearTimeout(server.serverQuerryTimeout1);
			server.serverQuerryTimeout1 = null;
			resolve(v);
		}
		server.serverQuerryComp = this.success; //Resolve is a function that takes the output of the promise as a argument
		server.serverQuerryFail = this.fail; //reject is an error function that takes the output of the promise as a argument
		var o = {}; o.type = "UPDATE"; o = JSON.stringify(o);
		server.socket.write(o);
    });
}

async function botMessage (message) {
	// If it was a direct message, attempt to parse the profile link sent and get the SteamID64 using the above function
    if (message.channel.type == "dm") {
        if (message.content.includes("https://steamcommunity.com/id") || message.content.includes("https://steamcommunity.com/profiles")) {
            message.channel.send("SteamID64 for user is `" + await GetSteamID(message.content.concat("?xml=1")) + "`.");
        }
    }

	if (message.channel.id != config.watchlistChannel) return;

	// To lower case to prevent being case sensitive
    var cmd = message.content.toLowerCase();

	if (cmd == "$reload") {
		await message.channel.send("Reloading Discord Integration..");
		restartBot();
	}

    // The add command
    else if (cmd.startsWith(config.discordBotPrefix + "add")) {
        // Split the data by forward slashes
        var split = cmd.replace("$add", "").split("/");
        if (split.length >= 3) {
            var steamid = split[0].trim();
            // Create a new JSON entry with the key being the troublemakers SteamID64 and filling in the other information
            watchlistData[steamid] = {
                discipline: split[1].trim(),
                reason: split[2].trim(),
                staff: message.author.username
            }
            // Write the change to the json file
            fs.writeFile(watchlistJSON, JSON.stringify(watchlistData, null, 4), err => {
                if (err) throw err;
            });
            message.channel.send("Player `" + await GetName(steamid) + " (" + steamid + ")` has been added to the watchlist.");
        } else {
            message.channel.send("Error: Missing arguments.");
        }
    } else if (cmd.startsWith(config.discordBotPrefix + "lookup")) {
		var steamid = cmd.split(" ")[1].trim();
        // Check if the json file data contains the SteamID64 provided
        if (watchlistData.hasOwnProperty(steamid)) {
            // If so, parse the data and send it in a neat format using Discord Rich Embed
            var data = watchlistData[steamid];
            message.channel.send(new Discord.RichEmbed()
	            .setColor('#0099ff')
                .setAuthor(message.guild.name + ' Watchlist', message.guild.iconURL)
                .setThumbnail('https://i.imgur.com/NLbIUZk.png')
                .addField('Player', "[" + await GetName(steamid) + " (" + steamid + ")](https://steamcommunity.com/profiles/" + steamid + ")")
                .addField('Discipline', data.discipline, true)
                .addField('Staff Member', data.staff, true)
				.addField('Reason', data.reason)
                .setTimestamp()
                .setFooter('Watchlist by Cyanox & Mitzey'));
        } else {
            message.channel.send("Player not found in watchlist.");
        }
    } else if (cmd.startsWith(config.discordBotPrefix + "remove")) {
        var steamid = cmd.split(" ")[1].trim();
        // Verify the SteamID64 is in the database
        if (watchlistData.hasOwnProperty(steamid)) {
            // Remove it from the data and write the changes to the json file
            delete watchlistData[steamid];
            fs.writeFile(watchlistJSON, JSON.stringify(watchlistData, null, 4), err => {
                if (err) throw err;
            });
            message.channel.send("Player `" + steamid + "` has been removed from the watchlist.");
        } else {
            message.channel.send("Player not found in watchlist.");
        }
    } else if (cmd.startsWith(config.discordBotPrefix + "unban")) {
		var steamid = cmd.split(" ")[1].trim();
		if (reportBans[steamid] == true) {
			delete reportBans[steamid];
			fs.writeFile(reportBansJSON, JSON.stringify(reportBans, null, 4), err => {
                if (err) throw err;
            });
			message.channel.send("Player `" + steamid + "` has been unbanned from using Reports.");
		} else {
			message.channel.send("Player not banned from Reports.");
		}
	} else if (cmd.startsWith(config.discordBotPrefix + "ban")) {
		var steamid = cmd.split(" ")[1].trim();
		if (reportBans[steamid] != true) {
			reportBans[steamid] = true;
			fs.writeFile(reportBansJSON, JSON.stringify(reportBans, null, 4), err => {
                if (err) throw err;
            });
			message.channel.send("Player `" + steamid + "` has been banned from using Reports.");
		} else if (reportBans[steamid] == true) {
			message.channel.send("Player is already banned from Reports.");
		}
	}
}

bot.on("message", botMessage);

var activeReactions = {};

function onReaction (messageReaction, user) {
	if (activeReactions[messageReaction.message.id]) activeReactions[messageReaction.message.id].handle(messageReaction, user);
}

bot.on("messageReactionAdd", onReaction);

function onMessageDelete (message) {
	if (activeReactions[message.id]) activeReactions[message.id].destroy();
}

bot.on("messageDelete", onMessageDelete);

function onBotError (e) {
	console.log("Discord bot error!\n"+e);
	restartBot();
}

bot.on("error", onBotError);

async function flushReports (channel) {
	var mess = new Discord.RichEmbed().setColor('#0099ff').setTitle('Loading..');
	var messages = await channel.fetchMessages();
	channel.bulkDelete(messages);
}

function createReactionReport (server, user, reason) {
	if (servers.reports != true) return -1; //Reports are disabled, -1
	if (reportBans[user.id] == true) return -2; //User is banned, -2
	var guild = bot.channels.get(config.reportsChannel).guild;
	var report = {};
	report.user = user;
	report.destroyed = false;
	report.server = server;
	report.accepted = false;

	report.handle = function (messageReaction, user) {
		if (user.id != bot.user.id) {
			if (messageReaction.emoji.name == "✅") {
				this.accept();
			} else if (messageReaction.emoji.name == '🚫') {
				this.destroy();
			} else if (messageReaction.emoji.name == '⚠️') {
				this.ban();
			}
		}
	}

	report.accept = function () {
		if (this.accepted == true) return;
		this.accepted = true;
		var o = {}; o.type = "REPORT"; o.sendto = this.user.id; o.resp = 1; o = JSON.stringify(o);
		if (this.server.socket) this.server.socket.write(o);
	}

	report.ban = function () {
		reportBans[this.user.id] = true;
		fs.writeFile(reportBansJSON, JSON.stringify(reportBans, null, 4), err => {
			if (err) throw err;
		});
		var o = {}; o.type = "REPORT"; o.sendto = this.user.id; o.err = -3; o = JSON.stringify(o);
		if (this.server.socket) this.server.socket.write(o);
		this.destroy();
		for (i in activeReactions) if (activeReactions[i].user.id == this.user.id && activeReactions[i].destroyed == false) activeReactions[i].destroy();
	}

	report.destroy = function () {
		this.destroyed = true;
		var id = this.messageID;
		if (this.messageID != null) {
			var message = bot.channels.get(config.reportsChannel).messages.get(this.messageID);
			if (message != null) message.delete();
			this.messageID = null;
		}
		delete activeReactions[id];
	}

	var embed = new Discord.RichEmbed()
		.setColor('#ffff00')
		.setAuthor(guild.name + ' Report', guild.iconURL)
		.setThumbnail('https://i.imgur.com/NLbIUZk.png')
		.addField('Sender', "[" + user.name + " (" + user.id + ")](https://steamcommunity.com/profiles/" + user.id + ")")
		.addField('Report', reason)
		.setTimestamp()
		.setFooter('Watchlist by Cyanox & Mitzey');

	bot.channels.get(config.reportsChannel).send(embed).then(function (message) {
		this.messageID = message.id;
		activeReactions[message.id] = report;
		message.react("✅").catch((e) => {/*ignore reaction failures*/});
		message.react("⚠️").catch((e) => {/*ignore reaction failures*/});
		message.react("🚫").catch((e) => {/*ignore reaction failures*/});
	}.bind(report));
	return 0;
}

//Function to restart the discord bot but maintain all other functionality.
function restartBot () {
	console.log("Rebuilding bot..");
	for (x in servers) servers[x].presenting = null;
	for (i in servers) if (servers[i].message != null) servers[i].message = -1;
	bot.destroy().then(function () {
		bot = new Discord.Client();
		bot.on("ready", botReady);
		bot.on("message", botMessage);
		bot.on("messageReactionAdd", onReaction);
		bot.on("messageDelete", onMessageDelete);
		bot.on("error", onBotError);
		console.log("Connecting to discord...");
		bot.login(config.botAuthToken);
	});
	activeReactions = {};
}

//Embed builder builds a discord embed to be sent to the corrent channel using known server info and player info
//Each entry in the playerList has name, id, and watchlist. Watchlist is an object containing time & reason
function embedBuilder (server, status, playerList) {
	var name = server.name || server.id;
	if (server.maxSize) status = status + "/" + server.maxSize;
	var desc = "";
	for (y in playerList) playerList[y].name = playerList[y].name[0].toUpperCase() + playerList[y].name.substring(1);
	playerList.sort((a, b) => (a.name > b.name) ? 1 : -1);
	for (x in playerList) {
		var userInfo = playerList[x].name + " - " + playerList[x].steamid;
		var watchlistInfo = "";
		var preface = ":white_check_mark: ";
		if (playerList[x].watchList != null) {
			preface = ":warning: ";
			watchlistInfo = "\n"+playerList[x].watchList.discipline + " - " + playerList[x].watchList.reason;
		}
		desc += preface + userInfo + watchlistInfo + "\n";
	}
	if (playerList.length == 0) desc = "No Players currently on the server";
	var embed = {
		"embed": {
			"color": 1229030,
			"timestamp": new Date(),
			"footer": {"text": "Watchlist by Cyanox & Mitzey"},
			"author": {"name": name + " | Players: " + status},
			"description": desc
		}
	};
	if (embed.embed.description.length >= 2048) embed.embed.description = embed.embed.description.substring(0,2047); //Trimming for max size
	return embed;
}

// Start listening on port 9090
tcpServer.listen(config.tcpPort, async function() {
    console.log("Server is listening on port " + config.tcpPort);
});

//Handle TCP connections
tcpServer.on("connection", async function(socket) {
    // Add the connection to the list | No longer being used, instead I'm keeping sockets attached to server objects
    //sockets.push(socket);
    socket.setKeepAlive(true, 1000);
    // Set the encoding method to read the bytes
    socket.setEncoding("utf8");
	socket.authed = null;
    console.log("Got Connection, Waiting for ID..");

	//Timeout anything that doesn't identifiy themselves
	socket.timeout = setTimeout(function () {
		this.timeout = null;
		console.log("Client Timed out");
		this.destroy();
	}.bind(socket), 2500);

	//Handle disconnects
	socket.on("close", function () {
		if (this.timeout != null) clearTimeout(this.timeout);
		if (this.authed) {
			var server = servers[this.authed];
			this.authed = null;
			server.maxUsers = null;
			server.socket = null; //Remove the socket from the servers object so we know that this server is unavailable
			console.log((server.name || server.id) + " Disconnected");
			for (i in activeReactions) if (activeReactions[i].server.id == server.id && activeReactions[i].destroyed == false) activeReactions[i].destroy();
		} else {
			console.log("Connection Closed");
		}
	});

	//Error handling
	socket.on("error", function (e) {
		if (e.code != "ECONNRESET") console.log("Client Error!\n"+e);
		if (this.timeout != null) clearTimeout(this.timeout);
		if (!this.destroyed) this.destory();
	});

	socket.on("data", handleTCPMessage);
});

function handleTCPMessage (data) {
	//this == socket
	try {
		data = JSON.parse(data);
	} catch (e) {
		console.log("Message parse error!\n"+e)
		return;
	}
	//We use this variable to tell if this socket is known or unknown
	if (this.authed == null) {
		if (data.type == "IDENT") {
			if (servers[data.data] != null && servers[data.data].socket == null) {
				this.write(JSON.stringify({type: "IDENT", data: "PASS"}));
				servers[data.data].socket = this;
				if (this.timeout != null) clearTimeout(this.timeout);
				if (data.maxUsers != null) servers[data.data].maxSize = data.maxUsers;
				this.authed = data.data;
				console.log((servers[data.data].name || data.data) + " Connected!");
			} else {
				this.write(JSON.stringify({type: "IDENT", data: "FAIL"}));
				setTimeout(function () {this.destroy()}.bind(this),100); //A little delay to make sure the ID fail goes out
			}
		}
	} else {
		if (data.type == "LOOKUP") {
			var o = {}; o.type = data.type; o.report = watchlistData[data.target];
			o.sender = data.sender; o = JSON.stringify(o);
			console.log(o);
			this.write(o);
		} else if (data.type == "UPDATE") {
			servers[this.authed].serverQuerryComp(data, servers[this.authed]);
		} else if (data.type == "REPORT") {
			var resp = createReactionReport(servers[this.authed], data.sender, data.report);
			var o = {}; o.type = "REPORT"; o.sendto = data.sender.id; o.resp = resp; o = JSON.stringify(o);
			this.write(o);
		}
	}
}

//Catch any TCP server Errors
tcpServer.on("error", async function(e) {
    if (e.code === "EADDRINUSE") {
        console.log("Error: Could not bind to port " + config.tcpPort + ", is it already in use?");
    } else {
        console.log(e);
    }
    process.exit(1);
});

/* Debugging to catch any errors I need to find and patch
process.on('uncaughtException', function(err) {
  console.log('Caught exception: ' + err.stack);
  process.exit(1);
});
*/
