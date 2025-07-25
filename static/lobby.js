if (!localStorage["uuid"]) {
    // https://abhishekdutta.org/blog/standalone_uuid_generator_in_javascript.html
    // Author: Abhishek Dutta, 12 June 2020
    // License: CC0 (https://creativecommons.org/choose/zero/)
    function uuid() {
        var temp_url = URL.createObjectURL(new Blob());
        var uuid = temp_url.toString();
        URL.revokeObjectURL(temp_url);
        return uuid.substr(uuid.lastIndexOf('/') + 1); // remove prefix (e.g. blob:null/, blob:www.test.com/, ...)
    }
    localStorage["uuid"] = uuid();
}
const userId = localStorage["uuid"];

const playerList = document.getElementById("player_list");

const lobbyId = document.getElementById("lobby_id").innerHTML;

const pileSizeInput = document.getElementById("pile_size");

const socket = io();

const shareLinkInput = document.getElementById("share_link");
const urlTokens = window.document.URL.split("/");
const protocol = urlTokens[0];
const urlBase = urlTokens[2];
shareLinkInput.value = protocol + "//" + urlBase + "/lobby/" + lobbyId;

socket.on("connect", function () {
    socket.emit("register_user", {
        user_id: userId,
        lobby_id: lobbyId
    });
});

var updateDisplayName = function (newName) {
    socket.emit("update_display_name", {
        user_id: userId,
        lobby_id: lobbyId,
        new_name: newName
    });
};

var updatePileSize = function () {
    socket.emit("update_pile_size", {
        pile_size: Math.min(Math.max(Math.trunc(pileSizeInput.value), 5), 30),
        user_id: userId,
        lobby_id: lobbyId
    });
};

socket.on("refresh_pile_size", function (json) {
    if (!pileSizeInput) {
        return;
    }
    var pileSize = json["pile_size"];
    if (!pileSize) {
        return;
    }
    pileSizeInput.value = pileSize;
});

socket.on("refresh_user_list", function (json) {
    var userDict = json["user_dict"];
    if (!userDict) {
        return;
    }
    playerList.innerHTML = null;
    const startButton = document.getElementById("start_game");
    for (const _userId in userDict) {
        object = userDict[_userId]
        var listItem = document.createElement("li");
        var listDiv = document.createElement("div");
        var displayName = object["display_name"];
        var sessionId = object["session_id"];
        var isHost = object["is_host"];
        console.log("user joined: " + displayName + ", session ID " + sessionId + ", is host: " + isHost);
        if (isHost) {
            var hostDiv = document.createElement("div");
            hostDiv.innerHTML = "👑";
            hostDiv.id = "is_host";
            listItem.appendChild(hostDiv);
        }
        listDiv.innerHTML = displayName;
        listItem.dataset.sessionId = sessionId;
        listItem.dataset.userId = _userId;
        listItem.appendChild(listDiv);
        if (_userId == userId) {
            startButton.disabled = !isHost;
            pileSizeInput.disabled = !isHost;
            var editDiv = document.createElement("div");
            editDiv.innerHTML = '<button type="button" id="edit_button" onclick="updateDisplayName(prompt(\'please enter your display name:\'))">🖊️</button>';
            listItem.appendChild(editDiv);
        }
        playerList.appendChild(listItem);
    }
});

var startGame = async function () {
    console.log("start game");
    try {
        const response = await fetch("/lobby/start_game", {
            method: "POST",
            headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId,
                lobby_id: lobbyId,
                pile_size: Math.min(Math.max(Math.trunc(pileSizeInput.value), 5), 30)
            }),
        });
        const resp = await response.json();
        if (!resp["success"]) {
            alert(resp["error"]);
        }
    } catch (e) {
        console.error(e);
    }
};

async function copyLobbyLink() {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(protocol + "//" + urlBase + "/lobby/" + lobbyId);
    } else {
        shareLinkInput.select();

        try {
            document.execCommand('copy');
        } catch (error) {
            console.error(error);
        }

        pileSizeInput.focus();
        pileSizeInput.blur();
    }
}

socket.on("game_started", function () {
    window.location.href = "/game_view/" + lobbyId;
})

socket.on("user_left", function (json) {
    var sessionId = json["session_id"];
    if (!sessionId) {
        return;
    }
    var children = playerList.children;
    for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (child.dataset.sessionId == sessionId) {
            //playerList.removeChild(child);
            socket.emit("get_refreshed_user_list", {
                "lobby_id": lobbyId
            })
            console.log("user " + child.dataset.userId + ", session ID " + child.dataset.sessionId + ", left the lobby")
        }
    }
});
