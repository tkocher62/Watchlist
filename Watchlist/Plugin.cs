using EXILED;
using System;
using System.IO;

namespace Watchlist
{
	public class Plugin : EXILED.Plugin
	{
		private EventHandlers ev;

		public static string ConfigFolerFilePath;
		public static string WatchlistFilePath;

		public override void OnEnable()
		{
			try
			{
				string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
				string pluginPath = Path.Combine(appData, "Plugins");
				string path = Path.Combine(pluginPath, "Watchlist");
				ConfigFolerFilePath = path;
				WatchlistFilePath = Path.Combine(path, "watchlist.json");
				if (!Directory.Exists(ConfigFolerFilePath))
				{
					Directory.CreateDirectory(ConfigFolerFilePath);
				}
				if (!File.Exists(WatchlistFilePath))
				{
					File.WriteAllText(WatchlistFilePath, "{}");
				}
			} catch (Exception x)
			{
				Log.Error($"Error creating file: {x.Message}");
			}

			//EventHandlers
			ev = new EventHandlers();
			Events.PlayerBannedEvent += ev.OnPlayerBanned;
			Events.RemoteAdminCommandEvent += ev.OnRACommand;
			Events.ConsoleCommandEvent += ev.OnConsoleCommand;
		}

		public override void OnDisable()
		{
			Events.PlayerBannedEvent -= ev.OnPlayerBanned;
			Events.RemoteAdminCommandEvent -= ev.OnRACommand;
			Events.ConsoleCommandEvent -= ev.OnConsoleCommand;
			ev = null;
		}

		public override void OnReload() { }

		public override string getName { get; } = "Watchlist";
	}
}
