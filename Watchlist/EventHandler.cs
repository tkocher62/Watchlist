using Smod2.API;
using Smod2;
using Smod2.Events;
using Smod2.EventSystem;
using Smod2.EventHandlers;

namespace Watchlist
{
	class EventHandler : IEventHandlerRoundStart
	{
		private readonly Plugin instance;

		public EventHandler(Plugin plugin) => instance = plugin;

		public void OnRoundStart(RoundStartEvent ev)
		{

		}
	}
}
