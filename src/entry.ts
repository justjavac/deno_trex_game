import Runner from "./Runner.ts";
const runner = new Runner(".interstitial-wrapper");
runner.initializeHighScore(Number(localStorage.getItem("highestScore")));
