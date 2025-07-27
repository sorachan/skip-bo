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

(that is, if you're serving other web sites on your server. if all you're looking to serve is Skip-Bo, just configure `gunicorn` to serve HTTPS on `0.0.0.0:443` and ignore the rest of this subsection.)

of course, HTTPS requires getting a SSL certificate first – if you're looking for a free and reliable certificate service, I warmly recommend Let's Encrypt.

for example, if you run `gunicorn` with the argument `--bind 127.0.0.1:8000`, you can set up your web server to reverse proxy connections to `skipbo.foob.ar` to `127.0.0.1:8000` and configure it to not only proxy HTTP(S) requests, but also WebSocket.

if you need help with your Apache config file, just ask ChatGPT! I was stuck trying to come up with a working config, a friend of mine recommended ChatGPT, I formulated a prompt for an Apache config files that does this and that and the config that ChatGPT created for me worked without modifications. amazing what AI can do nowadays.

## public instance

if you're too lazy or inexperienced to set up your own server, feel free to play a match over at https://skipbo.dillbox.me.
