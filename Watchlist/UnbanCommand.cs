using Smod2.Commands;
using System.IO;

namespace Watchlist
{
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
			if (Directory.Exists(Plugin.ConfigFolerFilePath))
			{
				if (args.Length > 0)
				{
					if (long.TryParse(args[0], out long steamid))
					{
						string file = $"{Plugin.ReportBanFolder}{Path.DirectorySeparatorChar}{steamid}.txt";
						if (File.Exists(file))
						{
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
