if (!localStorage["uuid"]) {
    alert("uuid not found!")
}
const userId = localStorage["uuid"];
console.log("user ID is " + userId);

const urlTokens = window.document.URL.split("/");
const gameId = urlTokens[urlTokens.length - 1];
console.log("game ID is " + gameId);

const gameView = document.getElementById("game_view");
gameView.addEventListener("click", clickGameView);

let gameState;

const socket = io();

socket.on("connect", function () {
    socket.emit("enter_game", {
        game_id: gameId,
        user_id: userId
    });
});

socket.on("user_joined", function (json) {
    const _userId = json["user_id"];
    if (!_userId) {
        return;
    }
    socket.emit("update_game_state", {
        game_id: gameId,
        user_id: userId
    })
});

socket.on("game_changed", function () {
    socket.emit("update_game_state", {
        game_id: gameId,
        user_id: userId
    })
});

socket.on("game_json", function (json) {
    const state = json["state"];
    if (!state) {
        return;
    }
    gameState = state;
    const playerCount = state["user_map"].length;
    gameView.style.height = "calc(32.5vmin + " + (playerCount - 1) + " * 17.5vmin)";
    const ownArea = document.getElementById("own_area");
    ownArea.innerHTML = "";
    const ownPlayerId = gameState["own_player_id"];
    const turn = gameState["turn"];
    const users = gameState["users"];
    const ownPlayerName = document.createElement("div");
    ownPlayerName.classList.add("player_name");
    const ownDisplayName = users[userId]["display_name"];
    ownPlayerName.innerHTML = (users[userId]["online"] ? "🟢" : "🔴") + " " + (ownPlayerId == turn ? "⚪" : "⚫️") + " " + ownDisplayName;
    ownArea.appendChild(ownPlayerName);
    const ownPile = document.createElement("div");
    ownPile.classList.add("player_pile");
    ownPile.innerHTML = "";
    const ownPileSize = document.createElement("div");
    ownPileSize.classList.add("player_pile_size");
    ownPileSize.innerHTML = gameState[ownPlayerId]["pile_size"];
    ownPile.appendChild(ownPileSize);
    const pileTop = document.createElement("article");
    pileTop.classList.add("card");
    if (gameState[ownPlayerId]["pile_top"] == 0) {
        pileTop.innerHTML = "<h3>0</h3>";
        pileTop.innerHTML += "<h2>0</h2>";
        pileTop.classList.add("dummy");
    } else {
        pileTop.innerHTML = "<h3>" + gameState[ownPlayerId]["pile_top"] + "</h3>";
        pileTop.innerHTML += "<h2>" + gameState[ownPlayerId]["pile_top"] + "</h2>";
        pileTop.dataset.colour = cardColour(gameState[ownPlayerId]["pile_top"]);
    }
    pileTop.addEventListener("click", clickOwnPile);
    ownPile.appendChild(pileTop);
    ownArea.appendChild(ownPile);
    const ownHand = document.createElement("div");
    ownHand.classList.add("player_hand");
    ownHand.innerHTML = "";
    const hand = gameState[ownPlayerId]["hand"];
    for (var i = 0; i < hand.length; i++) {
        const handCard = document.createElement("article");
        handCard.classList.add("card");
        handCard.innerHTML = "<h3>" + hand[i] + "</h3>";
        handCard.innerHTML += "<h2>" + hand[i] + "</h2>";
        handCard.addEventListener("click", clickOwnHand);
        handCard.dataset.colour = cardColour(hand[i]);
        handCard.dataset.index = i;
        ownHand.appendChild(handCard);
    }
    ownArea.appendChild(ownHand);
    const ownTemp = document.createElement("div");
    ownTemp.classList.add("player_temp");
    ownTemp.innerHTML = "";
    const temp = gameState[ownPlayerId]["temp"];
    for (var j = 0; j < temp.length; j++) {
        /*const pile = document.createElement("div");*/
        const pile = document.createElement("article");
        pile.classList.add("card");
        pile.classList.add("dummy");
        pile.classList.add("temp_pile");
        pile.innerHTML = "<h3>0</h3>";
        pile.innerHTML += "<h2>0</h2>";
        pile.dataset.player = ownPlayerId;
        pile.addEventListener("click", clickTemp);
        pile.dataset.tempPileIndex = j;
        for (var i = 0; i < temp[j].length; i++) {
            const pileCard = document.createElement("article");
            pileCard.classList.add("card");
            pileCard.classList.add("temp_pile");
            pileCard.innerHTML = "<h3>" + temp[j][i] + "</h3>";
            pileCard.innerHTML += "<h2>" + temp[j][i] + "</h2>";
            pileCard.addEventListener("click", clickTemp);
            pileCard.dataset.colour = cardColour(temp[j][i]);
            pileCard.dataset.index = i;
            pileCard.dataset.tempPileIndex = j;
            pileCard.dataset.player = ownPlayerId;
            pileCard.style.zIndex = i;
            pileCard.dataset.top = (i == temp[j].length - 1);
            pile.appendChild(pileCard);
        }
        ownTemp.appendChild(pile);
    }
    ownArea.appendChild(ownTemp);
    const pileArea = document.getElementById("pile_area");
    pileArea.innerHTML = "";
    const deckSize = gameState["deck_size"];
    const deckSizeIndicator = document.createElement("div");
    deckSizeIndicator.id = "deck_size";
    deckSizeIndicator.innerHTML = deckSize;
    pileArea.appendChild(deckSizeIndicator);
    const deck = document.createElement("article");
    deck.classList.add("card");
    deck.id = "deck";
    deck.innerHTML = "<h3>0</h3>";
    deck.innerHTML += "<h2>0</h2>";
    deck.setAttribute("flipped", true);
    pileArea.appendChild(deck);
    const piles = gameState["piles"];
    for (var j = 0; j < piles.length; j++) {
        const pileTopCard = document.createElement("article");
        pileTopCard.classList.add("card");
        pileTopCard.classList.add("pile");
        pileTopCard.dataset.pileIndex = j;
        if (piles[j].length > 0) {
            const pile = piles[j];
            pileTopCard.innerHTML = "<h3>" + pile.length + "</h3>";
            pileTopCard.innerHTML += "<h2>" + pile.length + "</h2>";
            pileTopCard.addEventListener("click", clickPile);
            pileTopCard.dataset.colour = cardColour(pile[pile.length - 1]);
            pileTopCard.dataset.pileIndex = j;
        } else {
            pileTopCard.classList.add("dummy");
            pileTopCard.innerHTML = "<h3>0</h3>";
            pileTopCard.innerHTML += "<h2>0</h2>";
            pileTopCard.addEventListener("click", clickPile);
        }
        pileArea.append(pileTopCard);
    }
    const otherPlayers = document.getElementById("other_players");
    otherPlayers.innerHTML = "";
    const userMap = gameState["user_map"];
    for (var k = 0; k < userMap.length; k++) {
        if (k == ownPlayerId) {
            continue;
        }
        const _userId = userMap[k];
        const playerArea = document.createElement("div");
        playerArea.classList.add("player_area");
        playerArea.dataset.player = k;
        const playerName = document.createElement("div");
        playerName.classList.add("player_name");
        const displayName = gameState["users"][_userId]["display_name"];
        playerName.innerHTML = (gameState["users"][_userId]["online"] ? "🟢" : "🔴") + " " + (k == turn ? "⚪" : "⚫️") + " " + displayName;
        playerArea.appendChild(playerName);
        const playerPile = document.createElement("div");
        playerPile.classList.add("player_pile");
        const playerPileSize = document.createElement("div");
        playerPileSize.classList.add("player_pile_size");
        playerPileSize.innerHTML = gameState[k]["pile_size"];
        playerPile.appendChild(playerPileSize);
        const pileTop = document.createElement("article");
        pileTop.classList.add("card");
        if (gameState[k]["pile_top"] == 0) {
            pileTop.innerHTML = "<h3>0</h3>";
            pileTop.innerHTML += "<h2>0</h2>";
            pileTop.classList.add("dummy");
        } else {
            pileTop.innerHTML = "<h3>" + gameState[k]["pile_top"] + "</h3>";
            pileTop.innerHTML += "<h2>" + gameState[k]["pile_top"] + "</h2>";
            pileTop.dataset.colour = cardColour(gameState[k]["pile_top"]);
        }
        playerPile.appendChild(pileTop);
        playerArea.appendChild(playerPile);
        const playerHand = document.createElement("div");
        playerHand.classList.add("player_hand");
        const handCount = gameState[k]["hand_count"];
        for (var i = 0; i < handCount; i++) {
            const handCard = document.createElement("article");
            handCard.classList.add("card");
            handCard.setAttribute("flipped", true);
            handCard.innerHTML = "<h3>0</h3>";
            handCard.innerHTML += "<h2>0</h2>";
            handCard.dataset.colour = cardColour(hand[i]);
            handCard.dataset.index = i;
            playerHand.appendChild(handCard);
        }
        playerArea.appendChild(playerHand);
        const playerTemp = document.createElement("div");
        playerTemp.classList.add("player_temp");
        const temp = gameState[k]["temp"];
        for (var j = 0; j < temp.length; j++) {
            const pile = document.createElement("article");
            pile.classList.add("card");
            pile.classList.add("dummy");
            pile.classList.add("temp_pile");
            pile.innerHTML = "<h3>0</h3>";
            pile.innerHTML += "<h2>0</h2>";
            pile.addEventListener("click", clickTemp);
            pile.dataset.tempPileIndex = j;
            pile.dataset.player = k;
            for (var i = 0; i < temp[j].length; i++) {
                const pileCard = document.createElement("article");
                pileCard.classList.add("card");
                pileCard.classList.add("temp_pile");
                pileCard.innerHTML = "<h3>" + temp[j][i] + "</h3>";
                pileCard.innerHTML += "<h2>" + temp[j][i] + "</h2>";
                pileCard.addEventListener("click", clickTemp);
                pileCard.dataset.colour = cardColour(temp[j][i]);
                pileCard.dataset.index = i;
                pileCard.dataset.tempPileIndex = j;
                pileCard.dataset.player = k;
                pileCard.style.zIndex = i;
                pileCard.dataset.top = (i == temp[j].length - 1);
                pile.appendChild(pileCard);
            }
            playerTemp.append(pile);
        }
        playerArea.appendChild(playerTemp);
        otherPlayers.appendChild(playerArea);
    }
    if (state["winner"] != null) {
        const winnerUser = state["winner"];
        alert(state["users"][winnerUser]["display_name"] + " wins the game!");
    }
});

