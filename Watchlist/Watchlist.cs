using Exiled.API.Features;
using Exiled.Events;

namespace Watchlist
{
	public class Watchlist : Plugin<Config>
	{
		private EventHandlers ev;

		public override void OnEnabled()
		{
			base.OnEnabled();

			if (!Config.IsEnabled) return;

			ev = new EventHandlers();

			Exiled.Events.Handlers.Server.SendingRemoteAdminCommand += ev.OnRACommand;
			Exiled.Events.Handlers.Server.SendingConsoleCommand += ev.OnConsoleCommand;
		}

		public override void OnDisabled()
		{
			base.OnDisabled();

			Exiled.Events.Handlers.Server.SendingRemoteAdminCommand -= ev.OnRACommand;
			Exiled.Events.Handlers.Server.SendingConsoleCommand -= ev.OnConsoleCommand;

			ev = null;
		}
	}
}
