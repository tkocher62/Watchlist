using EXILED;
using EXILED.Extensions;
using Watchlist.DataObjects;

namespace Watchlist
{
	partial class EventHandlers
	{
		public static Tcp tcp;

		public EventHandlers()
		{
			tcp = new Tcp("127.0.0.1", 9090);
			tcp.Init();
		}

		public void OnPlayerBanned(PlayerBannedEvent ev)
		{
			//ev.Details
		}

		public void OnRACommand(ref RACommandEvent ev)
		{
			string cmd = ev.Command.ToLower();
			ReferenceHub pSender = Player.GetPlayer(ev.Sender.SenderId);
			if (cmd.StartsWith("lookup") && pSender.serverRoles.RemoteAdmin)
			{
				ev.Allow = false;
				string user = cmd.Replace("lookup", "").Trim();
				if (user.Length > 0)
				{
					ReferenceHub player = null;
					if (int.TryParse(user, out int a))
					{
						player = Player.GetPlayer(a);
					}
					else
					{
						player = Player.GetPlayer(user);
					}
					if (player != null)
					{
						tcp.SendData(new Lookup
						{
							sender = Player.GetPlayer(ev.Sender.SenderId).characterClassManager.UserId.Replace("@steam", ""),
							target = player.characterClassManager.UserId.Replace("@steam", "")
						});
					}
					else
					{
						ev.Sender.RAMessage("Invalid player.", false);
					}
				}
				else
				{
					ev.Sender.RAMessage("LOOKUP (NAME / STEAMID / PLAYERID)", false);
					return;
				}
			}
		}

		public void OnConsoleCommand(ConsoleCommandEvent ev)
		{
			string cmd = ev.Command.ToLower();
			if (cmd.StartsWith("report"))
			{
				string msg = cmd.Replace("report", "").Trim();

				Report report = new Report
				{
					sender = new Sender
					{
						name = ev.Player.nicknameSync.Network_myNickSync,
						id = ev.Player.characterClassManager.UserId.Replace("@steam", "")
					},
					report = msg
				};

				if (msg.Length > 0)
				{
					tcp.SendData(report);
					ev.ReturnMessage = "Sending report...";
					ev.Color = "yellow";
				}
				else
				{
					ev.ReturnMessage = "REPORT (MESSAGE)";
				}
			}
		}
	}
}
