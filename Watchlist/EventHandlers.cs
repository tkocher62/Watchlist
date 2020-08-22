using Exiled.API.Features;
using Exiled.Events.EventArgs;
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

		public void OnRACommand(SendingRemoteAdminCommandEventArgs ev)
		{
			string cmd = ev.Name.ToLower();
			if (cmd == "lookup" && ev.Sender.ReferenceHub.serverRoles.RemoteAdmin)
			{
				ev.IsAllowed = false;
				if (ev.Arguments.Count == 1)
				{
					if (ev.Arguments[0].Length > 0)
					{
						Player player = null;
						if (int.TryParse(ev.Arguments[0], out int a))
						{
							player = Player.Get(a);
						}
						else
						{
							player = Player.Get(ev.Arguments[0]);
						}
						if (player != null)
						{
							tcp.SendData(new Lookup
							{
								sender = ev.Sender.UserId.Replace("@steam", ""),
								target = player.UserId.Replace("@steam", "")
							});
						}
						else
						{
							ev.Sender.RemoteAdminMessage("Invalid player.", false);
						}
					}
					else
					{
						ev.Sender.RemoteAdminMessage("USAGE: LOOKUP (NAME / STEAMID / PLAYERID)", false);
						return;
					}
				}
				else
				{
					ev.Sender.RemoteAdminMessage("USAGE: LOOKUP (NAME / STEAMID / PLAYERID).", false);
				}
			}
			else if (cmd == "ban")
			{
				if (int.TryParse(ev.Arguments[0].Replace(".", "").Trim(), out int pid))
				{
					Player player = Player.Get(pid);

					if (int.TryParse(ev.Arguments[1].Trim(), out int t))
					{
						if (t == 0)
						{
							tcp.SendData(new Ban()
							{
								time = "0",
								issuer = PlyToUser(ev.Sender),
								user = PlyToUser(player)
							});
						}
						else
						{
							int depth = 0;
							int time = t;
							while (t > 1)
							{
								time = t;
								t /= div[depth];
								if (t > 1) depth++;
							}

							tcp.SendData(new Ban()
							{
								time = time + suffix[depth],
								issuer = PlyToUser(ev.Sender),
								user = PlyToUser(player)
							});
						}
					}
				}
			}
			else if (cmd == "mute")
			{
				if (int.TryParse(ev.Arguments[0].Replace(".", "").Trim(), out int pid))
				{
					Player player = Player.Get(pid);

					tcp.SendData(new Mute()
					{
						issuer = PlyToUser(ev.Sender),
						user = PlyToUser(player)
					});
				}
			}
		}

		public void OnConsoleCommand(SendingConsoleCommandEventArgs ev)
		{
			string cmd = ev.Name.ToLower();
			if (cmd == "report")
			{
				string msg = string.Empty;
				foreach (string s in ev.Arguments) msg += $"{s} ";

				Report report = new Report
				{
					sender = PlyToUser(ev.Player),
					report = msg.Trim()
				};

				if (msg.Length > 0)
				{
					tcp.SendData(report);
					ev.ReturnMessage = "Sending report...";
					ev.Color = "yellow";
				}
				else
				{
					ev.ReturnMessage = "URAGE: REPORT (MESSAGE)";
				}
			}
		}
	}
}
