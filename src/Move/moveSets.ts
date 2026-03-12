type MoveSet = [x: number, y: number][];

export const rookDirections: MoveSet = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1],
];

export const bishopDirections: MoveSet = [
	[1, 1],
	[1, -1],
	[-1, 1],
	[-1, -1],
];

export const queenDirections: MoveSet = [
	...rookDirections,
	...bishopDirections,
];

export const knightMoves: MoveSet = [
	[2, 1],
	[2, -1],
	[-2, 1],
	[-2, -1],
	[1, 2],
	[1, -2],
	[-1, 2],
	[-1, -2],
];

export const kingMoves: MoveSet = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1],
	[1, 1],
	[1, -1],
	[-1, 1],
	[-1, -1],
];