using Smod2.Attributes;
using System.IO;

namespace Watchlist
{
	[PluginDetails(
	author = "Cyanox",
	name = "Watchlist",
	description = "Informs discord staff when a trouble maker enters the server.",
	id = "cyan.watchlist",
	version = "1.0.0",
	SmodMajor = 3,
	SmodMinor = 0,
	SmodRevision = 0
	)]
	public class Plugin : Smod2.Plugin
	{
		public static string ConfigFolerFilePath = $"{FileManager.GetAppFolder()}Watchlist";
		public static string WatchlistFilePath = $"{ConfigFolerFilePath}{Path.DirectorySeparatorChar}watchlist.json";
		public static string ReportBanFolder = $"{ConfigFolerFilePath}{Path.DirectorySeparatorChar}ReportBans";

		public override void OnDisable() { }

		public override void OnEnable()
		{
			if (!Directory.Exists(ConfigFolerFilePath))
			{
				Directory.CreateDirectory(ConfigFolerFilePath);
			}
			if (!File.Exists(WatchlistFilePath))
			{
				File.Create(WatchlistFilePath);
				File.WriteAllText(WatchlistFilePath, "{}");
			}
			if (!Directory.Exists(ReportBanFolder))
			{
				Directory.CreateDirectory(ReportBanFolder);
			}
		}

		public override void Register()
		{
			AddEventHandlers(new EventHandler(this));
			AddCommand("wreconnect", new ReconnectCommand(this));
			AddCommand("wban", new BanCommand());
			AddCommand("wunban", new UnbanCommand());
		}
	}
}
