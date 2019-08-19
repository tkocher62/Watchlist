using Smod2.API;
using Smod2.Events;
using Smod2.EventHandlers;
using Newtonsoft.Json.Linq;
using System.IO;
using System.Net.Sockets;
using System.Text;
using System;
using UnityEngine;

namespace Watchlist
{
	partial class EventHandler : IEventHandlerPlayerJoin, IEventHandlerCallCommand
	{
		private readonly Plugin instance;
		public static Socket socket;
		private const string delim = ">>;?273::::93377JJS";

		public EventHandler(Plugin plugin)
		{
			instance = plugin;
			socket = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
			socket.Connect("127.0.0.1", 9090);
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

		private bool isPlayerBanned(Player player)
		{
			if (Directory.Exists(Plugin.ReportBanFolder))
			{
				foreach (string file in Directory.GetFiles(Plugin.ReportBanFolder))
				{
					if (file.Replace($"{Plugin.ReportBanFolder}{Path.DirectorySeparatorChar}", "").Replace(".txt", "").Trim() == player.SteamId)
					{
						return true;
					}
				}
			}
			return false;
		}

		public void OnPlayerJoin(PlayerJoinEvent ev)
		{
			if (IsConnected())
			{
				socket.Send(Encoding.UTF8.GetBytes($"WATCHLIST{delim}{ev.Player.SteamId}{delim}{instance.Server.Port}"));
			}
		}

		public void OnCallCommand(PlayerCallCommandEvent ev)
		{
			string cmd = ev.Command.ToLower();
			if (cmd.StartsWith("lookup") && ((GameObject)ev.Player.GetGameObject()).GetComponent<ServerRoles>().RemoteAdmin)
			{
				string user = cmd.Replace("lookup", "").Trim();
				if (user.Length > 0)
				{
					Player myPlayer = null;
					if (int.TryParse(user, out int a))
					{
						myPlayer = GetPlayer(a);
					}
					else if (ulong.TryParse(user, out ulong b))
					{
						myPlayer = GetPlayer(b);
					}
					else
					{
						myPlayer = GetPlayer(user, out myPlayer);
					}
					if (myPlayer != null)
					{
						JObject o = JObject.Parse(File.ReadAllText(Plugin.WatchlistFilePath));
						if (o.ContainsKey(myPlayer.SteamId))
						{
							ev.ReturnMessage = $"Watchlist Player Lookup\n" +
											   $"Player - {myPlayer.Name} ({myPlayer.SteamId})\n" +
											   $"Discipline - {o[ev.Player.SteamId]["discipline"]}\n" +
											   $"Reason - {o[ev.Player.SteamId]["reason"]}\n" +
											   $"Staff Member - {o[ev.Player.SteamId]["staff"]}";
						}
						else
						{
							ev.ReturnMessage = $"Player '{myPlayer.Name}' not found in watchlist.";
						}
					}
					else
					{
						ev.ReturnMessage = "Invalid player.";
					}
				}
				else
				{
					ev.ReturnMessage = "LOOKUP (NAME / STEAMID / PLAYERID)";
					return;
				}
			}
			else if (cmd.StartsWith("report"))
			{
				if (!isPlayerBanned(ev.Player))
				{
					string msg = cmd.Replace("report", "").Trim();
					if (msg.Length > 0)
					{
						socket.Send(Encoding.UTF8.GetBytes($"REPORT{delim}{ev.Player.SteamId}{delim}{instance.Server.Port}{delim}{msg}"));
						ev.ReturnMessage = "Report sent to the staff team.";
					}
					else
					{
						ev.ReturnMessage = "REPORT (MESSAGE)";
					}
				}
				else
				{
					ev.ReturnMessage = "You have been banned from using the report system.";
				}
			}
		}
	}
}
