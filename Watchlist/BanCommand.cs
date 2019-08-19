using Smod2.Commands;
using System.IO;

namespace Watchlist
{
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
			if (Directory.Exists(Plugin.ReportBanFolder))
			{
				if (long.TryParse(args[0], out long steamid))
				{
					string file = $"{Plugin.ReportBanFolder}{Path.DirectorySeparatorChar}{steamid}.txt";
					if (!File.Exists(file))
					{
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
				return new string[]
				{
					"Error locating config folder."
				};
			}
		}
	}
}
