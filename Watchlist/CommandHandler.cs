using Smod2;
using Smod2.Commands;

namespace Watchlist
{
	class CommandHandler : ICommandHandler
	{
		public string GetCommandDescription()
		{
			return "";
		}

		public string GetUsage()
		{
			return "";
		}

		public string[] OnCall(ICommandSender sender, string[] args)
		{
			return new[] { "" };
		}
	}
}
