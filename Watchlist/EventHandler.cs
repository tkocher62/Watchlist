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
		// Define state variables
		private readonly Plugin instance;
		public static Socket socket;
		private const string delim = ">>;?273::::93377JJS";

		public EventHandler(Plugin plugin)
		{
			// Initialize state variables and attempt a connection to the bot
			instance = plugin;
			socket = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
			socket.Connect("127.0.0.1", 9090);
		}

		// A method that pings the server to check if a socket is still connected
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

		// This method checks for a players SteamID64 in the directory of bans, returns true if they're banned from using the system, false otherwise
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

		// The event for when a player joins the server. Every time someone connectes, we verify we're connected to the server.
		// If so, we send a packet with the players SteamID64 under the WATCHLIST command for handling on the bots end
		public void OnPlayerJoin(PlayerJoinEvent ev)
		{
			if (IsConnected())
			{
				socket.Send(Encoding.UTF8.GetBytes($"WATCHLIST{delim}{ev.Player.SteamId}{delim}{instance.Server.Port}"));
			}
		}

		// The event for when a player sends a console command.
		public void OnCallCommand(PlayerCallCommandEvent ev)
		{
			// Non case-sensitive
			string cmd = ev.Command.ToLower();
			// If a staff member wants to lookup a player in game they can do so as long as they have admin privileges
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
						// If we entered a valid player, use a JSON library to parse the json file data and check for the target
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
				}
			}
			// The report command
			else if (cmd.StartsWith("report"))
			{
				// Check if the player is banned before letting them send a report using the above method
				if (!isPlayerBanned(ev.Player))
				{
					string msg = cmd.Replace("report", "").Trim();
					if (msg.Length > 0)
					{
						// If we specified a valid player, it will send a packet to the server under the REPORT command with all the needed data
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