let expandedTemp = {
    player: null,
    pile: null
};

function clickPile (e) {
    const ownPlayerId = gameState["own_player_id"];
    const turn = gameState["turn"];
    e.preventDefault();
    if (e.target.classList.contains("pile") && e.target.classList.contains("card")) {
        e.stopPropagation();
        if (ownPlayerId == turn) {
            const pileIndex = e.target.dataset.pileIndex;
            if (selected && selectedType == "hand") {
                const handIndex = selected.dataset.index;
                socket.emit("play_hand", {
                    user_id: userId,
                    game_id: gameId,
                    hand_idx: handIndex,
                    pile_idx: pileIndex
                });
                selected.removeAttribute("selected");
                selected = null;
                selectedType = null;
            } else if (selected && selectedType == "temp") {
                selected.removeAttribute("selected");
                if (expandedTemp["pile"] != null) {
                    collapseTemp(expandedTemp["player"], expandedTemp["pile"]);
                }
                const tempPileIndex = selected.dataset.tempPileIndex;
                socket.emit("play_temp", {
                    user_id: userId,
                    game_id: gameId,
                    temp_idx: tempPileIndex,
                    pile_idx: pileIndex
                });
                selected = null;
                selectedType = null;
            } else if (!selected || (selected && selectedType == "pile")) {
                if (selected) {
                    selected.removeAttribute("selected");
                }
                socket.emit("play_pile", {
                    user_id: userId,
                    game_id: gameId,
                    pile_idx: pileIndex
                });
                selected = null;
                selectedType = null;
            }
        }
    }
}

