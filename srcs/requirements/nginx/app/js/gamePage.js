import { navigate } from "./router.js";

export function loadPongOptJs() {
    setTimeout(() => {
        const pongopt = document.querySelector('.pong-options');
        const tournamentOpt = document.querySelector('.tournament-opt');
        const tournamentOffOnn = document.querySelector('.tournament-off-onn');
        const multiplayerOpt = document.querySelector('.multiplayer-opt');
        const singleplayerOpt = document.querySelector('.singleplayer-opt');

        if (pongopt && tournamentOpt && tournamentOffOnn) {
            const pongopt = document.querySelector('.pong-options');
            const tournamentOpt = document.querySelector('.tournament-opt');
            const tournamentOffOnn = document.querySelector('.tournament-off-onn');
            const multiplayerOpt = document.querySelector('.multiplayer-opt');
            const singleplayerOpt = document.querySelector('.singleplayer-opt');

            if (pongopt && tournamentOpt && tournamentOffOnn) {
                tournamentOpt.addEventListener('click', function () {
                    pongopt.style.display = "none";
                    tournamentOffOnn.style.display = "flex";

                    const tourOnn = document.querySelector('.tour-online');
                    const tourOff = document.querySelector('.tour-offline');
                    const tourOnnPromptBox = document.querySelector('.tournament-onn-prompt-box');
                    const tourOffPromptBox = document.querySelector('.tournament-off-prompt-box');

                    tourOnn.addEventListener('click', function () {
                        tournamentOffOnn.style.display = "none";
                        tourOnnPromptBox.style.display = "flex";
                    });

                    tourOff.addEventListener('click', function () {
                        tournamentOffOnn.style.display = "none";
                        tourOffPromptBox.style.display = "flex";
                    });
                });
            }
        }
    }, 100);
}


export function loadGamePageJs() {
    document.querySelector('.pong-game').addEventListener('click', function () {
        navigate('/pong');
        loadPongOptJs();
    });
}


