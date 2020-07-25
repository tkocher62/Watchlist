using Watchlist.DataObjects;

namespace Watchlist
{
	partial class EventHandlers
	{
		private int[] div = { 60, 24, 30, 12 };
		private string[] suffix = { "m", "h", "d", "mon", "y" };

		private User PlyToUser(Exiled.API.Features.Player player)
		{
			return new User
			{
				name = player.Nickname,
				steamid = player.UserId.Replace("@steam", "")
			};
		}
	}
}