var cardColour = function (value) {
    if (value == 0) {
        return "darkgreen";
    }
    if (1 <= value && value <= 4) {
        return "blue";
    }
    if (5 <= value && value <= 8) {
        return "green";
    }
    if (9 <= value && value <= 12) {
        return "red";
    }
    if (value == "*") {
        return "orange";
    }
    return "white";
};

var selected = null;
var selectedType = null;

function clickGameView (e) {
    if (selected) {
        selected.removeAttribute("selected");
    }
    if (expandedTemp["pile"] != null) {
        collapseTemp(expandedTemp["player"], expandedTemp["pile"]);
    }
    selected = null;
    selectedType = null;
}

function clickOwnHand (e) {
    e.preventDefault();
    const ownPlayerId = gameState["own_player_id"];
    const turn = gameState["turn"];
    if (ownPlayerId != turn) {
        return;
    }
    if (e.target.nodeName.toLowerCase() == "article") {
        e.stopPropagation();
        if (!e.target.getAttribute("selected")) {
            if (selected) {
                selected.removeAttribute("selected");
            }
            if (expandedTemp["pile"] != null) {
                collapseTemp(expandedTemp["player"], expandedTemp["pile"]);
            }
            e.target.setAttribute("selected", true);
            selected = e.target;
            selectedType = "hand";
        } else {
            e.target.removeAttribute("selected");
            selected = null;
            selectedType = null;
        }
    }
}

