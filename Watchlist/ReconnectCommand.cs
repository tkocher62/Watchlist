using Smod2.Commands;
using System.Net.Sockets;

namespace Watchlist
{
	// This command reconnects the plugin to the server if it happens to get disconnected for any reason

	class ReconnectCommand : ICommandHandler
	{
		private Plugin instance;

		public ReconnectCommand(Plugin plugin)
		{
			instance = plugin;
		}

		public string GetCommandDescription()
		{
			return "Reconnects the client to the discord bot.";
		}

		public string GetUsage()
		{
			return "WRECONNECT";
		}

		public string[] OnCall(ICommandSender sender, string[] args)
		{
			EventHandler.socket = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
			EventHandler.socket.Connect("127.0.0.1", 9090);
			if (EventHandler.IsConnected())
			{
				return new string[]
				{
					"Successfully reconnected."
				};
			}
			else
			{
				return new string[]
				{
					"Failed to reconnect."
				};
			}
		}
	}
}
