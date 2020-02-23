using GameCore;

namespace Watchlist.DataObjects
{
	public class Identify
	{
		public string type = "IDENT";
		public int data = ServerConsole.Port;
		public int maxUsers = ConfigFile.ServerConfig.GetInt("max_players");
	}
}
