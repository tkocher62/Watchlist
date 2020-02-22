namespace Watchlist.DataObjects
{
	public class User
	{
		public string name;
		public string steamid;
	}

	public class Update
	{
		public string type = "UPDATE";
		public User[] playerList;
	}
}
