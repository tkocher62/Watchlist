using Watchlist.DataObjects;

namespace Watchlist
{
	partial class EventHandlers
	{
		private int[] div = { 60, 24, 30, 12 };
		private string[] suffix = { "m", "h", "d", "mon", "y" };

		private User HubToUser(ReferenceHub hub)
		{
			return new User
			{
				name = hub.nicknameSync.Network_myNickSync,
				steamid = hub.characterClassManager.UserId.Replace("@steam", "")
			};
		}
	}
}
