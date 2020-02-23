using Newtonsoft.Json.Linq;
using System.IO;
using System.Net.Sockets;
using System.Text;
using System;
using EXILED;
using EXILED.Extensions;
using Newtonsoft.Json;
using Watchlist.DataObjects;
using System.Threading;
using System.Linq;

namespace Watchlist
{
	partial class EventHandlers
	{
		public static Socket socket;

		public EventHandlers()
		{
			Init();
		}

		private void Init()
		{
			try
			{
				new Thread(AttemptConnection).Start();
			} catch (Exception x)
			{
				Log.Warn("Failed to connect to bot.");
			}
		}

		private void AttemptConnection()
		{
			while (!IsConnected())
			{
				try
				{
					socket = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
					socket.Connect("127.0.0.1", 9090);

					new Thread(Listen).Start();
					SendData(new Identify());
				} catch (Exception x)
				{
					// Failed to connect
					Log.Warn("Failed to connect to Watchlist bot, retrying in 5 seconds...");
				}
				Thread.Sleep(5000);
			}
		}

		private void Listen()
		{
			while (IsConnected())
			{
				try
				{
					byte[] a = new byte[1000];
					socket.Receive(a);
					JObject o = (JObject)JToken.FromObject(JsonConvert.DeserializeObject(Encoding.UTF8.GetString(a)));

					string type = (string)o["type"];
					if (type == "IDENT")
					{
						if ((string)o["data"] == "PASS") Log.Debug($"Server {ServerConsole.Port} passed identification.");
						else if ((string)o["data"] == "FAIL") Log.Warn($"Server {ServerConsole.Port} failed identification.");
					}
					else if (type == "UPDATE")
					{
						SendData(new Update()
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
						else if (resp == -2 || resp == -3) player.GetComponent<GameConsoleTransmission>().SendToClient(player.scp079PlayerScript.connectionToClient, "You have been banned from using the report system.", "red");
					}
					else if (type == "LOOKUP")
					{
						ReferenceHub player = Player.GetPlayer($"{(string)o["sender"]}@steam");
						if (o["report"] != null)
						{
							player.queryProcessor.TargetReply(player.scp079PlayerScript.connectionToClient,
								$"Watchlist#Watchlist Player Lookup\n" +
									$"Player - {player.nicknameSync.Network_myNickSync} ({player.characterClassManager.UserId})\n" +
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
				} catch (Exception x)
				{
					Log.Error("Watchlist listener error: " + x.Message);
				}
			}
			new Thread(AttemptConnection).Start();
		}

		private void SendData(object data)
		{
			socket.Send(Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(data)));
		}

		private void SendData(byte[] data)
		{
			socket.Send(data);
		}

		public static bool IsConnected()
		{
			if (socket == null)
			{
				return false;
			}
			try
			{
				return !((socket.Poll(1000, SelectMode.SelectRead) && (socket.Available == 0)) || !socket.Connected);
			}
			catch (Exception x)
			{
				return false;
			}
		}

		public void OnPlayerBan(PlayerBanEvent ev)
		{
			Log.Info("name: " + ev.BannedPlayer.nicknameSync.Network_myNickSync);
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
						SendData(new Lookup
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
					SendData(report);
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
