using Newtonsoft.Json;
using System.Text;

namespace Watchlist.API
{
	public static class WatchlistNetwork
	{
		public static void SendData(object data)
		{
			Tcp.socket.Send(Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(data)));
		}

		public static void SendData(byte[] data)
		{
			Tcp.socket.Send(data);
		}
	}
}
