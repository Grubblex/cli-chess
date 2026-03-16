import { Piece } from './pieces.js';
import chalk from 'chalk';

export type Board = (Piece | null)[][];

export class BoardVisualEngine {
	board: Board;

	private readonly files = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
	private readonly squareWidth = 2;
	private readonly squareHeight = 1;

	constructor(board: Board) {
		this.board = board;
	}

	public initializeBoard() {
		this.updateBoard(this.board);
	}

	public updateBoard(board: Board) {
		/*console.clear();*/

		for (let row = 0; row < 8; row++) {
			const renderedLines: string[] = [];

			for (let innerRow = 0; innerRow < this.squareHeight; innerRow++) {
				let line = '';

				for (let col = 0; col < 8; col++) {
					const piece = board[row]![col];
					const isDarkSquare = (row + col) % 2 === 1; 

					const bg = isDarkSquare? chalk.bgHex('#3E2F24') : chalk.bgHex('#127509');

					const isMiddleLine = innerRow === Math.floor(this.squareHeight / 2);

					if (isMiddleLine && piece) {
						const icon = piece.color === 'white'? chalk.white(piece.icon) : chalk.black(piece.icon);

						line += this.centerInSquare(icon, bg, this.squareWidth);
					} else {
						line += bg(' '.repeat(this.squareWidth));
					}
				}

				if (innerRow === Math.floor(this.squareHeight / 2)) {
					line += ` ${8 - row}`;
				}

				renderedLines.push(line);
			}

			for (const line of renderedLines) {
				console.log(line);
			}
		}

		console.log(this.renderFiles());
	}

	private centerInSquare(content: string, bg: (text: string) => string, width: number): string {
		const left = Math.floor((width - 1) / 2);
		const right = width - left - 1;

		return bg(' '.repeat(left) + content + ' '.repeat(right));
	}

	private renderFiles(): string {
		let line = '';

		for (const file of this.files) {
			const left = Math.floor((this.squareWidth - 1) / 2);
			const right = this.squareWidth - left - 1;

			line += ' '.repeat(left) + file + ' '.repeat(right);
		}

		return line;
	}
}