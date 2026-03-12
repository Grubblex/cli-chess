import type { Board } from "../board.js";
import type { Piece } from "../pieces.js";
import { bishopDirections, kingMoves, knightMoves, queenDirections, rookDirections } from "./moveSets.js";

type Square = [row: number, col: number];
type Target = Square;
type Destination = Square;
type Move = [Target, Destination];

type MoveSet = [x: number, y: number][];

export class MoveEngine {

	private lookupTable: Record<string, string> = {
			a:"0",
			b:"1",
			c:"2",
			d:"3",
			e:"4",
			f:"5",
			g:"6",
			h:"7",
		}
	private ranks = 8;

	public move(board: Board, moveString: string, currentPlayer: 'white' | 'black'): Board {

		const enemyPlayer = currentPlayer === 'white' ? 'black' : 'white' 

		const [targetCoordinates, destinationCoordinates] = this.translateMove(moveString);
		const pieceToMove = board[targetCoordinates[0]]?.[targetCoordinates[1]] ?? null;
		const destinationSquare = board[destinationCoordinates[0]]?.[destinationCoordinates[1]] ?? null;

		if (pieceToMove === null) {
			throw new Error("No piece on target square");
		}

		const possibleMoves = this.getPossibleMoves(board, pieceToMove);

		const legalMoves = this.checkForPin(board, pieceToMove, possibleMoves, currentPlayer)

		const isValid = legalMoves.some(
			([row, col]) =>
				row === destinationCoordinates[0] && col === destinationCoordinates[1]
		);

		if (!isValid) {
			throw new Error("Illegal move");
		}

		if (destinationSquare !== null && pieceToMove.color !== destinationSquare.color) {
			console.log(
				`${pieceToMove.color} ${pieceToMove.type} strikes ${destinationSquare.color} ${destinationSquare.type} (+${destinationSquare.points})`
			);
		}

		this.applyMove(board, pieceToMove, targetCoordinates, destinationCoordinates);
		const kingInCheck = this.isKingCheck(board, enemyPlayer);

		if (kingInCheck) {
			console.log('King is checked!')
		}

		return board;
	}
	/**
	 * 
	 * @param moveString the players input for moving a piece
	 * @returns Move Coordinates 
	 * [[row, col][row, col]] 
	 * where the first index of the outer array represents which piece
	 * and the second index represents the destination of the piece
	 */

	private translateMove(moveString: string): Move {
		const re = /^[a-h][1-8][a-h][1-8]$/;
		const string = moveString.trim();
		if(!re.test(string)) {
			throw new Error(`Invalid move format: ${string}`);
		} 
		const coordinatesArray = string.split('').map(char => Number(char) ? this.ranks - Number(char) : Number(this.lookupTable[char]));
		//reverse because e2e4 is in col, row format and we need row, col
		const targetCoordinates = coordinatesArray.slice(0, 2).reverse() as [number, number];
		const destinationCoordinates = coordinatesArray.slice(2, 4).reverse() as [number, number];
		return [targetCoordinates, destinationCoordinates]
	}

		private getPossibleMoves(board: Board, piece: Piece): Square[] {
		switch (piece.type) {
			case 'pawn':
				return this.generatePawnMoves(board, piece);
			case 'knight':
				return this.generateKnightMoves(board, piece);
			case 'bishop':
				return this.generateSlidingMoves(board, piece, bishopDirections);
			case 'rook':
				return this.generateSlidingMoves(board, piece, rookDirections);
			case 'queen':
				return this.generateSlidingMoves(board, piece, queenDirections);
			case 'king':
				return this.generateKingMoves(board, piece);
			default:
				return [];
		}
	}

	private isInsideBoard(row: number, col: number): boolean {
		return row >= 0 && row < 8 && col >= 0 && col < 8;
	}

	private generateSlidingMoves(
		board: Board,
		piece: Piece,
		directions: MoveSet
	): Square[] {
		const moves: Square[] = [];
		for (const [dr, dc] of directions) {
			for (let step = 1; step < 8; step++) {
				const newRow = piece.row + dr * step;
				const newCol = piece.col + dc * step;

				if (!this.isInsideBoard(newRow, newCol)) {
					break;
				}		
				const target = board[newRow]![newCol]!;

				if (target === null) {
					moves.push([newRow, newCol]);
					continue;
				}
				if (target.color !== piece.color) {
					moves.push([newRow, newCol]);
				}
				break;
			}
		}
		return moves;
	}

	private generateKnightMoves(board: Board, piece: Piece): Square[] {
		const moves: Square[] = [];

		for (const [dr, dc] of knightMoves) {
			const newRow = piece.row + dr;
			const newCol = piece.col + dc;

			if (!this.isInsideBoard(newRow, newCol)) {
				continue;
			}

			const target = board[newRow]![newCol]!;

			if (target === null || target.color !== piece.color) {
				moves.push([newRow, newCol]);
			}
		}

		return moves;
	}

