using Exiled.API.Interfaces;

namespace Watchlist
{
	public class Config : IConfig
	{
		public bool IsEnabled { get; set; } = true;
	}
}
