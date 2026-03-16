import prompts from "prompts";
import type { Board } from "../board.js";
import { PieceTypeToIcon, type Piece } from "../pieces.js";
import { bishopDirections, kingMoves, knightMoves, queenDirections, rookDirections } from "./moveSets.js";
import createAudioPlayer from "../../audio/player.js";

type Square = [row: number, col: number];
type Target = Square;
type Destination = Square;
type Move = [Target, Destination];

type MoveSet = [x: number, y: number][];

export class MoveEngine {

	private audio = createAudioPlayer();

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

	public moveRecord: string[] = [];

	public async move(board: Board, moveString: string, currentPlayer: 'white' | 'black'): Promise<Board> {

		const enemyPlayer = currentPlayer === 'white' ? 'black' : 'white' 

		const [start, end] = this.translateMove(moveString);
		const pieceToMove = board[start[0]]?.[start[1]] ?? null;
		const destinationSquare = board[end[0]]?.[end[1]] ?? null;

		if (pieceToMove === null) {
			throw new Error("No piece on target square");
		};

		if (pieceToMove.color !== currentPlayer) {
			throw new Error("You can only move your own pieces");
		};

		const possibleMoves = this.getPossibleMoves(board, pieceToMove);

		const legalMoves = this.checkForPin(board, pieceToMove, possibleMoves, currentPlayer)

		const isValid = legalMoves.some(
			([row, col]) =>
				row === end[0] && col === end[1]
		);

		if (!isValid) {
			throw new Error("Illegal move");
		}

		if (destinationSquare !== null && pieceToMove.color !== destinationSquare.color) {
			console.log(
				`${pieceToMove.color} ${pieceToMove.type} strikes ${destinationSquare.color} ${destinationSquare.type} (+${destinationSquare.points})`
			);
		}

		this.applyMove(board, pieceToMove, start, end);
		this.moveRecord.push(moveString);

		await this.checkForPromotion(board, pieceToMove);

		if (this.isCheckmate(board, enemyPlayer)) {
			console.log(`Checkmate! ${currentPlayer} wins!`);
		} else if (this.isStalemate(board, enemyPlayer)) {
			console.log("Stalemate!");
		} else if (this.isKingCheck(board, enemyPlayer)) {
			console.log("King is checked!");
		}

		console.log(this.moveRecord);
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

	private hasAnyLegalMove(board: Board, player: 'white' | 'black'): boolean {
		const pieces = board
			.flat()
			.filter((square): square is Piece => square !== null && square.color === player);

		for (const piece of pieces) {
			const possibleMoves = this.getPossibleMoves(board, piece);
			const legalMoves = this.checkForPin(board, piece, possibleMoves, player);

			if (legalMoves.length > 0) {
				return true;
			}
		}

		return false;
	}

	private applyMove(
		board: Board,
		piece: Piece,
		start: Target,
		end: Destination,
		playSound = true
	): void {
		const targetSquare = board[end[0]]![end[1]];
		const isCastling = piece.type === "king" && Math.abs(end[1] - start[1]) === 2;
		const isEnPassant = this.isEnPassantMove(board, piece, start, end);
		const isCapture = (targetSquare !== null && targetSquare!.color !== piece.color) || isEnPassant;

		if (isEnPassant) {
			board[start[0]]![end[1]] = null;
		}

		// normal move
		board[end[0]]![end[1]] = piece;
		board[start[0]]![start[1]] = null;

		piece.row = end[0];
		piece.col = end[1];
		piece.isFirstMove = false;

		if (playSound) {
			if (isCastling) {
				this.audio.castle();
			} else if (isCapture) {
				this.audio.capture();
			} else {
				this.audio.move();
			}
		}

		// castle
		if (isCastling) {
			if (end[1] === 6) {
				const rook = board[end[0]]![7];

				if (!rook || rook.type !== "rook") {
					throw new Error("Kingside rook not found for castling");
				}

				board[end[0]]![5] = rook;
				board[end[0]]![7] = null;
				rook.row = end[0];
				rook.col = 5;
				rook.isFirstMove = false;
			}

			if (end[1] === 2) {
				const rook = board[end[0]]![0];

				if (!rook || rook.type !== "rook") {
					throw new Error("Queenside rook not found for castling");
				}

				board[end[0]]![3] = rook;
				board[end[0]]![0] = null;
				rook.row = end[0];
				rook.col = 3;
				rook.isFirstMove = false;
			}
		}
	}

	private isCheckmate(board: Board, player: 'white' | 'black'): boolean {
		return this.isKingCheck(board, player) && !this.hasAnyLegalMove(board, player);
	}

	private isStalemate(board: Board, player: 'white' | 'black'): boolean {
		return !this.isKingCheck(board, player) && !this.hasAnyLegalMove(board, player);
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

	private isEnPassantMove(
		board: Board,
		piece: Piece,
		start: Square,
		end: Square
	): boolean {
		if (piece.type !== "pawn") return false;
		if (start[1] === end[1]) return false;
		if (board[end[0]]![end[1]] !== null) return false;

		const lastEnemyMove = this.moveRecord.at(-1);
		if (!lastEnemyMove) return false;

		const [lastStart, lastEnd] = this.translateMove(lastEnemyMove);
		const lastPiece = board[lastEnd[0]]![lastEnd[1]];

		return !!(
			lastPiece?.type === "pawn" &&
			lastPiece.color !== piece.color &&
			Math.abs(lastEnd[0] - lastStart[0]) === 2 &&
			lastEnd[0] === start[0] &&
			lastEnd[1] === end[1]
		);
	}

	private isInsideBoard(row: number, col: number): boolean {
		return row >= 0 && row < 8 && col >= 0 && col < 8;
	}

	private async checkForPromotion(board: Board, piece: Piece) {

		if (piece.type !== 'pawn') return;

		// Pawn erreicht letzte Reihe
		if (piece.row !== 0 && piece.row !== 7) return;

		while (true) {

			const movePrompt = await prompts({
				type: 'text',
				name: 'promotion',
				message: `PROMOTION [q,r,b,n]`
			});

			const promotion = movePrompt.promotion?.toLowerCase() || 'q';

			switch (promotion) {

				case 'q':
					piece.type = 'queen';
					piece.icon = PieceTypeToIcon['queen'];
					return;

				case 'r':
					piece.type = 'rook';
					piece.icon = PieceTypeToIcon['rook'];
					return;

				case 'b':
					piece.type = 'bishop';
					piece.icon = PieceTypeToIcon['bishop'];
					return;

				case 'n':
					piece.type = 'knight';
					piece.icon = PieceTypeToIcon['knight'];
					return;

				default:
					console.log("Invalid promotion. Use q,r,b,n");
			}
		}
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
		const direction = piece.color === "white" ? -1 : 1;

		const oneStepRow = piece.row + direction;
		const twoStepRow = piece.row + 2 * direction;

		// 1 square forward
		if (
			this.isInsideBoard(oneStepRow, piece.col) &&
			board[oneStepRow]![piece.col] === null
		) {
			moves.push([oneStepRow, piece.col]);

			// 2 squares forward
			if (
				piece.isFirstMove &&
				this.isInsideBoard(twoStepRow, piece.col) &&
				board[twoStepRow]![piece.col] === null
			) {
				moves.push([twoStepRow, piece.col]);
			}
		}

		// strike left
		const leftCol = piece.col - 1;
		if (this.isInsideBoard(oneStepRow, leftCol)) {
			const target = board[oneStepRow]![leftCol];

			if (
				(target !== null && target!.color !== piece.color) ||
				this.isEnPassantMove(board, piece, [piece.row, piece.col], [oneStepRow, leftCol])
			) {
				moves.push([oneStepRow, leftCol]);
			}
		}

		// strike right
		const rightCol = piece.col + 1;
		if (this.isInsideBoard(oneStepRow, rightCol)) {
			const target = board[oneStepRow]![rightCol];

			if (
				(target !== null && target!.color !== piece.color) ||
				this.isEnPassantMove(board, piece, [piece.row, piece.col], [oneStepRow, rightCol])
			) {
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

		this.addCastlingMoves(board, piece, moves);

		return moves;
	}

	private addCastlingMoves(board: Board, king: Piece, moves: Square[]): void {
		if (king.type !== "king" || !king.isFirstMove) {
			return;
		}

		// König darf nicht im Schach stehen
		if (this.isKingCheck(board, king.color)) {
			return;
		}

		const row = king.row;
		const start: Square = [king.row, king.col];

		// kurze Rochade
		const kingsideRook = board[row]![7];
		if (
			kingsideRook &&
			kingsideRook.type === "rook" &&
			kingsideRook.color === king.color &&
			kingsideRook.isFirstMove &&
			board[row]![5] === null &&
			board[row]![6] === null
		) {
			const simulatedBoard1 = board.map(row => row.map(square => (square ? { ...square } : null)));
			const kingStep1 = simulatedBoard1[king.row]![king.col];

			if (kingStep1) {
				this.applyMove(simulatedBoard1, kingStep1, start, [row, 5], false);

				if (!this.isKingCheck(simulatedBoard1, king.color)) {
					const simulatedBoard2 = board.map(row => row.map(square => (square ? { ...square } : null)));
					const kingStep2 = simulatedBoard2[king.row]![king.col];

					if (kingStep2) {
						this.applyMove(simulatedBoard2, kingStep2, start, [row, 6], false);

						if (!this.isKingCheck(simulatedBoard2, king.color)) {
							moves.push([row, 6]);
						}
					}
				}
			}
		}

		// lange Rochade
		const queensideRook = board[row]![0];
		if (
			queensideRook &&
			queensideRook.type === "rook" &&
			queensideRook.color === king.color &&
			queensideRook.isFirstMove &&
			board[row]![1] === null &&
			board[row]![2] === null &&
			board[row]![3] === null
		) {
			const simulatedBoard1 = board.map(row => row.map(square => (square ? { ...square } : null)));
			const kingStep1 = simulatedBoard1[king.row]![king.col];

			if (kingStep1) {
				this.applyMove(simulatedBoard1, kingStep1, start, [row, 3], false);

				if (!this.isKingCheck(simulatedBoard1, king.color)) {
					const simulatedBoard2 = board.map(row => row.map(square => (square ? { ...square } : null)));
					const kingStep2 = simulatedBoard2[king.row]![king.col];

					if (kingStep2) {
						this.applyMove(simulatedBoard2, kingStep2, start, [row, 2], false);

						if (!this.isKingCheck(simulatedBoard2, king.color)) {
							moves.push([row, 2]);
						}
					}
				}
			}
		}
	}

	private checkForPin(board: Board, piece: Piece, possibleMoves: Square[], currentPlayer: 'white' | 'black'): Square[] {

		const legalMoves: Square[] = [];

		for (const move of possibleMoves) {

			const simulatedBoard = board.map(row => row.map(square => square ? { ...square } : null));
			const simulatedPiece = simulatedBoard[piece.row]![piece.col]!;
			this.applyMove(simulatedBoard, simulatedPiece, [piece.row, piece.col], move, false);

			if(!this.isKingCheck(simulatedBoard, currentPlayer)) {
				legalMoves.push(move);
			}
		}

		return legalMoves;
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

		const enemyKing = simulatedBoard
			.flat()
			.find(square => square?.type === 'king' && square.color !== friendlyColor);

		if ( enemyKing && Math.abs(enemyKing.row - friendlyKing.row) <= 1 && Math.abs(enemyKing.col - friendlyKing.col) <= 1 ) {
			return true;
		}	

		const enemyPawns = simulatedBoard
			.flat()
			.filter(square => square?.type === 'pawn' && square.color !== friendlyColor);

		const enemyKnights = simulatedBoard
			.flat()
			.filter(square => square?.type === 'knight' && square.color !== friendlyColor);

		const pawnCheck = enemyPawns.some(
			p => p!.row - friendlyKing.row === pawnDirection && Math.abs(p!.col - friendlyKing.col) === 1
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