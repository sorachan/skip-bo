# Skip-Bo

## how to play

just hit "new game" and you enter a lobby which has an ID. you are now the host.

share that ID with your friends and tell them to hit "join lobby" and paste the ID.

the host waits for everyone to join the lobby and adjusts the player pile size (default: 25, min: 5, max: 30) and starts the game. all players are then redirected to the game view.

enjoy! ^-^

## how to install

just clone the repo and run the app using the web server of your choice.

if you're using gunicorn as the web server, you can use my config:

    gunicorn --worker-class eventlet -w 1 app:app --bind 0.0.0.0:8000

note that you need to `pip install`:
* for Skip-Bo:
  * `APScheduler`
  * `Flask`
  * `flask-socketio`
* for gunicorn:
  * `gunicorn`
  * `eventlet`

### HTTPS

if you want the game to run on an HTTPS domain, you need to configure your web server (Apache, Nginx etc.) to run a reverse proxy to the port that Skip-Bo runs on and you might not want to export that port to the internet, in which case you'd need to change the `--bind` IP from `0.0.0.0` to `127.0.0.1`.

(that is, if you're serving other web sites on your server. if all you're looking to serve is Skip-Bo, just configure `gunicorn` to serve HTTPS on port 443 and ignore the rest of this subsection.)

of course, HTTPS requires getting a SSL certificate first – if you're looking for a free and reliable certificate service, I warmly recommend Let's Encrypt.

for example, if you run `gunicorn` with the argument `--bind 127.0.0.1:8000`, you can set up your web server to reverse proxy connections to `skipbo.foob.ar` to `127.0.0.1:8000` and configure it to not only proxy HTTP(S) requests, but also WebSocket.

that's it, at least in theory. in practice, setting up a reverse proxy that supports WS is a major pain in the arse and I just couldn't get it to run when `gunicorn` was serving HTTP, but I did end up getting it to work using a rather ugly hack:

* configuring `gunicorn` to serve HTTPS as well by adding the `--certfile=<file>` and `--keyfile=<file>` parameters using the same cert files as Apache
  * note that the server should **NOT** ‼️ run as `root`, so you need to tweak the permissions for the key file
  * in my example, I changed the group of the respective directories and files to the `skipbo` user group and set `chmod g+r` for the key file and `chmod g+x` for the directories
* adding `SSLProxyEngine On` to my Apache config
* routing `skipbo.foob.ar` to `127.0.0.1` in my `/etc/hosts`
* proxying `/socket.io` to `wss://skipbo.foob.ar:8000`

I know this setup is ugly AF so if someone can point me to a working Apache reverse proxy configuration that doesn't require `gunicorn` to serve HTTPS, please open an issue and let me know.

## public instance

if you're too lazy or inexperienced to set up your own server, feel free to play a match over at https://skipbo.dillbox.me.
