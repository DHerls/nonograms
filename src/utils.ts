import { FILLED, BLOCKED, EMPTY, Puzzle } from "./store/types";


export const createEmptyBoard = (rows: number, columns: number): string[][] => {
    const board: string[][] = [];
    let row: string[] = [];
    for (let i = 0; i < rows; i++) {
        row = Array(columns);
        row.fill(EMPTY);
        board.push(row);
    }
    return board;
}


export const boardToChunks = (segment: string[]): number[] => {
    let length = 0;
    const chunks = [];
    for (let i = 0; i < segment.length; i++) {
        if (segment[i] == FILLED) {
            length++;
        } else if (length > 0) {
            chunks.push(length);
            length = 0;
        }
    }
    if (length > 0) {
        chunks.push(length);
    }
    if (chunks.length === 0){
        return [0]
    }
    return chunks;
}

export const getSingleLineSoveState = (hints: number[], ranges: number[][], line: string[]): boolean[] => {
    const chunks = boardToChunks(line);
    if (arraysEqual(hints, chunks)) {
        return hints.map(() => true);
    }

    return hints.map((hint, index) => blockHasExclusivePlacement(hints, ranges, index, line))

    return hints.map(() => false);
}

export const arraysEqual = (arr1: any[], arr2: any[]) : boolean => {
    if (arr1.length !== arr2.length){
        return false
    }
    for (let i = 0; i < arr1.length; i++){
        if (arr1[i] !== arr2[i]){
            return false;
        }
    }
    return true;
}

/**
 * For each hint, return a range of valid start values
 * 
 * @param hints Array of hints for a row or column
 * @param maxLength The length of the row or column
 */
export const findSolutionRanges = (hints: number[], maxLength: number): number[][] => {
    let lastSquare = 0;
    const solutionRanges: number[][] = []
    for (let i = 0; i < hints.length; i++) {
        solutionRanges.push([lastSquare]);
        lastSquare = lastSquare + hints[i] + 1;
    }
    const diff = maxLength - lastSquare + 1;
    for (let i = 0; i < hints.length; i++) {
        solutionRanges[i].push(solutionRanges[i][0] + diff);
    }
    return solutionRanges;
}

/**
 * 
 * Return whether a chunk of length l starts at index i in line
 * 
 * @param start Potential starting location of chunk
 * @param length Length of the chunk
 * @param line Partially filled line from game board
 */
export const chunkStartsAt = (start: number, length: number, line: string[]) : boolean => {
    
    if (start > 0 && line[start-1] == FILLED){
        return false;
    }
    
    if (start + length > line.length) {
        return false;
    }

    if (start + length < line.length && line[start + length] == FILLED){
        return false;
    }

    for (let i = start; i < start + length; i++){
        if (line[i] != FILLED) {
            return false;
        }
    }

    return true;

}


/**
 * Return whether a list of hints can be satisfied in a given line between two indices
 * 
 * @param hints List of hints that must be placed
 * @param start Starting index (inclusive)
 * @param end Ending index (inclusive)
 * @param line Partially filled game line
 */
export const hintsCanBeSatisfied = (hints: number[], start: number, end: number, line: string[], reverse: boolean = false) : boolean => {
    // console.log(hints, start, end, reverse);
    let rangeStart : number = reverse ? line.length - end : start;
    let rangeEnd : number = reverse ? line.length - end : start;
    let workingHints = reverse ? [...hints].reverse() : [...hints];
    const stop = reverse ? line.length - start: end;
    const workingLine = reverse ? [...line].reverse() : [...line]
    // console.log(reverse, workingLine);
    let numFilled = 0;
    let maxFilled = 0;

    while (rangeEnd < workingLine.length && rangeEnd <= stop) {
        // console.log(`rstart: ${rangeStart} rend: ${rangeEnd} nfilled: ${numFilled} mfilled: ${maxFilled} whints: ${workingHints}`)
        if (workingLine[rangeEnd] === FILLED){
            numFilled += 1;
        }
        if (workingLine[rangeStart] === BLOCKED) {
            rangeEnd = rangeStart = rangeStart + 1;
        } else if (workingLine[rangeEnd] === BLOCKED) {
            rangeStart = rangeEnd = rangeEnd + 1;
        } else if (rangeEnd - rangeStart + 1 === workingHints[0]){
            if ((rangeStart === 0 || workingLine[rangeStart - 1] !== FILLED) && (rangeEnd == workingLine.length || workingLine[rangeEnd + 1] !== FILLED)) {
                // console.log(line.filter((value, index) => index >= rangeEnd && index <= rangeEnd))
                if (numFilled + workingLine.filter((value, index) => index >= rangeStart && index <= rangeEnd && value === EMPTY).length > maxFilled + workingHints[0]){
                    return false;
                }
                rangeStart = rangeEnd = rangeEnd + 2;
                maxFilled += workingHints.shift();
            } else if (rangeEnd === workingLine.length) {
                break;
            } else if (workingLine[rangeEnd + 1] == BLOCKED){
                rangeStart = rangeEnd = rangeEnd + 1;
            } else {
                rangeStart += 1;
                rangeEnd += 1;
            }
        } else {
            rangeEnd += 1;
        }
    }

    return numFilled <= hints.reduce((a, b) => a + b, 0) && workingHints.length === 0;
}


