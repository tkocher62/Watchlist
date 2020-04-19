const tcpConnection = require("net").connect({port: 9090, host: "localhost"});
var id = "8989"; //Or 8990
var slots = 32;
var playerList = [];

tcpConnection.on("close", function () {
	console.log("Connection Closed!");
});

tcpConnection.on("error", function (e) {
	console.log("Connection Error!\n"+e);
});

tcpConnection.on("connect", function () {
	tcpConnection.setEncoding("utf8");
	console.log("Connection Open!");
	tcpConnection.on("data", onBotMessage);
	console.log("Sending ID..");
	tcpConnection.write(JSON.stringify({type: "IDENT", data: id, maxUsers: slots}));
});

var unusedPlayers = [
{name: "Parker", steamid: "76561198255288564"},
{name: "Livsteamid", steamid: "76561198237877890"},
{name: "guacamole72", steamid: "76561198082005439"},
{name: "PlayingJokes", steamid: "76561198105873752"},
{name: "carter", steamid: "76561198177935942"},
{name: "muy caliente", steamid: "76561198180947955"},
{name: "Raw Dawg", steamid: "76561198072303761"},
{name: "Brissel", steamid: "76561198110864653"},
{name: "bastard", steamid: "76561198256571341"},
{name: "Mozerelli", steamid: "76561198027292740"},
{name: "mcbitch", steamid: "76561198047177540"},
{name: "Luke E. Meia", steamid: "76561198059074253"},
{name: "ben", steamid: "76561198296202212"},
{name: "The Drizzle", steamid: "76561198125330420"},
{name: "Vorishun", steamid: "76561198045117336"},
{name: "Scinata", steamid: "76561198014352932"},
{name: "NinjazComing", steamid: "76561198056616187"},
{name: "Kitty", steamid: "76561198051075989"},
{name: "nutmeg0425", steamid: "76561198260305389"},
{name: "Pablo the E-Thug", steamid: "76561198081353565"},
{name: "i am throwing", steamid: "76561198009278408"},
{name: "ImpulsiveBrock", steamid: "76561198057779991"},
{name: "matmoo991", steamid: "76561198066242858"},
{name: "Booker Tos", steamid: "76561198039503694"},
{name: "NEO! | And the Tiger Poster", steamid: "76561198072926324"},
{name: "Fred", steamid: "76561198064941459"},
{name: "Wazoski", steamid: "76561198005368198"},
{name: "SUPEROCHIBA", steamid: "76561198060749625"},
{name: "WalmartManager7", steamid: "76561198008711927"},
{name: "Sarcolemma", steamid: "76561198028540136"},
{name: "Zorkon", steamid: "76561198037150320"},
{name: "Jungle Turtle", steamid: "76561198047257804"},
{name: "jin6344", steamid: "76561198063417531"},
{name: "Penguin", steamid: "76561198012589911"},
{name: "Creedy", steamid: "76561198051901400"},
{name: "Ekip", steamid: "76561197965198948"},
{name: "Luxtan", steamid: "76561198055108710"},
{name: "Nick Graves", steamid: "76561198021917714"},
{name: "Optical_1", steamid: "76561198040464849"},
{name: "jork", steamid: "76561198007525011"},
{name: "Agility Bonus", steamid: "76561198004705310"},
{name: "Commander Retard", steamid: "76561198153242980"},
{name: "kombatking79 ", steamid: "76561198090467184"},
{name: "apex619", steamid: "76561198976049643"},
{name: "Echo", steamid: "76561198069225952"},
{name: "LikexxAxxBoss112", steamid: "76561198199016618"},
{name: "Utopian", steamid: "76561198802199437"},
{name: "Weezer (Blue Album)", steamid: "76561198043624248"},
{name: "AstolfoLover69", steamid: "76561198113227169"},
{name: "Jack The Snacc", steamid: "76561198209064007"}
];

function pullID () {
	var i = Math.round(Math.random()*(unusedPlayers.length-1));
	return unusedPlayers.splice(i,1)[0];
}

function triggerPlayerJoin () {
	if (unusedPlayers.length == 0) return;
	var profile = pullID();
	console.log(profile.name + " - (" + profile.steamid + ") Joined the server");
	playerList.push(profile);
}

function triggerPlayerLeave () {
	if (playerList.length == 0) return;
	var i = Math.round(Math.random()*(playerList.length-1));
	var d = playerList.splice(i,1)[0];
	console.log(d.name + " - (" + d.steamid + ") Left the server");
	unusedPlayers.push(d);
}

function trigger () {
	if (Math.round(Math.random()*1) >= 0.05) {
		triggerPlayerJoin();
	} else {
		triggerPlayerLeave();
	}
}

setInterval(trigger, 5000);

setTimeout(function () {
	var i = Math.round(Math.random()*(playerList.length-1));
	var o = {}; o.type = "BAN"; o.issuer = {name: "Mitzey234", steamid: "76561198040083118"};
	o.user = playerList[i]; o.time = "0"; o = JSON.stringify(o);
	tcpConnection.write(o);
}, 3000);

var max = 22;

var int = setInterval(function () {
	if (playerList.length >= max) return clearInterval(int);
	triggerPlayerJoin();
},125);

function onBotMessage (data) {
	try {
		data = JSON.parse(data);
	} catch (e) {
		console.log("Parse Error!\n"+e);
		return;
	}
	if (data.type == "IDENT") {
		if (data.data == "PASS") {
			console.log("Connected!");
		} else {
			console.log("Failed to connect!");
			this.destroy();
		}
	} else if (data.type == "UPDATE") {
		var o = {}; o.type = "UPDATE"; o.playerList = playerList; o = JSON.stringify(o);
		tcpConnection.write(o);
	} else {
		console.log(data);
	}
}
