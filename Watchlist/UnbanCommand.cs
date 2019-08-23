using Smod2.Commands;
using System.IO;

namespace Watchlist
{
	// This is the file to initialize a command into the game

	class UnbanCommand : ICommandHandler
	{
		public string GetCommandDescription()
		{
			return "Unbans a player from using the report system.";
		}

		public string GetUsage()
		{
			return "WUNBAN (STEAMID)";
		}

		public string[] OnCall(ICommandSender sender, string[] args)
		{
			// Verify the correct directories exist
			if (Directory.Exists(Plugin.ConfigFolerFilePath))
			{
				if (args.Length > 0)
				{
					// If so, parse the SteamID64 as a long
					if (long.TryParse(args[0], out long steamid))
					{
						string file = $"{Plugin.ReportBanFolder}{Path.DirectorySeparatorChar}{steamid}.txt";
						if (File.Exists(file))
						{
							// If the player is banned, delete the file to unban them
							File.Delete(file);
							return new string[]
							{
							"Player successfully unbanned."
							};
						}
						else
						{
							return new string[]
							{
							"Player is not banned."
							};
						}
					}
					else
					{
						return new string[]
						{
						"Error parsing SteamID."
						};
					}
				}
				else
				{
					return new[] { GetUsage() };
				}
			}
			else
			{
				return new string[]
				{
					"Error locating config folder."
				};
			}
		}
	}
}