function clickOwnPile (e) {
    e.preventDefault();
    const ownPlayerId = gameState["own_player_id"];
    const turn = gameState["turn"];
    if (ownPlayerId != turn) {
        return;
    }
    if (e.target.nodeName.toLowerCase() == "article") {
        e.stopPropagation();
        if (!e.target.getAttribute("selected")) {
            if (selected) {
                selected.removeAttribute("selected");
            }
            if (expandedTemp["pile"] != null) {
                collapseTemp(expandedTemp["player"], expandedTemp["pile"]);
            }
            e.target.setAttribute("selected", true);
            selected = e.target;
            selectedType = "pile";
        } else {
            e.target.removeAttribute("selected");
            selected = null;
            selectedType = null;
        }
    }
}

function expandTemp (player, pile) {
    if (expandedTemp["pile"] != null) {
        collapseTemp(expandedTemp["player"], expandedTemp["pile"]);
    }
    const tempPileCards = document.querySelectorAll(".temp_pile.dummy[data-temp-pile-index=\"" + pile + "\"][data-player=\"" + player + "\"] .card");
    for (var i = 0; i < tempPileCards.length; i++) {
        const tempPileCard = tempPileCards[i];
        tempPileCard.style.top = "calc(" + (i + 1) + " * 2.5vmin - 0.95vmin)";
    }
    expandedTemp = {
        player: player,
        pile: pile
    };
}

function collapseTemp (player, pile) {
    const tempPile = document.querySelector(".temp_pile.dummy[data-temp-pile-index=\"" + pile + "\"][data-player=\"" + player + "\"]");
    const tempPileCards = tempPile.children;
    for (var i = 0; i < tempPileCards.length; i++) {
        const tempPileCard = tempPileCards[i];
        tempPileCard.removeAttribute("style");
    }
    expandedTemp = {
        player: null,
        pile: null
    };
}

function clickTemp (e) {
    const ownPlayerId = gameState["own_player_id"];
    const turn = gameState["turn"];
    e.preventDefault();
    if (
        (e.target.classList.contains("temp_pile") && e.target.classList.contains("card") && e.target.dataset.top == "true")
        || (e.target.classList.contains("temp_pile") && e.target.classList.contains("dummy"))
    ) {
        e.stopPropagation();
        const playerId = e.target.dataset.player;
        const tempPileIndex = e.target.dataset.tempPileIndex;
        if (ownPlayerId == turn && ownPlayerId == playerId) {
            if (!e.target.getAttribute("selected")) {
                if (selected && selectedType == "hand") {
                    const handIndex = selected.dataset.index;
                    socket.emit("end_turn", {
                        user_id: userId,
                        game_id: gameId,
                        hand_idx: handIndex,
                        temp_idx: tempPileIndex
                    });
                    selected.removeAttribute("selected");
                    selected = null;
                    selectedType = null;
                } else if (selected && selectedType == "temp") {
                    selected.removeAttribute("selected");
                    if (expandedTemp["pile"] == null) {
                        expandTemp(playerId, tempPileIndex);
                        selected = e.target;
                        selectedType = "temp";
                    } else {
                        if (!(expandedTemp["player"] == playerId && expandedTemp["pile"] == tempPileIndex)) {
                            expandTemp(playerId, tempPileIndex);
                            selected = e.target;
                            selectedType = "temp";
                        } else {
                            collapseTemp(playerId, tempPileIndex);
                            selected = null;
                            selectedType = null;
                        }
                    }
                } else if (!selected || (selected && selectedType == "pile")) {
                    if (selected) {
                        selected.removeAttribute("selected");
                    }
                    if (e.target.classList.contains("card") && e.target.dataset.top) {
                        e.target.setAttribute("selected", true);
                        expandTemp(playerId, tempPileIndex);
                        selected = e.target;
                        selectedType = "temp";
                    }
                } else {
                    if (expandedTemp["pile"] == null) {
                        expandTemp(playerId, tempPileIndex);
                        selected = e.target;
                        selectedType = "temp";
                    } else {
                        if (!(expandedTemp["player"] == playerId && expandedTemp["pile"] == tempPileIndex)) {
                            expandTemp(playerId, tempPileIndex);
                            selected = e.target;
                            selectedType = "temp";
                        } else {
                            collapseTemp(expandedTemp["player"], expandedTemp["pile"]);
                            selected = null;
                            selectedType = null;
                        }
                    }
                }
            } else {
                e.target.removeAttribute("selected");
                if (expandedTemp["player"] != null) {
                    collapseTemp(expandedTemp["player"], expandedTemp["pile"]);
                }
                selected = null;
                selectedType = null;
            }
        } else {
            if (expandedTemp["pile"] == null) {
                expandTemp(playerId, tempPileIndex);
            } else {
                if (!(expandedTemp["player"] == playerId && expandedTemp["pile"] == tempPileIndex)) {
                    expandTemp(playerId, tempPileIndex);
                } else {
                    collapseTemp(playerId, tempPileIndex);
                }
            }
        }
    }
}
