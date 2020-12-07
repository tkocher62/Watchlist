# Watchlist
This is a plugin created in collaboration with a friend to keep a database of troublemakers on my game server. The game [SCP: Secret Laboratory](https://store.steampowered.com/app/700330/SCP_Secret_Laboratory/) is a multiplayer game in which every player is assigned an in game role. Naturally, with multiplayer game servers, there are bound to be troublemakers. When a player is punished in any way, this plugin will log that, allowing us to keep track of repeat offenders in an easy and simple way. This plugin communicates with a [Discord](https://discord.com/) bot over TCP networking to allow for integration between the game and the server in which we manage the information.

### Live View
The Discord bot provides a live list of players connected to a server, as well as their standing in Watchlist. If they do not have any logged punishments, they have a check mark next to their name. If they have previous punishments, they have a warning as well as their reason under their entry.

![](https://github.com/tkocher62/Watchlist/blob/exiled/liveview.png)

### User Lookup
If a user is not currently connected to a server, you can lookup an ID through commands. An entry contains the punished player with their punishment, the date in which the punishment was issued, and the issuer.

![](https://github.com/tkocher62/Watchlist/blob/exiled/lookup.png)

### Report System
Another feature added in this plugin was an in game report system. Upon typing a command in game, you are able to send an issue report to the server staff.

![](https://github.com/tkocher62/Watchlist/blob/exiled/report.png)

The staff will then see the output in the following format. Three buttons are added at the bottom and can be used as actions. Pressing the red X will discard the report, pressing the warning sign will ban the user from sending reports, and pressing the check mark will inform the user that their report is being dealt with in game.

![](https://github.com/tkocher62/Watchlist/blob/exiled/reportoutput.png)

For example, if we were to click the check mark, the player that sent the report would see this in their game.

![](https://github.com/tkocher62/Watchlist/blob/exiled/reportread.png)

### Automatic Additions
This plugin automatically handles new entries being added into the database. Upon performing an administrative action on a player in game, the punishment issuer will receive a direct message from the bot asking for their reason for doing so.

![](https://github.com/tkocher62/Watchlist/blob/exiled/ban.png)

The user can then type a reason to be added to the entry.

![](https://github.com/tkocher62/Watchlist/blob/exiled/reason.png)

Finally, the user clicks the check mark to confirm the entry.

![](https://github.com/tkocher62/Watchlist/blob/exiled/entryadded.png)

The bot will then send a confirmation message to log the addition in the main output channel.

![](https://github.com/tkocher62/Watchlist/blob/exiled/confirmation.png)
