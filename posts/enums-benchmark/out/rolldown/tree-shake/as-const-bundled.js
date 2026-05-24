//#region src/tree-shake/as-const/lib.ts
const Direction = {
	Up: "UP",
	Down: "DOWN",
	Left: "LEFT",
	Right: "RIGHT"
};
//#endregion
//#region src/tree-shake/as-const/consumer.ts
console.log(Direction.Up);
console.log(Direction.Down);
console.log(Direction.Left);
console.log(Direction.Right);
//#endregion
