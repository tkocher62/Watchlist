using Smod2;
using Smod2.API;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace Watchlist
{
	class Tcp
	{
		private EventHandler eHandler;
		private Socket socket;
		public int playerID;
		private string steamID;
		public bool isConnected;
		private Encoding encoding;

		public string splitter = "<EX1D>";

		public void SendMessage(string message, Player player = null) // Send a message to the server
		{
			if (player != null)
			{
				// If its a message use a splitter, otherwise use a cmd
				SendBytes(encoding.GetBytes(player.Name + splitter + message));
			}
			else
			{
				SendBytes(encoding.GetBytes(message));
			}
		}

		public void SendBytes(byte[] bytes) // Send bytes to the server
		{
			socket.Send(bytes);
		}

		private bool SocketConnected(Socket s)
		{
			bool part1 = s.Poll(1000, SelectMode.SelectRead);
			bool part2 = (s.Available == 0);
			if (part1 && part2)
				return false;
			else
				return true;
		}

		private void Listen()
		{
			while (isConnected)
			{
				byte[] a = new byte[1000];
				socket.Receive(a);
				string[] data = Encoding.UTF8.GetString(a).TrimEnd('\0').Split(new string[] { splitter }, StringSplitOptions.None);
				Player p = PluginManager.Manager.Server.GetPlayers().FirstOrDefault(x => x.PlayerId == playerID);
				if (p != null)
				{
					// display stuff
				}
			}
		}

		public void Disconnect()
		{
			if (isConnected)
			{
				socket.Close();
			}
		}

		public Tcp(string hostname = "127.0.0.1", int port = 9090)
		{
			socket = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
			isConnected = false;
			encoding = Encoding.UTF8;

			if (hostname != null && port != -1)
			{
				try
				{
					socket.Connect(hostname, port); // Connect to the server
					Console.WriteLine("Connected to server.");
					if (!SocketConnected(socket)) return;
					new Thread(new ThreadStart(Listen)).Start();
				}
				catch
				{
					Console.WriteLine("Failed to connect to server.");
					isConnected = false;
					return;
				}

				isConnected = true;
			}
		}
	}
}
