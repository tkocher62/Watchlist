using EXILED;

namespace Watchlist
{
	public class Plugin : EXILED.Plugin
	{
		private EventHandlers ev;

		public override void OnEnable()
		{
			//EventHandlers
			ev = new EventHandlers();
			Events.RemoteAdminCommandEvent += ev.OnRACommand;
			Events.ConsoleCommandEvent += ev.OnConsoleCommand;
		}

		public override void OnDisable()
		{
			Events.RemoteAdminCommandEvent -= ev.OnRACommand;
			Events.ConsoleCommandEvent -= ev.OnConsoleCommand;
			ev = null;
		}

		public override void OnReload() { }

		public override string getName { get; } = "Watchlist";
	}
}
