from random import shuffle
import uuid, time
from apscheduler.schedulers.background import BackgroundScheduler

### game logic

game_states = {}

def new_lobby() -> str:
    game_id = str(uuid.uuid4())
    while game_id in game_states.keys():
        game_id = str(uuid.uuid4())
    state = {
        "is_lobby": True,
        "last_activity": time.time(),
        "users": {}
    }
    game_states[game_id] = state
    return game_id

def new_game(pile_size: int, game_id: str) -> None:
    players = len(game_states[game_id]["users"])
    state = {
        "deck": ((players - 1) // 3 + 1) * (12 * list(range(1, 13)) + 18 * ["*"]), # 1 pile per 3 players
        "used": [],
        "player_count": players,
        "winner": None,
        "last_activity": time.time(),
        "is_lobby": False
    }
    shuffle(state["deck"])
    deck = state["deck"]
    for player in range(0, players):
        state[player] = {"pile": [], "hand": [], "temp": [[] for _ in range(0, 4)]}
    for i in range(0, pile_size):
        for player in range(0, players):
            state[player]["pile"] += [deck.pop()]
    for i in range(0, 5):
        for player in range(0, players):
            state[player]["hand"] += [deck.pop()]
    state["piles"] = [[] for _ in range(0, 4)]
    state["turn"] = 0
    game_states[game_id].update(state)

def peek_pile(game_id: str, player: int) -> int:
    pile = game_states[game_id][player]["pile"]
    if pile:
        return pile[-1]

def get_hand(game_id: str, player: int) -> list:
    return game_states[game_id][player]["hand"]

def draw(game_id: str, player: int):
    game = game_states[game_id]
    game["last_activity"] = time.time()
    while len(game[player]["hand"]) < 5:
        if not game["deck"]:
            game["deck"] = game["used"]
            game["used"] = []
            shuffle(game["deck"])
        game[player]["hand"] += [game["deck"].pop()]

def play_hand(game_id: str, hand_idx: int, pile_idx: int) -> None:
    game = game_states[game_id]
    if game["winner"] != None:
        return
    game["last_activity"] = time.time()
    player = game["turn"]
    pile = game["piles"][pile_idx]
    if hand_idx not in range(0, len(game[player]["hand"])):
        return False
    top = len(pile)
    card = game[player]["hand"][hand_idx]
    if card == "*" or card == top + 1:
        del game[player]["hand"][hand_idx]
        pile += [card]
    else:
        return False
    if len(pile) == 12:
        game["used"] += pile
        game["piles"][pile_idx] = []
    if len(game[player]["hand"]) == 0:
        draw(game_id, player)
    return True

def play_pile(game_id: str, pile_idx: int) -> None:
    game = game_states[game_id]
    if game["winner"] != None:
        return
    game["last_activity"] = time.time()
    player = game["turn"]
    pile = game["piles"][pile_idx]
    top = len(pile)
    card = game[player]["pile"][-1]
    if card == "*" or card == top + 1:
        game[player]["pile"].pop()
        pile += [card]
    else:
        return False
    if len(pile) == 12:
        game["used"] += pile
        game["piles"][pile_idx] = []
    if not game[player]["pile"]:
        game["winner"] = list(game["users"].items())[player][0]
    return True

def play_temp(game_id: str, temp_idx: int, pile_idx: int) -> None:
    game = game_states[game_id]
    if game["winner"] != None:
        return
    game["last_activity"] = time.time()
    player = game["turn"]
    pile = game["piles"][pile_idx]
    if not game[player]["temp"][temp_idx]:
        return False
    top = len(pile)
    card = game[player]["temp"][temp_idx][-1]
    if card == "*" or card == top + 1:
        game[player]["temp"][temp_idx].pop()
        pile += [card]
    else:
        return False
    if len(pile) == 12:
        game["used"] += pile
        game["piles"][pile_idx] = []
    return True

def end_turn(game_id: str, hand_idx: int, temp_idx: int) -> None:
    game = game_states[game_id]
    if game["winner"] != None:
        return
    game["last_activity"] = time.time()
    player = game["turn"]
    if hand_idx not in range(0, len(game[player]["hand"])):
        return
    print("playing hand idx", hand_idx, "to pile idx", temp_idx)
    game[player]["temp"][temp_idx] += [game[player]["hand"][hand_idx]]
    print("old hand,", game[player]["hand"])
    del game[player]["hand"][hand_idx]
    print("new hand,", game[player]["hand"])
    print("new pile state", game[player]["temp"][temp_idx])
    game["turn"] = (game["turn"] + 1) % game["player_count"]
    draw(game_id, game["turn"])

### remove finished or timed-out (>48h) games every hour

def clean_up():
    for game_id, game in game_states.items():
        if game.get("winner") != None or time.time() - game["last_activity"] > 2 * 24 * 60 * 60:
            del game_states[game_id]

sched = BackgroundScheduler(daemon=True)
sched.add_job(clean_up, "interval", minutes=60)
sched.start()

### web server functionality

from flask import Flask
from flask_socketio import SocketIO, send, emit
from flask_socketio import join_room, leave_room

from flask import (
    Blueprint, g, redirect, render_template, request, session, url_for
)

socketio = SocketIO(engineio_logger=True, logger=True)

def create_app():
    app = Flask(__name__)
    bp_main = Blueprint("main", __name__)
    bp_new = Blueprint("new_game", __name__, url_prefix="/new_game")
    bp_join = Blueprint("join_game", __name__, url_prefix="/join_game")
    bp_gv = Blueprint("game_view", __name__, url_prefix="/game_view")
    socketio.init_app(app)

    @socketio.on("disconnect")
    def socket_disconnect():
        session_id = request.sid
        emit("user_left", {"session_id": session_id}, broadcast=True)
        for game_id, game in game_states.items():
            users = game["users"]
            for user_id, object in users.items():
                if object["session_id"] == session_id:
                    if game["is_lobby"]:
                        del game["users"][user_id]
                        print(f"user {user_id}, session ID {session_id}, left lobby")
                        if not any(users[_user_id]["is_host"] for _user_id in users) and len(users) > 0:
                            list(users.items())[0][1]["is_host"] = True
                    else:
                        print(f"user {user_id}, session ID {session_id}, has left the game. waiting 60s for reconnect…")
                        # TODO: reconnect

    @socketio.on("get_refreshed_user_list")
    def socket_get_refreshed_user_list(json):
        try:
            lobby_id = json["lobby_id"]
            users = game_states[lobby_id]["users"]
            emit("refresh_user_list", {
                "user_dict": users
            }, room=lobby_id)
        except Exception as e:
            print(">>>>>>", type(e), e)

    @socketio.on("register_user")
    def socket_register_user(json):
        try:
            user_id, lobby_id = json["user_id"], json["lobby_id"]
            if not game_states[lobby_id]["is_lobby"]:
                send(f"cannot join game {lobby_id}, game is already running")
                return
            users = game_states[lobby_id]["users"]
            user_data = {
                "display_name": user_id,
                "session_id": request.sid,
                "online": False,
                "quit": False
            }
            user_data["is_host"] = (
                len(users) == 0
                or list(users.items())[0][0] == user_id
            )
            users[user_id] = user_data
            join_room(lobby_id)
            print(f"added user {user_id} to lobby {lobby_id}")
            emit("refresh_user_list", {
                "user_dict": users
            }, room=lobby_id)
        except Exception as e:
            print(">>>>>>", type(e), e)

    @socketio.on("update_display_name")
    def socket_update_display_name(json):
        try:
            user_id, lobby_id, session_id, new_name = json["user_id"], json["lobby_id"], request.sid, json["new_name"]
            users = game_states[lobby_id]["users"]
            if user_id in users:
                if not users[user_id]["session_id"] == session_id:
                    return
                users[user_id]["display_name"] = new_name
            print(f"changed display name for user ID {user_id} to {new_name}")
            emit("refresh_user_list", {
                "user_dict": users
            }, room=lobby_id)
        except Exception as e:
            print(">>>>>>", type(e), e)

    @socketio.on("update_pile_size")
    def socket_update_pile_size(json):
        try:
            user_id, lobby_id, session_id, pile_size = json["user_id"], json["lobby_id"], request.sid, json["pile_size"]
            users = game_states[lobby_id]["users"]
            if user_id in users:
                if not users[user_id]["is_host"] or not users[user_id]["session_id"] == session_id:
                    return
                emit("refresh_pile_size", {
                    "pile_size": pile_size
                }, room=lobby_id)
        except Exception as e:
            print(">>>>>>", type(e), e)

    @socketio.on("update_game_state")
    def socket_update_game_state(json):
        try:
            user_id, game_id, session_id = json["user_id"], json["game_id"], request.sid
            state = game_states[game_id]
            if state["is_lobby"]:
                return
            json_state = {}
            users = state["users"]
            if not users[user_id]["session_id"] == session_id:
                return
            for key in range(0, state["player_count"]):
                _user_id = list(users.items())[key][0]
                json_state[key] = {}
                if _user_id == user_id:
                    json_state[key]["hand"] = state[key]["hand"]
                    json_state["own_player_id"] = key
                else:
                    json_state[key]["hand_count"] = len(state[key]["hand"])
                json_state[key]["temp"] = state[key]["temp"]
                json_state[key]["pile_top"] = state[key]["pile"][-1] if state[key]["pile"] else 0
                json_state[key]["pile_size"] = len(state[key]["pile"])
                json_state["deck_size"] = len(state["deck"])
                json_state["winner"] = state["winner"]
                json_state["piles"] = state["piles"]
                json_state["turn"] = state["turn"]
                json_state["users"] = {
                    _user_id: {
                        "display_name": users[_user_id]["display_name"],
                        "online": users[_user_id]["online"],
                        "timed_out": users[_user_id]["timed_out"]
                    } for _user_id in users
                }
                json_state["user_map"] = [key for key, item in list(users.items())]
            emit("game_json", {
                "state": json_state
            })
        except Exception as e:
            print(">>>>>>", type(e), e)

    @socketio.on("enter_game")
    def socket_enter_game(json):
        try:
            user_id, game_id, session_id = json["user_id"], json["game_id"], request.sid
            join_room(game_id)
            state = game_states[game_id]
            if state["is_lobby"]:
                return
            users = state["users"]
            for key in range(0, state["player_count"]):
                _user_id = list(users.items())[key][0]
                if _user_id == user_id:
                    users[user_id]["session_id"] = session_id
                    users[user_id]["online"] = True
                    users[user_id]["timed_out"] = False
            emit("user_joined", {
                "user_id": user_id
            }, room=game_id)
        except Exception as e:
            print(">>>>>>", type(e), e)

    def authorise_turn(user_id: str, game_id: str, session_id: str):
        state = game_states[game_id]
        if state["is_lobby"]:
            return
        users = state["users"]
        if not users[user_id]["session_id"] == session_id:
            return
        for key in range(0, state["player_count"]):
            _user_id = list(users.items())[key][0]        
            if _user_id == user_id and key == state["turn"]:
                return True

    @socketio.on("end_turn")
    def socket_end_turn(json):
        try:
            user_id, game_id, session_id, hand_idx, temp_idx = json["user_id"], json["game_id"], request.sid, int(json["hand_idx"]), int(json["temp_idx"])
            if not authorise_turn(user_id, game_id, session_id):
                return
            end_turn(game_id, hand_idx, temp_idx)
            emit("game_changed", room=game_id)
        except Exception as e:
            print(">>>>>>", type(e), e)

    @socketio.on("play_hand")
    def socket_play_hand(json):
        try:
            user_id, game_id, session_id, hand_idx, pile_idx = json["user_id"], json["game_id"], request.sid, int(json["hand_idx"]), int(json["pile_idx"])
            if not authorise_turn(user_id, game_id, session_id):
                return
            if play_hand(game_id, hand_idx, pile_idx):
                emit("game_changed", room=game_id)
        except Exception as e:
            print(">>>>>>", type(e), e)

    @socketio.on("play_pile")
    def socket_play_hand(json):
        try:
            user_id, game_id, session_id, pile_idx = json["user_id"], json["game_id"], request.sid, int(json["pile_idx"])
            if not authorise_turn(user_id, game_id, session_id):
                return
            if play_pile(game_id, pile_idx):
                emit("game_changed", room=game_id)
        except Exception as e:
            print(">>>>>>", type(e), e)

    @socketio.on("play_temp")
    def socket_play_hand(json):
        try:
            user_id, game_id, session_id, temp_idx, pile_idx = json["user_id"], json["game_id"], request.sid, int(json["temp_idx"]), int(json["pile_idx"])
            if not authorise_turn(user_id, game_id, session_id):
                return
            if play_temp(game_id, temp_idx, pile_idx):
                emit("game_changed", room=game_id)
        except Exception as e:
            print(">>>>>>", type(e), e)

    @bp_main.route("/", methods=["GET"])
    def bp_main_page():
        return render_template("main.html")

    @app.route("/lobby/start_game", methods=["POST"])
    def app_start_game():
        try:
            request_json = request.get_json()
            user_id, lobby_id, pile_size = request_json["user_id"], request_json["lobby_id"], int(request_json["pile_size"])
            game = game_states[lobby_id]
            if not game["is_lobby"]:
                return {
                    "success": False,
                    "error": "game already started!"
                }
            users = game["users"]
            if not users[user_id]["is_host"]:
                return {
                    "success": False,
                    "error": "only the host can start the game!"
                }
            if len(users) < 2:
                return {
                    "success": False,
                    "error": "a minimum of 2 players needed!"
                }
            emit("game_started", room=lobby_id, namespace="/")
            new_game(pile_size, lobby_id)
            print(game)
            return {
                "success": True
            }
        except Exception as e:
            print(">>>>>>", type(e), e)
            return {
                "success": False,
                "error": f"[ Exception ] {type(e)} {e}"
            }

    @bp_new.route("/", methods=("GET", "POST"))
    def bp_new_game():
        if request.method == "POST":
            game_id = new_lobby()
            print("new game ID is " + game_id)
            return render_template("lobby/template.html", game_id=game_id)

        return render_template("new_game/template.html")
    
    @bp_join.route("/", methods=("GET", "POST"))
    def bp_join_game():
        if request.method == "GET":
            return render_template("join_game/template.html")
        if request.method == "POST":
            game_id = request.form["game_id"]
            print("request to join game " + game_id)

            try:
                game = game_states[game_id]
                if not game["is_lobby"]:
                    return render_template("join_game/running.html", game_id=game_id)
                return render_template("lobby/template.html", game_id=game_id)
            except:
                return render_template("join_game/invalid.html")

    @bp_gv.route("/<game_id>", methods=["GET"])
    def bp_game_view(game_id):
        return render_template("game_view/template.html", game_id=game_id)

    @app.route("/lobby/<game_id>", methods=["GET"])
    def app_lobby_link(game_id):
        return render_template("lobby/template.html", game_id=game_id)

    app.register_blueprint(bp_main)
    app.register_blueprint(bp_new)
    app.register_blueprint(bp_join)
    app.register_blueprint(bp_gv)

    return app

app = create_app()

if __name__ == "__main__":
    app = create_app()
    socketio.run(app)