export function scoreAddress(

    a: string,

    b: string

): number {

    const left = a.trim().toLowerCase();

    const right = b.trim().toLowerCase();

    if (!left || !right) {

        return 0;

    }

    if (left === right) {

        return 100;

    }

    if (left.includes(right) || right.includes(left)) {

        return 80;

    }

    return 0;

}