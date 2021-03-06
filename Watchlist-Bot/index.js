const Discord = require("discord.js");
const { Console } = require('console');
const fs = require("fs");
const configFile = "./data/config.json";
const staffListJSON = "./data/staffSync.json";
const bent = require('bent')
const getJSON = bent('json')
const parser = (new (require('xml2js').Parser)).parseStringPromise;
const tcpServer = require("net").createServer();
const watchlistJSON = "./data/watchlist.json";
const reportBansJSON = "./data/reportBans.json";
let config;
var watchlistData;
var reportBans;
var staffList;

//Staff list example: var stafflist = {steamid: discordid};

//Debugging don't mind me
const startTime = Date.now()
const stream = require('stream')
const PassThrough = require('stream').PassThrough;
const b = new PassThrough();
const output = fs.createWriteStream('./stdout.log', { 'flags': 'a+' });
b.pipe(process.stdout);
b.pipe(output);
var liner = new stream.Transform()
liner.pipe(b);
liner._transform = function (chunk, encoding, done) {
     this.push("[" + (Date.now() - startTime)/1000 + "] " + chunk.toString())
		 done()
}
const console = new Console({ stdout: liner, stderr: liner });
console.log("Start Time: " + startTime);
if (!fs.existsSync(watchlistJSON)) fs.writeFileSync(watchlistJSON, "{}");
if (!fs.existsSync(reportBansJSON)) fs.writeFileSync(reportBansJSON, "{}");
if (!fs.existsSync(staffListJSON)) fs.writeFileSync(staffListJSON, "{}");


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

try {
	staffList = JSON.parse(fs.readFileSync(staffListJSON));
} catch (e) {
	console.log("Error in staffList JSON file, please check the file.\n"+e);
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
	if (config.reasonTimeout == null || config.reasonTimeout == "") {console.log("Missing Reason Request Timeout in Configs!"); err = 1;}
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

var staffRole;

//Create Discord bot object and login
var bot = new Discord.Client();
console.log("Connecting to discord...");
bot.on("debug", onDebug);
bot.login(config.botAuthToken).catch(e => {console.log("Failure connecting to discord!", e); setTimeout(restartBot, 5000);});

function onDebug (e) {
	if (e.indexOf("Sending a heartbeat") > -1 || e.indexOf("Heartbeat acknowledged,") > -1) return;
	if (e.indexOf('READY ["') > -1) return;
	if (e.indexOf('RESUMED ["') > -1) return console.log("Session RESUMED");
	if (e.indexOf('Attemping to reconnect in') > -1) return;
	if (e.indexOf('Clearing heartbeat interval') > -1) return;
	if (e.indexOf('Connected to gateway') > -1) return;
	if (e.indexOf('Setting a heartbeat interval for') > -1) return;
  if (e.indexOf('Attempting to resume session') > -1) return;
  if (e.indexOf('Session RESUMED') > -1) return;
	if (e.indexOf('Server closed the WebSocket connection') > -1) return;
	if (e.indexOf(config.botAuthToken) > -1) {
		e = e.split(config.botAuthToken).join("[Token Censored]");
	}
	console.log(e);
	if (e.indexOf("Using gateway") > -1) {
		process.nextTick(function () {
			bot.ws.connection.client.removeAllListeners("error");
			bot.ws.connection.client.on("error", (e) => {
				console.log("Critical websocket Failure.");
				restartBot();
			});
		});
	}
}

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
		//console.error(e);
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
        //console.log(error);
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
	var messages = await channel.fetchMessages().catch(e => {console.log("Error getting messages for bulk!"); return restartBot()});
	await channel.bulkDelete(messages);
	channel.send(mess).then(message => servers[channel.customId].message = message.id);
}

//when discord bot ready
bot.on("ready", botReady);

