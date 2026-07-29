export function extract(

    pattern: RegExp,

    text: string

): string | null {

    const match = text.match(pattern);

    return match ? match[1].trim() : null;

}