	private generatePawnMoves(board: Board, piece: Piece): Square[] {
		const moves: Square[] = [];
		const direction = piece.color === 'white' ? -1 : 1;

		const oneStepRow = piece.row + direction;
		const twoStepRow = piece.row + 2 * direction;

		if (this.isInsideBoard(oneStepRow, piece.col) && board[oneStepRow]![piece.col] === null)
			{
				moves.push([oneStepRow, piece.col]);

				// 2 Steps on first move
				if (piece.isFirstMove && board[twoStepRow]![piece.col] === null	
				) {
					moves.push([twoStepRow, piece.col]);
				}
			}
		// strike left
		const leftCol = piece.col - 1;
		if (this.isInsideBoard(oneStepRow, leftCol)) {
			const target = board[oneStepRow]![leftCol]!;
			if (target !== null && target.color !== piece.color) {
				moves.push([oneStepRow, leftCol]);
			}
		}

		// strike right
		const rightCol = piece.col + 1;
		if (this.isInsideBoard(oneStepRow, rightCol)) {
			const target = board[oneStepRow]![rightCol]!;
			if (target !== null && target.color !== piece.color) {
				moves.push([oneStepRow, rightCol]);
			}
		}
		return moves;
	}

		private generateKingMoves(board: Board, piece: Piece): Square[] {
		const moves: Square[] = [];

		for (const [dr, dc] of kingMoves) {
			const newRow = piece.row + dr;
			const newCol = piece.col + dc;

			if (!this.isInsideBoard(newRow, newCol)) {
				continue;
			}

			const target = board[newRow]![newCol]!;

			if (target === null || target.color !== piece.color) {
				moves.push([newRow, newCol]);
			}
		}
		return moves;
	}

	private checkForPin(board: Board, piece: Piece, possibleMoves: Square[], currentPlayer: 'white' | 'black'): Square[] {

		const legalMoves: Square[] = [];

		for (const move of possibleMoves) {

			const simulatedBoard = board.map(row => [...row]);
			console.log(piece.row, piece.col)
			this.applyMove(simulatedBoard, piece, [piece.row, piece.col], move);

			if(!this.isKingCheck(simulatedBoard, currentPlayer)) {
				legalMoves.push(move);
			}
		}

		return legalMoves;
	}

	private applyMove(
		board: Board,
		piece: Piece,
		from: Target,
		to: Destination
	): void {
		board[to[0]]![to[1]] = piece;
		board[from[0]]![from[1]] = null;

		piece.row = to[0];
		piece.col = to[1];
		console.log(piece.row, piece.col)
		piece.isFirstMove = false;
	}

	private isAttackedBySlidingPiece(
		board: Board,
		king: Piece,
		friendlyColor: 'white' | 'black',
		directions: MoveSet,
		validTypes: Array<'bishop' | 'rook' | 'queen'>
	): boolean {
		for (const [dr, dc] of directions) {
			let row = king.row + dr;
			let col = king.col + dc;

			while (this.isInsideBoard(row, col)) {
				const square = board[row]![col];

				if (square === null) {
					row += dr;
					col += dc;
					continue;
				}

				if (square!.color !== friendlyColor && validTypes.includes(square!.type as 'bishop' | 'rook' | 'queen')	
				) {
					return true;
				}

				break;
			}
		}

		return false;
	}

	private isKingCheck(simulatedBoard: Board, friendlyColor: 'white' | 'black'): boolean {
		const pawnDirection = friendlyColor === 'white' ? -1 : 1;

		const friendlyKing = simulatedBoard
			.flat()
			.find(square => square?.type === 'king' && square.color === friendlyColor)!;

		const enemyPawns = simulatedBoard
			.flat()
			.filter(square => square?.type === 'pawn' && square.color !== friendlyColor);

		const enemyKnights = simulatedBoard
			.flat()
			.filter(square => square?.type === 'knight' && square.color !== friendlyColor);

		const pawnCheck = enemyPawns.some(
			p =>
				p!.row - friendlyKing.row === pawnDirection &&
				Math.abs(p!.col - friendlyKing.col) === 1
		);

		if (pawnCheck) return true;

		const knightCheck = enemyKnights.some(
			n =>
				(Math.abs(n!.row - friendlyKing.row) === 2 && Math.abs(n!.col - friendlyKing.col) === 1) ||
				(Math.abs(n!.row - friendlyKing.row) === 1 && Math.abs(n!.col - friendlyKing.col) === 2)
		);

		if (knightCheck) return true;

		const bishopOrQueenCheck = this.isAttackedBySlidingPiece(
			simulatedBoard,
			friendlyKing,
			friendlyColor,
			bishopDirections,
			['bishop', 'queen']
		);

		if (bishopOrQueenCheck) return true;

		const rookOrQueenCheck = this.isAttackedBySlidingPiece(
			simulatedBoard,
			friendlyKing,
			friendlyColor,
			rookDirections,
			['rook', 'queen']
		);

		if (rookOrQueenCheck) return true;

		return false;
	}
}