function botReady () {
	restarting = false;
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
			console.log("WARNING: Server reports channel not found! Disabling reports..");
			servers.reports = null;
		} else {
			flushReports(rchannel);
			servers.reports = true;
		}
	} else {
		console.log("INFO: Reports Disabled");
	}
  if (config.staffRole != null) {
    bot.guilds.every(function (guild) {
      var role = guild.roles.get(config.staffRole);
      if (role != null) {
        console.log("Staff role found");
        staffRole = role;
      } else {
        console.log("Cheater Flagging disabled, staff Role not found in server.");
      }
    });
  } else {
    console.log("Cheater Flagging disabled, staffRole not found in config.");
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
        if (channel == null) {
          servers[i].message = -1;
					console.log("Error, couldn't find server channel for update, refreshing server " + servers[i].id)
          restartBot();
					continue;
        }
				channel.customId = servers[i].id;
				var message = channel.messages.get(servers[i].message);
				if (message == null) {
					servers[i].message = -1;
					primeChannel(channel);
					console.log("Error, couldn't find editable message for update, refreshing server " + servers[i].id)
					continue;
				}
				message.edit(embed).catch((e) => {if (e.code == "ECONNRESET") restartBot()});
				for (th = message._edits.length-1; th >= 1; th--) delete message._edits.splice(th, 1);
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
				for (th = message._edits.length-1; th >= 1; th--) delete message._edits.splice(th, 1);
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
      } else if (reasonRequests[message.author.id] != null) {
				reasonRequests[message.author.id].handleMess(message);
			}
  }

	if (message.channel.id != config.watchlistChannel) return;

	// To lower case to prevent being case sensitive
  var cmd = message.content.toLowerCase();

	if (cmd == (config.discordBotPrefix + "reload")) {
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
                staff: message.author.username,
								date: Date.now()
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
				var split = cmd.split(" ");
				if (split.length < 2) return;
				var steamid = split[1].trim();
        // Check if the json file data contains the SteamID64 provided
        if (watchlistData.hasOwnProperty(steamid)) {
            // If so, parse the data and send it in a neat format using Discord Rich Embed
            var data = watchlistData[steamid];
						var emb = new Discord.RichEmbed()
	            .setColor('#0099ff')
              .setAuthor(message.guild.name + ' Watchlist', message.guild.iconURL)
              .setThumbnail('https://i.imgur.com/NLbIUZk.png')
              .addField('Player', "[" + await GetName(steamid) + " (" + steamid + ")](https://steamcommunity.com/profiles/" + steamid + ")")
              .addField('Discipline', data.discipline, true)
              .addField('Staff Member', data.staff, true)
							.addField('Reason', data.reason)
              .setFooter('Watchlist by Cyanox & Mitzey');
						if (data.date != null) emb.setTimestamp(data.date);
            message.channel.send(emb);
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
	else if (cmd.startsWith(config.discordBotPrefix + "memory")) {
		var t = process.memoryUsage()
		var full = "```";
		for (i in t) full += i + ": " + ( Math.round(t[i] / 1024 / 1024 * 100) / 100 + "MB ");
		full += "```";
		message.channel.send(full);
	}
}

bot.on("message", botMessage);

var activeReactions = {};

function onReaction (messageReaction, user) {
	if (activeReactions[messageReaction.message.id]) activeReactions[messageReaction.message.id].handle(messageReaction, user);
	if (reasonRequests[user.id]) reasonRequests[user.id].handle(messageReaction, user);
}

bot.on("messageReactionAdd", onReaction);

function onMessageDelete (message) {
	if (activeReactions[message.id]) activeReactions[message.id].destroy();
}

bot.on("messageDelete", onMessageDelete);

bot.on("messageUpdate", onMessageUpdate)

function onMessageUpdate (old, newm) {
	if (reasonRequests[newm.author.id]) {
		if (reasonRequests[newm.author.id].lastWatch == old.id) reasonRequests[newm.author.id].handleMess(newm);
	}
}

function onBotError (e) {
	restarting = false;
	console.log("Discord bot error: ", e);
	restartBot();
}

bot.on("error", onBotError);

function onShardError (e) {
	restarting = false;
	console.error('Websocket connection error:', error);
	restartBot();
}

bot.on('shardError', onShardError);

async function flushReports (channel) {
	var mess = new Discord.RichEmbed().setColor('#0099ff').setTitle('Loading..');
	var messages = await channel.fetchMessages();
	channel.bulkDelete(messages);
}

function createReactionReport (server, user, reason) {
	if (servers.reports != true) return -1; //Reports are disabled, -1
	if (reportBans[user.steamid] == true) return -2; //User is banned, -2
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
		var o = {}; o.type = "REPORT"; o.sendto = this.user.steamid; o.resp = 1; o = JSON.stringify(o);
		if (this.server.socket) this.server.socket.write(o);
		//this.destroy();
	}

	report.ban = function () {
		reportBans[this.user.steamid] = true;
		fs.writeFile(reportBansJSON, JSON.stringify(reportBans, null, 4), err => {
			if (err) throw err;
		});
		var o = {}; o.type = "REPORT"; o.sendto = this.user.steamid; o.resp = -3; o = JSON.stringify(o);
		if (this.server.socket) this.server.socket.write(o);
		this.destroy();
		for (i in activeReactions) if (activeReactions[i].user.steamid == this.user.steamid && activeReactions[i].destroyed == false) activeReactions[i].destroy();
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
		.setAuthor(guild.name + ' Report - ' + (server.name || server.id), guild.iconURL)
		.setThumbnail('https://i.imgur.com/NLbIUZk.png')
		.addField('Sender', "[" + user.name + " (" + report.user.steamid + ")](https://steamcommunity.com/profiles/" + report.user.steamid + ")")
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

var reasonRequests = {};

function len (o) {
	var count = 0;
	for (i in o) count++;
	return count;
}

function initReasonRequestUser (id) {
	var o = {};
	o.userID = id;
	o.requests = {};

	o.timeout = function () {
		if (this.stop) return;
		if (this.requests.length > 0) {
			var t = this.requests.shift();
			t.destroy();
			this.updateReqs();
		} else {
			this.destroy();
			delete reasonRequests[o.userID];
		}
		this.reset();
	}.bind(o);

	o.timer = setTimeout(o.timeout, config.reasonTimeout*1000);

	o.reset = function () {
		if (this.stop) return;
		clearTimeout(this.timer);
		this.timer = setTimeout(this.timeout, config.reasonTimeout*1000);
	}.bind(o);

	o.updateReqs = function () {
		if (len(this.requests) == 0 && this.stop != true) return this.destroy();
		var oldest;
		for (i in this.requests) {
			var r = this.requests[i];
			if (oldest == null) oldest = r;
			if (oldest.issueTime > r.issueTime) oldest = r;
		}
		if (oldest != null) oldest.active = true;
		for (i in this.requests) {
			if (i == 0) continue;
			var r = this.requests[i];
			if (r.active && r.id != oldest.id) {
				r.active = false;
				r.update();
			}
			if (r.message == null) this.requests[i].update();
		}
	}.bind(o);

	o.handle = function (messageReaction, user) {
		this.reset();
		if (this.stop) return;
		for (i in this.requests) {
			var r = this.requests[i];
			if (r.message.id == messageReaction.message.id) {
				r.handle(messageReaction, user);
				break;
			}
		}
	}.bind(o);

	o.lastWatch = null;

	o.handleMess = function (message) {
		console.log("Got reason message from " + message.author.username + " @ " + Date.now());
		if (this.stop) return console.log("Message Handle Cancel");
		this.reset();
		o.lastWatch = message.id;
		for (i in this.requests) {
			var r = this.requests[i];
			if (r.active) {
				r.reason = message.content;
				r.state = 1;
				r.update();
				r.message.react("✅").catch((e) => {/*ignore reaction failures*/});
				break;
			}
		}
	}.bind(o);

	o.deleteReqId = function (id) {
		if (id == null) return;
		for (i in this.requests) if (this.requests[i].id == id) delete this.requests[i];
	}.bind(o);

	o.destroy = function () {
		if (this.stop) return;
		this.stop = true;
		for (i in this.requests) {
			this.requests[i].destroy();
			if (this.requests[i] != null) this.deleteReqId(this.requests[i].id);
		}
		clearTimeout(this.timer);
		delete reasonRequests[this.userID];
	}.bind(o);

	return o;
}

var rRtSts = ["Please enter your reason for this ", "Please verify that the following is correct"];

async function generateReasonRequestEmbed (info, reason, user, issuer, active) {
	var t;
	if (info.type == "Ban") {
		if (info.time == 0) t = info.type;
		else t = info.time + " " + info.type;
	} else {
		t = info.type;
	}

	var color;
	if (active) color = '#0099ff';
	else color = '#36393f';
	var embed = new Discord.RichEmbed()
		.setColor(color)
		.setAuthor(info.guild.name + ' Watchlist', info.guild.iconURL)
		.setThumbnail('https://i.imgur.com/NLbIUZk.png')
		.addField('Player', "[" + await GetName(user.steamid) + " (" + user.steamid + ")](https://steamcommunity.com/profiles/" + user.steamid + ")")
		.addField('Discipline',	t, true)
		.addField('Staff Member', issuer.discordUser.username, true)
		.setTimestamp()
		.setFooter('Watchlist by Cyanox & Mitzey');
		if (reason) {
			embed.addField('Reason', reason);
		}
		return embed;
}

async function printWatchlist (steamid) {
	var data = watchlistData[steamid];
	var watchlistChannel = bot.channels.get(config.watchlistChannel);
	var emb = new Discord.RichEmbed()
		.setColor('#0099ff')
		.setAuthor(watchlistChannel.guild.name + ' Watchlist', watchlistChannel.guild.iconURL)
		.setThumbnail('https://i.imgur.com/NLbIUZk.png')
		.addField('Player', "[" + await GetName(steamid) + " (" + steamid + ")](https://steamcommunity.com/profiles/" + steamid + ")")
		.addField('Discipline', data.discipline, true)
		.addField('Staff Member', data.staff, true)
		.addField('Reason', data.reason)
		.setFooter('Watchlist by Cyanox & Mitzey');
	if (data.date != null) emb.setTimestamp(data.date);
	watchlistChannel.send(emb);
}

function createReasonRequest (user, issuer, info) {
	var reasonReq = {};
	reasonReq.info = info;
	reasonReq.id = (new Date().getTime()).toString() + "-" + user.steamid + "-" + Math.floor(Math.random()*9999999999+1000000000);
	reasonReq.issueTime = new Date().getTime();
	reasonReq.user = user;
	reasonReq.issuer = issuer;
	reasonReq.state = 0; //0 = waiting for input, 1 = verification
	reasonReq.active = false;
	reasonReq.message = null;
	reasonReq.info.guild = bot.channels.get(config.reportsChannel).guild;

	console.log("Generated reason request " + reasonReq.id);

	if (staffList[reasonReq.issuer.steamid] == null) return console.log("Steam ID (" + reasonReq.issuer.steamid + ") not configured, reason request failed.");
	reasonReq.discordUser = bot.users.get(staffList[reasonReq.issuer.steamid]);

  reasonReq.issuer.discordUser = reasonReq.discordUser;

  if (watchlistData[reasonReq.user.steamid] != null && watchlistData[reasonReq.user.steamid].reason != null) {
    reasonReq.reason = watchlistData[reasonReq.user.steamid].reason;
  }

	if (reasonRequests[reasonReq.discordUser.id] == null) {
		reasonRequests[reasonReq.discordUser.id] = initReasonRequestUser(reasonReq.discordUser.id);
	}

	reasonReqAcc = reasonRequests[reasonReq.discordUser.id];
	reasonReqAcc.requests[reasonReq.id] = reasonReq;

	//Reaction Handler
	reasonReq.handle = function (messageReaction, user) {
		if (user.id != bot.user.id) {
			if (messageReaction.emoji.name == "✅") {
				this.accept();
			} else if (messageReaction.emoji.name == '🚫') {
				this.destroy();
			}
		}
	}.bind(reasonReq);

	reasonReq.update = async function () {
		if (this.message == null) {
			this.discordUser.send("`Incoming Reason Request`").then(function (message) {
				message.react("🚫").catch((e) => {message.react("🚫")});
				this.message = message
				this.update();
			}.bind(this));
			return;
		}

		var embed = await generateReasonRequestEmbed(this.info, this.reason, this.user,	this.issuer, this.active);
		var active = "";
		var middle = "";
		if (this.active) active = "[Selected] ";
		if (this.state == 0) {
			middle = rRtSts[this.state] + this.info.type;
		} else {
			middle = rRtSts[this.state];
		}

		this.message.edit("`" + active + middle + "`", embed).catch(e => {console.log("Failed Setting Message Edit")});
		for (th = this.message._edits.length-1; th >= 1; th--) delete this.message._edits.splice(th, 1);

	}.bind(reasonReq);

	reasonReq.accept = function () {
		if (reasonReq.state == 1) {
				reasonRequests[this.discordUser.id].lastWatch = null;

				var discipline;
				if (this.info.type == "Ban") {
					if (this.info.time == 0) discipline = this.info.type;
					else discipline = this.info.time + " " + this.info.type;
				} else {
					discipline = this.info.type;
				}
				watchlistData[this.user.steamid] = {
						discipline: discipline,
						reason: this.reason,
						staff: this.discordUser.username,
						date: Date.now()
				}

				// Write the change to the json file
				fs.writeFile(watchlistJSON, JSON.stringify(watchlistData, null, 4), err => {
						if (err) throw err;
				});

				printWatchlist(this.user.steamid);

				this.message.edit("", new Discord.RichEmbed().setTitle(":white_check_mark: Watchlist Entry added")).then(function () {
					this.destroy(2500);
				}.bind(this));
				for (th = this.message._edits.length-1; th >= 1; th-- ) delete this.message._edits.splice(th, 1);
			}
	}.bind(reasonReq);

	reasonReq.destroy = function (reasonReqAcc, timeout) {
		this.message.delete(timeout);
		reasonReqAcc.deleteReqId(this.id);
		reasonReqAcc.updateReqs();
	}.bind(reasonReq, reasonReqAcc);

	reasonReqAcc.updateReqs();
	reasonReqAcc.reset();
}

var restarting = false;

//Function to restart the discord bot but maintain all other functionality.
function restartBot () {
	if (restarting) return console.log("Restart Blocked");
	restarting = true;
	console.log("Rebuilding bot..");
	for (x in servers) servers[x].presenting = null;
	for (i in servers) if (servers[i].message != null) servers[i].message = -1;
	bot.removeAllListeners("ready");
	bot.removeAllListeners("message");
	bot.removeAllListeners("messageReactionAdd");
	bot.removeAllListeners("messageDelete");
	bot.removeAllListeners("error");
	bot.removeAllListeners("messageUpdate")
	bot.removeAllListeners('shardError');
	bot.removeAllListeners("debug");
	bot.destroy().then(function () {
		delete bot;
		bot = new Discord.Client();
		bot.on("ready", botReady);
		bot.on("message", botMessage);
		bot.on("messageReactionAdd", onReaction);
		bot.on("messageDelete", onMessageDelete);
		bot.on("error", onBotError);
		bot.on("debug", onDebug);
		bot.on("messageUpdate", onMessageUpdate)
		bot.on('shardError', onShardError);
		console.log("Connecting to discord...");
		bot.login(config.botAuthToken).catch(e => {console.log("Failure reconnecting to discord!", e); setTimeout(restartBot, 5000); restarting = false;});
	}).catch(e => {
    console.log("Error destroying bot: ", e);
    delete bot;
		bot = new Discord.Client();
		bot.on("ready", botReady);
		bot.on("message", botMessage);
		bot.on("messageReactionAdd", onReaction);
		bot.on("messageDelete", onMessageDelete);
		bot.on("error", onBotError);
		bot.on("debug", onDebug);
		bot.on("messageUpdate", onMessageUpdate)
		bot.on('shardError', onShardError);
		console.log("Connecting to discord...");
		bot.login(config.botAuthToken).catch(e => {console.log("Failure reconnecting to discord!", e); setTimeout(restartBot, 5000); restarting = false;});
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
		if (!this.destroyed) this.destroy();
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
			var o = {}; o.type = "REPORT"; o.sendto = data.sender.steamid; o.resp = resp; o = JSON.stringify(o);
			this.write(o);
		} else if (data.type == "BAN") {
			var info = {};
			info.type = "Ban";
			info.time = data.time;
			if (info.time == 0) info.type = "Kick";
			createReasonRequest(data.user, data.issuer, info)
			//data.time == 0 for kicks
		} else if (data.type == "MUTE") {
			var info = {};
			info.type = "Mute";
			createReasonRequest(data.user, data.issuer, info)
		} else if (data.type == "CHEATFLAG") {
      if (staffRole == null) return;
      //data.code => 0 = NONE, 1 = noclip, 2 = godmode
      createCheaterReport(servers[this.authed], data);
    }
	}
}

var configuredCheats = ["NONE", "Noclip Hacks", "Godmode Hacks"];

async function createCheaterReport (server, data) {
  if (staffRole == null) return;
  var channel = bot.channels.get(config.watchlistChannel);
  var embed = new Discord.RichEmbed()
    .setColor('#a83232')
    .setAuthor(channel.guild.name + ' Cheater Report - ' + (server.name || server.id), channel.guild.iconURL)
    .setThumbnail('https://i.imgur.com/NLbIUZk.png')
    .addField('Player', "[" + await GetName(data.player.steamid) + " (" + data.player.steamid + ")](https://steamcommunity.com/profiles/" + data.player.steamid + ")")
    .addField('Cheat Suspected', configuredCheats[data.code], true)
    .setTimestamp()
    .setFooter('Watchlist by Cyanox & Mitzey');
  channel.send(staffRole + " Suspected Cheater report", embed);
}

function printMemory () {
	console.log("-------Memory Check-------");
	var t = process.memoryUsage()
	for (i in t) console.log(i, Math.round(t[i] / 1024 / 1024 * 100)/100 + "MB");
}

printMemory();

setInterval(printMemory, 60000*60);

//Catch any TCP server Errors
tcpServer.on("error", async function(e) {
    if (e.code === "EADDRINUSE") {
        console.log("Error: Could not bind to port " + config.tcpPort + ", is it already in use?");
    } else {
        console.log(e);
    }
    process.exit(1);
});

// Debugging to catch any errors I need to find and patch
process.on('uncaughtException', function(err) {
  console.log('Caught process critical exception "' + err.code + '": ' + err.stack);
  if (err.stack && err.stack.error) {
    console.log("Nested Error:", err.stack.error);
    if (err.stack.error.code == "ETIMEDOUT") return restartBot();
  }
	if (err.code == 'ETIMEDOUT') return restartBot();
	if (err.code == 'socket hang up') return restartBot();
  process.exit(1);
});

process.on('unhandledRejection', function (err) {
	console.log('Caught promise rejection: ' + err.stack);
});
