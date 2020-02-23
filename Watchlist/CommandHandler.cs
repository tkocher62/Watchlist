using EXILED;
using EXILED.Extensions;
using Newtonsoft.Json.Linq;
using System;
using System.Linq;
using Watchlist.DataObjects;

namespace Watchlist
{
	class CommandHandler
	{
		public static void HandleCommand(JObject o)
		{
			try
			{
				string type = (string)o["type"];
				if (type == "IDENT")
				{
					if ((string)o["data"] == "PASS") Log.Debug($"Server {ServerConsole.Port} passed identification.");
					else if ((string)o["data"] == "FAIL") Log.Warn($"Server {ServerConsole.Port} failed identification.");
				}
				else if (type == "UPDATE")
				{
					EventHandlers.tcp.SendData(new Update()
					{
						playerList = Player.GetHubs().Where(x => x.characterClassManager.UserId != null).Select(x => new User()
						{
							name = x.nicknameSync.Network_myNickSync,
							steamid = x.characterClassManager.UserId.Replace("@steam", "")//.Replace("@discord", "")
						}).ToArray()
					});
				}
				else if (type == "REPORT" && o["resp"] != null)
				{
					ReferenceHub player = Player.GetPlayer($"{(string)o["sendto"]}@steam");
					int resp = (int)o["resp"];
					if (resp == 1) player.Broadcast(3, "<i>Your report has been read by a staff member.</i>");
					else if (resp == 0) player.GetComponent<GameConsoleTransmission>().SendToClient(player.scp079PlayerScript.connectionToClient, "Report sent to the staff team.", "green");
					else if (resp == -1) player.GetComponent<GameConsoleTransmission>().SendToClient(player.scp079PlayerScript.connectionToClient, "Reports are currently disabled.", "yellow");
					else if (resp == -2) player.GetComponent<GameConsoleTransmission>().SendToClient(player.scp079PlayerScript.connectionToClient, "You have been banned from using the report system.", "red");
					else if (resp == -3) player.Broadcast(3, "<i>You have been banned from using the report system.</i>");
				}
				else if (type == "LOOKUP")
				{
					ReferenceHub player = Player.GetPlayer($"{(string)o["sender"]}@steam");
					if (o["report"] != null)
					{
						player.queryProcessor.TargetReply(player.scp079PlayerScript.connectionToClient,
							$"Watchlist#Watchlist Player Lookup\n" +
								$"Player - {player.nicknameSync.Network_myNickSync} ({player.characterClassManager.UserId.Replace("@steam", "")})\n" +
								$"Discipline - {o["report"]["discipline"]}\n" +
								$"Reason - {o["report"]["reason"]}\n" +
								$"Staff Member - {o["report"]["staff"]}",
							true, true, string.Empty);
					}
					else
					{
						player.queryProcessor.TargetReply(player.scp079PlayerScript.connectionToClient, "Watchlist#Player not found in watchlist.", false, true, string.Empty);
					}
				}
			} 
			catch (Exception x)
			{
				Log.Error("Watchlist handle command error: " + x.Message);
			}
		}
	}
}
