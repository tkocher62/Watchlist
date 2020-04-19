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
			else if (cmd.StartsWith("ban"))
			{
				Log.Warn("ban command ran");
				string[] split = cmd.Replace("ban", "").Split('.');

				if (int.TryParse(split[0].Trim(), out int pid))
				{
					Log.Warn("got player");
					ReferenceHub player = Player.GetPlayer(pid);

					if (int.TryParse(split[1].Trim(), out int t))
					{
						Log.Warn("parsed");
						if (t == 0)
						{
							Log.Warn("was kick, sending data");
							tcp.SendData(new Ban()
							{
								time = "0",
								issuer = HubToUser(pSender),
								user = HubToUser(player)
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
								issuer = HubToUser(pSender),
								user = HubToUser(player)
							});
						}
					}
				}
			}
			else if (cmd.StartsWith("mute"))
			{
				if (int.TryParse(cmd.Replace("mute", "").Replace(".", "").Trim(), out int pid))
				{
					ReferenceHub player = Player.GetPlayer(pid);

					tcp.SendData(new Mute()
					{
						issuer = HubToUser(pSender),
						user = HubToUser(player)
					});
				}
			}
		}

		public void OnConsoleCommand(ConsoleCommandEvent ev)
		{
			string cmd = ev.Command.ToLower();
			if (cmd.StartsWith("report"))
			{
				string msg = cmd.Substring(cmd.IndexOf("report") + 7).Trim();

				Report report = new Report
				{
					sender = HubToUser(ev.Player),
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
