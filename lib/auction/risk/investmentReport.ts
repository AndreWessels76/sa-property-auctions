export function buildInvestmentReport(

    investmentScore:number

){

    if(investmentScore>=80)

        return "Excellent Investment";

    if(investmentScore>=65)

        return "Good Investment";

    if(investmentScore>=50)

        return "Average Investment";

    return "High Risk Investment";

}