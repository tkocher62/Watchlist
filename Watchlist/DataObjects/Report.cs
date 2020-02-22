namespace Watchlist.DataObjects
{
	public class Sender
	{
		public string name;
		public string id;
	}

	public class Report
	{
		public string type = "REPORT";
		public Sender sender;
		public string report;
	}
}
