import type { ForegroundColorName } from "chalk";

type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
type AlgebraicNotationPrefix = ''| 'R' | 'N' | 'B' | 'Q' | 'K';

export const PieceTypeToIcon: Record<PieceType, string> = {
  pawn: '♙',
  rook: '♜',
  knight: '♞',
  bishop: '♝',
  queen: '♛',
  king: '♚',
};

const notationMap: Record<PieceType, AlgebraicNotationPrefix> = {
	pawn: '',
	rook: 'R',
	knight: 'N',
	bishop: 'B',
	queen: 'Q',
	king: 'K'
};

const pointsMap: Record<PieceType, number> = {
	pawn: 1,
	rook: 5,
	knight: 3,
	bishop: 3,
	queen: 9,
	king: 0
};


export class Piece {
	type: PieceType;
	color: 'white' | 'black';
	icon: string;
	iconColor: ForegroundColorName;
	notation: AlgebraicNotationPrefix;
	points: number;
	row: number;
	col: number;
	isFirstMove: boolean = true;

	constructor(type: PieceType, icon: string, color: 'white' | 'black', row: number, col: number, iconColor: ForegroundColorName ) {
		this.type = type;
		this.icon = icon;
		this.iconColor = iconColor;
		this.notation = notationMap[type];
		this.points = pointsMap[type];
		this.color = color;
		this.row = row;
		this.col = col; 
	}
}
