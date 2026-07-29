export function calculateFinanceRisk(

    loanToValue: number

): number {

    if (loanToValue <= 60)
        return 5;

    if (loanToValue <= 80)
        return 15;

    if (loanToValue <= 90)
        return 30;

    return 50;

}
