using EXILED;
using EXILED.Extensions;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Linq;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using Watchlist.DataObjects;

namespace Watchlist
{
	class Tcp
	{
		private string ip;
		private int port;
		internal static Socket socket;

		public Tcp(string ip, int port)
		{
			this.ip = ip;
			this.port = port;
		}

		public void Init()
		{
			try
			{
				new Thread(AttemptConnection).Start();
			}
			catch (Exception x)
			{
				Log.Warn("Failed to connect to bot.");
			}
		}

		private void AttemptConnection()
		{
			while (!IsConnected())
			{
				try
				{
					socket = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
					socket.Connect(ip, port);

					new Thread(Listen).Start();
					SendData(new Identify());
				}
				catch (Exception x)
				{
					// Failed to connect
					Log.Warn("Failed to connect to Watchlist bot, retrying in 10 seconds...");
				}
				Thread.Sleep(10000);
			}
		}

		private void Listen()
		{
			while (IsConnected())
			{
				try
				{
					byte[] a = new byte[1000];
					socket.Receive(a);
					JObject o = (JObject)JToken.FromObject(JsonConvert.DeserializeObject(Encoding.UTF8.GetString(a)));

					CommandHandler.HandleCommand(o);
				}
				catch (Exception x)
				{
					Log.Error("Watchlist listener error: " + x.Message);
				}
			}
			new Thread(AttemptConnection).Start();
		}

		public void SendData(object data)
		{
			socket.Send(Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(data)));
		}

		public void SendData(byte[] data)
		{
			socket.Send(data);
		}

		public bool IsConnected()
		{
			if (socket == null)
			{
				return false;
			}
			try
			{
				return !((socket.Poll(1000, SelectMode.SelectRead) && (socket.Available == 0)) || !socket.Connected);
			}
			catch (Exception x)
			{
				return false;
			}
		}
	}
}
