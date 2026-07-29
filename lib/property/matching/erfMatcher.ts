export function erfMatch(

    erfA: string | null,

    erfB: string | null

): boolean {

    if (!erfA || !erfB) {

        return false;

    }

    return erfA.trim() === erfB.trim();

}