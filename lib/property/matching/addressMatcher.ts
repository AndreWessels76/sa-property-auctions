function normalize(value: string | null): string {

    return (value ?? "")
        .toLowerCase()
        .replace(/\./g, "")
        .replace(/\bst\b/g, "street")
        .replace(/\s+/g, " ")
        .trim();

}

export function addressMatch(

    a: string | null,

    b: string | null

): boolean {

    return normalize(a) === normalize(b);

}