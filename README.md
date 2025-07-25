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

## public instance

if you're too lazy or inexperienced to set up your own server, feel free to play a match over at https://skipbo.dillbox.me.