/**
 * 
 * Return a list of chunks of a given length within the line that start within the given range
 * 
 * @param start First location to search for chunks (inclusive)
 * @param end Last location to search for chunks (inclusive)
 * @param length Length of chunks to search for
 * @param line Partially filled line from game board
 */
export const getPotentialPlacements = (start: number, end: number, length: number, line: string[]) : number[] => {
    const placements = [];
    for (let i = start; i <= end; i++){
        if (chunkStartsAt(i, length, line)){
            placements.push(i);
            i += length;
        }
    }
    return placements;
}


export const isValidPlacementForBlock = (start: number, hints: number[], hintIndex: number, line: string[]) : boolean => {
    if (start +  hints[hintIndex] > line.length){
        return false;
    }

    for (let i = start; i < start + hints[hintIndex]; i++) {
        if (line[i] === BLOCKED){
            return false;
        }
    }

    if (line[start + hints[hintIndex]] === FILLED) {
        return false;
    }


    // Functions so they aren't evaluated unless needed
    const canPlaceBefore = () => hintsCanBeSatisfied(hints.slice(0, hintIndex), 0, start - 1, line, true);
    const canPlaceAfter = () => hintsCanBeSatisfied(hints.slice(hintIndex + 1, hints.length), start + hints[hintIndex] + 1, line.length - 1, line);
    const firstHintSpecial = () => hintIndex !== 0 || (line.slice(0, start).filter((v) => (v === FILLED)).length === 0);
    const lastHintSpecial = () => hintIndex !== hints.length - 1 || (line.slice(start + hints[hintIndex]).filter((v) => (v === FILLED)).length === 0);
    return canPlaceBefore() && canPlaceAfter() && firstHintSpecial() && lastHintSpecial();
}


export const blockHasExclusivePlacement = (hints: number[], ranges: number[][], hintIndex: number, line: string[]) : boolean => {
    const placements = getPotentialPlacements(ranges[hintIndex][0], ranges[hintIndex][1], hints[hintIndex], line);
    // console.log(placements)
    const validPlacements = placements.filter((p)=>(isValidPlacementForBlock(p, hints, hintIndex, line)))
    // console.log(validPlacements);
    if (validPlacements.length !== 1) {
        return false;
    }

    // TODO must replace with whether can be anything else
    const start = validPlacements[0]
    const alternatives = []
    for (let i = 0; i < ranges.length; i++){
        if (i !== hintIndex && hints[i] >= hints[hintIndex]){
            let diff = hints[i] - hints[hintIndex];
            if (ranges[i][0] <= start + diff && ranges[i][1] >= start - diff){
                alternatives.push(i);
            }
        }
    }
    // console.log(hints, hintIndex, start)
    // console.log(alternatives);

    if (alternatives.length === 0) {
        return true;
    }

    for (let i = 0; i < alternatives.length; i++){
        let diff = hints[alternatives[i]] - hints[hintIndex];
        for (let altStart = start - diff; altStart <= start; altStart++){
            if ((altStart === 0 || line[altStart - 1] !== FILLED) && line[altStart] !== BLOCKED && isValidPlacementForBlock(altStart, hints, alternatives[i], line)) {
                // console.log(alternatives[i], altStart);
                return false;
            }
        }
        
    }
    return true;
}


const transpose = (array: any[][]): any[][] => {
    const trans = [];
    for (let i = 0; i < array[0].length; i++){
        trans.push(array.map((row) => row[i]));
    }
    return trans;
}


const ENCODE_ORDER = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];


export const encodeBoardToKey = (board: string[][]): string => {
    const rowString = board.map((row) => boardToChunks(row).map((len) => ENCODE_ORDER[len]).join('')).join(':');
    // console.log(transpose(board));
    const colString = transpose(board)
      .map((col) =>
        boardToChunks(col)
          .map((len) => ENCODE_ORDER[len])
          .join("")
      )
      .join(":");
    return `${rowString};${colString}`;
}


export const decodeKeyToPuzzle = (gameKey: string) : Puzzle => {
    // Returned if key is invalid
    const invalidPuzzle : Puzzle = {
        rows: [],
        columns: [],
        rowRanges: [],
        colRanges: []
    }
    const halves: string[] = gameKey.split(';');
    if (halves.length !== 2){
        return invalidPuzzle;
    }
    const rowKeys = halves[0].split(':');
    const colKeys = halves[1].split(':');
    if (rowKeys.length > 30 || colKeys.length > 30){
        return invalidPuzzle;
    }

    const rows = rowKeys.map((key) => key.split('').map((char) => ENCODE_ORDER.indexOf(char.toUpperCase())));
    const cols = colKeys.map((key) => key.split('').map((char) => ENCODE_ORDER.indexOf(char.toUpperCase())));

    if (rows.filter((row) => row.indexOf(-1) > -1).length > 0 || cols.filter((col) => col.indexOf(-1) > -1).length > 0) {
        return invalidPuzzle;
    }

    if (rows.filter((row) => row.reduce((a, b) => a + b, 0) + row.length - 1 > cols.length).length > 0 ) {
        return invalidPuzzle;
    }

    if (cols.filter((col) => col.reduce((a, b) => a + b, 0) + col.length - 1 > rows.length).length > 0 ) {
        return invalidPuzzle;
    }

    return {
        rows: rows,
        columns: cols,
        rowRanges: rows.map((hints) => findSolutionRanges(hints, cols.length)),
        colRanges: cols.map((hints) => findSolutionRanges(hints, rows.length)),
    };

}
