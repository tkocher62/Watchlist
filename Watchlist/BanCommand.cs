using Smod2.Commands;
using System.IO;

namespace Watchlist
{
	// This is the file to initialize a command into the game

	class BanCommand : ICommandHandler
	{
		public string GetCommandDescription()
		{
			return "Bans a player from using the report system.";
		}

		public string GetUsage()
		{
			return "WBAN (STEAMID)";
		}

		public string[] OnCall(ICommandSender sender, string[] args)
		{
			// Verify the correct directories exist
			if (Directory.Exists(Plugin.ReportBanFolder))
			{
				if (args.Length > 0)
				{
					// If so, parse the SteamID64 as a long
					if (long.TryParse(args[0], out long steamid))
					{
						string file = $"{Plugin.ReportBanFolder}{Path.DirectorySeparatorChar}{steamid}.txt";
						if (!File.Exists(file))
						{
							// If the player is not already banned, create a file under their name to ban them
							File.Create(file);
							return new string[]
							{
							"Player successfully banned."
							};
						}
						else
						{
							return new string[]
							{
							"Player is already banned."
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
