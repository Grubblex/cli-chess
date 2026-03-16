import prompts from 'prompts';
import figlet from "figlet";
import chalk from 'chalk';
import { BoardVisualEngine } from './board.js';
import { Piece } from './pieces.js';
import { sleep } from './util.js';

import type { Board } from './board.js';
import { MoveEngine } from './Move/moveEngine.js';

export function createInitialBoard(): Board {
	const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));

	// Pawns
	for (let col = 0; col < 8; col++) {
		board[1]![col] = new Piece('pawn', '♙', 'black', 1, col, 'black');
		board[6]![col] = new Piece('pawn', '♙', 'white', 6, col, 'white');
	}

	// Rooks
	board[0]![0] = new Piece('rook', '♜', 'black', 0, 0, 'black');
	board[0]![7] = new Piece('rook', '♜', 'black', 0, 7, 'black');
	board[7]![0] = new Piece('rook', '♜', 'white', 7, 0, 'white');
	board[7]![7] = new Piece('rook', '♜', 'white', 7, 7, 'white');

	// Knights
	board[0]![1] = new Piece('knight', '♞', 'black', 0, 1, 'black');
	board[0]![6] = new Piece('knight', '♞', 'black', 0, 6, 'black');
	board[7]![1] = new Piece('knight', '♞', 'white', 7, 1, 'white');
	board[7]![6] = new Piece('knight', '♞', 'white', 7, 6, 'white');

	// Bishops
	board[0]![2] = new Piece('bishop', '♝', 'black', 0, 2, 'black');
	board[0]![5] = new Piece('bishop', '♝', 'black', 0, 5, 'black');
	board[7]![2] = new Piece('bishop', '♝', 'white', 7, 2, 'white');
	board[7]![5] = new Piece('bishop', '♝', 'white', 7, 5, 'white');

	// Queens
	board[0]![3] = new Piece('queen', '♛', 'black', 0, 3, 'black');
	board[7]![3] = new Piece('queen', '♛', 'white', 7, 3, 'white');

	// Kings
	board[0]![4] = new Piece('king', '♚', 'black', 0, 4, 'black');
	board[7]![4] = new Piece('king', '♚', 'white', 7, 4, 'white');

	return board;
	}


async function main() {

	const text = await figlet.text("NodeJS Cli Chess");
  	console.log(chalk.blue(text));

	const response = await prompts({
		type: 'select',
		name: 'action',
		message: '',
		choices: [
		{ title: 'Play Game', value: 'new' },
		{ title: 'Settings', value: 'help' },
		{ title: 'Exit', value: 'exit' }
		]
	});

	if (response.action === 'new') {
	console.log('Starte neues Spiel...');
	let board = createInitialBoard();

	const moveEngine = new MoveEngine();
	const engine = new BoardVisualEngine(board);

	engine.initializeBoard();

	let currentPlayer: 'white' | 'black' = 'white';

	while (true) {
		const movePrompt = await prompts({
			type: 'text',
			name: 'move',
			message: `${chalk[currentPlayer](`${currentPlayer} move:`)}`
		});

		const move = movePrompt.move;

		if (move === "exit") {
			console.log("Game ended");
			break;
		}

		if (!move) continue;

		try {
			board = await moveEngine.move(board, move, currentPlayer);
			engine.updateBoard(board);

			// Spieler wechseln
			currentPlayer = currentPlayer === 'white' ? 'black' : 'white';

		} catch (err) {
			console.log(chalk.red("Invalid move"));
		}
	}
	} else if (response.action === 'help') {
		console.log('Zeige Hilfe...');
	} else if (response.action === 'exit') {
		console.log('Programm beendet.');
	}
}

main();